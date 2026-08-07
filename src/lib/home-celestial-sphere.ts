export interface CelestialSphereController {
  setRunning(running: boolean): void;
  destroy(): void;
}

export interface CelestialSphereOptions {
  textureUrl: string;
  durationMs: number;
  initialRotation?: number;
  ambientLight?: number;
  diffuseLight?: number;
  maxDevicePixelRatio?: number;
}

const vertexShaderSource = `
attribute vec2 aPosition;
varying vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const fragmentShaderSource = `
precision highp float;

uniform sampler2D uTexture;
uniform float uRotation;
uniform float uAmbientLight;
uniform float uDiffuseLight;
varying vec2 vUv;

const float PI = 3.141592653589793;

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r2 = dot(p, p);
  if (r2 > 1.0) discard;

  float z = sqrt(max(0.0, 1.0 - r2));
  vec3 normal = normalize(vec3(p.x, p.y, z));
  vec3 lightDirection = normalize(vec3(-0.62, 0.58, 0.72));
  float longitude = atan(p.x, z) + uRotation;
  float latitude = asin(clamp(p.y, -1.0, 1.0));
  vec2 uv = vec2(
    longitude / (2.0 * PI) + 0.5,
    latitude / PI + 0.5
  );
  vec4 color = texture2D(uTexture, uv);
  float diffuse = max(dot(normal, lightDirection), 0.0);
  float fixedLighting = uAmbientLight + uDiffuseLight * pow(diffuse, 0.72);
  float edgeAlpha = 1.0 - smoothstep(0.965, 0.998, sqrt(r2));
  gl_FragColor = vec4(color.rgb * fixedLighting, color.a * edgeAlpha);
}
`;

const compileShader = (
  gl: WebGLRenderingContext,
  type: number,
  source: string,
) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
};

const createProgram = (gl: WebGLRenderingContext) => {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  if (!vertexShader || !fragmentShader) {
    if (vertexShader) gl.deleteShader(vertexShader);
    if (fragmentShader) gl.deleteShader(fragmentShader);
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return null;
  }
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  gl.deleteProgram(program);
  return null;
};

const loadImage = async (url: string) => {
  const image = new Image();
  image.decoding = "async";
  image.fetchPriority = "high";
  image.src = url;
  await image.decode();
  return image;
};

export const createCelestialSphereController = (
  canvas: HTMLCanvasElement,
  options: CelestialSphereOptions,
): CelestialSphereController | null => {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
  });
  if (!gl || options.durationMs <= 0) return null;

  const sphere = canvas.parentElement;
  const program = createProgram(gl);
  if (!program) return null;

  const positionLocation = gl.getAttribLocation(program, "aPosition");
  const textureUniform = gl.getUniformLocation(program, "uTexture");
  const rotationUniform = gl.getUniformLocation(program, "uRotation");
  const ambientLightUniform = gl.getUniformLocation(program, "uAmbientLight");
  const diffuseLightUniform = gl.getUniformLocation(program, "uDiffuseLight");
  const positionBuffer = gl.createBuffer();
  const texture = gl.createTexture();
  if (
    positionLocation < 0 ||
    textureUniform === null ||
    rotationUniform === null ||
    ambientLightUniform === null ||
    diffuseLightUniform === null ||
    !positionBuffer ||
    !texture
  ) {
    if (positionBuffer) gl.deleteBuffer(positionBuffer);
    if (texture) gl.deleteTexture(texture);
    gl.deleteProgram(program);
    return null;
  }

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.uniform1i(textureUniform, 0);
  gl.uniform1f(ambientLightUniform, options.ambientLight ?? 0.74);
  gl.uniform1f(diffuseLightUniform, options.diffuseLight ?? 0.42);
  gl.clearColor(0, 0, 0, 0);

  let textureReady = false;
  let loading: Promise<void> | null = null;
  let desiredRunning = false;
  let destroyed = false;
  let contextLost = false;
  let animationFrame = 0;
  let elapsedMs = 0;
  let previousTime: number | null = null;
  const initialRotation = options.initialRotation ?? 0;

  const removeReadyState = () => {
    sphere?.classList.remove("is-motion-ready");
  };

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    const devicePixelRatio = Math.min(
      window.devicePixelRatio || 1,
      options.maxDevicePixelRatio ?? 2,
    );
    const width = Math.max(2, Math.round(bounds.width * devicePixelRatio));
    const height = Math.max(2, Math.round(bounds.height * devicePixelRatio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  const render = () => {
    if (!textureReady || destroyed || contextLost) return;
    resize();
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniform1f(
      rotationUniform,
      initialRotation + elapsedMs / options.durationMs * Math.PI * 2,
    );
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const stop = () => {
    if (animationFrame !== 0) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
    previousTime = null;
  };

  const tick = (now: number) => {
    animationFrame = 0;
    if (!desiredRunning || destroyed || contextLost || !textureReady) {
      previousTime = null;
      return;
    }
    if (previousTime === null) {
      previousTime = now;
    } else {
      elapsedMs =
        (elapsedMs + Math.min(now - previousTime, 100)) % options.durationMs;
      previousTime = now;
    }
    render();
    animationFrame = window.requestAnimationFrame(tick);
  };

  const start = () => {
    if (
      animationFrame !== 0 ||
      !desiredRunning ||
      destroyed ||
      contextLost ||
      !textureReady
    ) {
      return;
    }
    previousTime = null;
    animationFrame = window.requestAnimationFrame(tick);
  };

  const load = () => {
    if (loading || destroyed || contextLost) return loading;
    loading = (async () => {
      const image = await loadImage(options.textureUrl);
      if (destroyed || contextLost) return;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
      textureReady = true;
      render();
      sphere?.classList.add("is-motion-ready");
      start();
    })().catch(() => {
      textureReady = false;
      removeReadyState();
    });
    return loading;
  };

  const handleContextLost = (event: Event) => {
    event.preventDefault();
    contextLost = true;
    textureReady = false;
    stop();
    removeReadyState();
  };

  const resizeObserver = new ResizeObserver(() => {
    if (textureReady) render();
  });
  resizeObserver.observe(canvas);
  canvas.addEventListener("webglcontextlost", handleContextLost);

  return {
    setRunning(running) {
      desiredRunning = running;
      if (!running) {
        stop();
        return;
      }
      void load();
      start();
    },
    destroy() {
      destroyed = true;
      desiredRunning = false;
      stop();
      resizeObserver.disconnect();
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      removeReadyState();
      gl.deleteTexture(texture);
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
      canvas.width = canvas.width;
    },
  };
};
