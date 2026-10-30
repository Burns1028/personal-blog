/** Decode one native-resolution atlas and draw its three subjects independently. */
export function createCelestialVideoController(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  targets: { element: HTMLElement; region: readonly number[] }[],
  onReady: (ready: boolean) => void,
) {
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false });
  if (!gl) return null;
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); return null; }
    return shader;
  };
  const vertex = compile(gl.VERTEX_SHADER, `
    attribute vec2 position;
    varying vec2 uv;
    void main() { uv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }
  `);
  const fragment = compile(gl.FRAGMENT_SHADER, `
    precision highp float;
    uniform sampler2D frame;
    uniform vec2 atlasSize;
    uniform vec4 sourceRect;
    varying vec2 uv;
    void main() {
      vec2 pixel = sourceRect.xy + clamp(vec2(uv.x, 1.0 - uv.y) * sourceRect.zw, vec2(0.5), sourceRect.zw - vec2(0.5));
      vec2 source = pixel / atlasSize;
      vec3 color = texture2D(frame, vec2(source.x, 1.0 - source.y * 0.5)).rgb;
      float alpha = smoothstep(0.02, 0.98, texture2D(frame, vec2(source.x, 0.5 - source.y * 0.5)).r);
      gl_FragColor = vec4(color * alpha, alpha);
    }
  `);
  if (!vertex || !fragment) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    return null;
  }
  const program = gl.createProgram()!;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteProgram(program); return null; }
  const buffer = gl.createBuffer()!;
  const texture = gl.createTexture()!;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.uniform1i(gl.getUniformLocation(program, "frame"), 0);
  const sourceRect = gl.getUniformLocation(program, "sourceRect");
  const atlasSize = gl.getUniformLocation(program, "atlasSize");
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const subjects = targets.map(({ element, region }) => ({ element, region: new Float32Array(region), viewport: [0, 0, 0, 0] }));
  let running = false;
  let destroyed = false;
  let failed = false;
  let callback = 0;
  let lastTime = -1;
  let dirty = true;
  const nativeFrames = "requestVideoFrameCallback" in video;

  const cancelFrame = () => {
    if (callback) {
      if (nativeFrames) video.cancelVideoFrameCallback(callback);
      else cancelAnimationFrame(callback);
    }
    callback = 0;
  };
  const fail = () => {
    failed = true;
    running = false;
    cancelFrame();
    video.pause();
    onReady(false);
  };
  const render = () => {
    if (video.readyState < 2 || failed || destroyed) return;
    try {
      if (dirty) {
        const ratio = Math.min(devicePixelRatio || 1, 2);
        canvas.width = Math.max(2, Math.round(canvas.clientWidth * ratio));
        canvas.height = Math.max(2, Math.round(canvas.clientHeight * ratio));
        const bounds = canvas.getBoundingClientRect();
        for (const subject of subjects) {
          const rect = subject.element.getBoundingClientRect();
          subject.viewport = [Math.round((rect.left - bounds.left) * ratio), Math.round((bounds.bottom - rect.bottom) * ratio), Math.round(rect.width * ratio), Math.round(rect.height * ratio)];
        }
        dirty = false;
      }
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      gl.uniform2f(atlasSize, video.videoWidth, video.videoHeight / 2);
      gl.clear(gl.COLOR_BUFFER_BIT);
      for (const subject of subjects) {
        gl.viewport(subject.viewport[0], subject.viewport[1], subject.viewport[2], subject.viewport[3]);
        gl.uniform4fv(sourceRect, subject.region);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      onReady(true);
    } catch { fail(); }
  };
  const schedule = () => {
    if (!running || failed || destroyed || callback) return;
    callback = nativeFrames ? video.requestVideoFrameCallback(tick) : requestAnimationFrame(tick);
  };
  const tick = () => {
    callback = 0;
    if (!running || destroyed || failed) return;
    if (lastTime !== video.currentTime || dirty) {
      lastTime = video.currentTime;
      render();
    }
    schedule();
  };
  const onResize = new ResizeObserver(() => { dirty = true; render(); });
  onResize.observe(canvas);
  video.addEventListener("error", fail);
  canvas.addEventListener("webglcontextlost", fail);
  return {
    setRunning(next: boolean) {
      if (failed || destroyed || running === next) return;
      running = next;
      if (!next) { video.pause(); cancelFrame(); return; }
      video.muted = true;
      if (!video.src) video.src = video.dataset.src!;
      void video.play().then(() => {
        if (!running || destroyed) { video.pause(); return; }
        render();
        schedule();
      }).catch((error) => {
        if ((error as DOMException).name !== "AbortError") fail();
      });
    },
    destroy() {
      destroyed = true;
      cancelFrame();
      video.pause();
      video.removeAttribute("src");
      video.load();
      onResize.disconnect();
      video.removeEventListener("error", fail);
      canvas.removeEventListener("webglcontextlost", fail);
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
