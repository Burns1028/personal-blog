import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from "three";

import {
  type OrreryHubGeometry,
  type OrreryStream,
} from "./home-orrery-geometry.ts";
import {
  createOrreryNebulaParticles,
  nebulaSpread,
  type OrreryNebulaParticle,
  type OrreryNebulaSource,
} from "./home-orrery-nebula.ts";
import type {
  OrreryArtifact,
  OrreryRenderSnapshot,
  OrreryStreamController,
} from "./home-orrery-streams-2d.ts";

export type OrreryQuality = {
  particleCount: number;
  fps: number;
  dpr: number;
};

export type OrreryEnvironment = {
  dpr: number;
  saveData: boolean;
  hardwareConcurrency: number;
};

export type OrreryParticleInstance = {
  stream: OrreryStream;
  phase: number;
  speed: number;
  normalOffsetRatio: number;
  size: number;
  rotation: number;
  alpha: number;
  atlasCell: number;
};

type RendererLike = {
  setPixelRatio: (dpr: number) => void;
  setSize: (width: number, height: number, updateStyle?: boolean) => void;
  setClearColor: (color: number, alpha?: number) => void;
  render: (scene: Scene, camera: OrthographicCamera) => void;
  dispose: () => void;
  forceContextLoss?: () => void;
};

type ThreeDependencies = {
  rendererFactory: (canvas: HTMLCanvasElement) => RendererLike;
  textureLoader: (url: string) => Promise<Texture>;
  requestFrame: (callback: FrameRequestCallback) => number;
  cancelFrame: (frame: number) => void;
  now: () => number;
  environment: OrreryEnvironment;
  onFailure: () => void;
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export const selectOrreryQuality = (
  width: number,
  environment: OrreryEnvironment,
): OrreryQuality => {
  const constrained =
    width < 360 || environment.saveData || environment.hardwareConcurrency <= 4;
  if (constrained) {
    return {
      particleCount: 420,
      fps: 24,
      dpr: Math.min(1.5, Math.max(1, environment.dpr || 1)),
    };
  }
  if (width <= 767) {
    return {
      particleCount: 900,
      fps: 30,
      dpr: Math.min(1.5, Math.max(1, environment.dpr || 1)),
    };
  }
  return {
    particleCount: 1800,
    fps: 45,
    dpr: Math.min(2, Math.max(1, environment.dpr || 1)),
  };
};

const seededRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

export const atlasCellForParticle = (
  stream: OrreryStream,
  progress: number,
  variant: number,
) => {
  const localVariant = Math.abs(variant) % 4;
  if (progress >= 0.72) return 8 + localVariant;
  if (stream === "earth") return 8 + localVariant;
  if (stream === "moon") return 4 + localVariant;
  return localVariant;
};

export const createParticleInstances = (
  count: number,
  seed = 1028,
): OrreryParticleInstance[] => {
  const random = seededRandom(seed);
  const streams: readonly OrreryStream[] = ["moon", "earth", "black-hole"];
  return Array.from({ length: Math.max(0, Math.floor(count)) }, (_, index) => {
    const stream = streams[index % streams.length];
    const phase = random();
    return {
      stream,
      phase,
      speed: 0.018 + random() * (stream === "earth" ? 0.032 : 0.024),
      normalOffsetRatio:
        (random() - 0.5) * (stream === "black-hole" ? 0.027 : 0.016),
      size: 0.75 + random() ** 2 * (stream === "black-hole" ? 2.7 : 2.1),
      rotation: (random() - 0.5) * Math.PI * 0.42,
      alpha: 0.24 + random() * 0.62,
      atlasCell: atlasCellForParticle(stream, phase, index),
    };
  });
};

const streamIndex = (stream: OrreryStream) =>
  stream === "moon" ? 0 : stream === "earth" ? 1 : 2;

const streamPalette = (stream: OrreryNebulaSource) => {
  if (stream === "hub") {
    return { start: new Color(0xe0963d), end: new Color(0x94d9fa) };
  }
  if (stream === "moon") {
    return { start: new Color(0xf0c77e), end: new Color(0xa3ddfa) };
  }
  if (stream === "earth") {
    return { start: new Color(0x5ab9f2), end: new Color(0xdaf5ff) };
  }
  return { start: new Color(0xea8e32), end: new Color(0x8ed0f2) };
};

const setInstancedAttribute = (
  geometry: InstancedBufferGeometry,
  name: string,
  values: number[],
  itemSize: number,
) => {
  geometry.setAttribute(name, new InstancedBufferAttribute(new Float32Array(values), itemSize));
};

const createParticleGeometry = (
  geometry: OrreryHubGeometry,
  instances: OrreryNebulaParticle[],
  stage: { width: number; height: number },
) => {
  const result = new InstancedBufferGeometry();
  result.setAttribute(
    "position",
    new Float32BufferAttribute(
      [-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0],
      3,
    ),
  );
  result.setAttribute("uv", new Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  result.setIndex([0, 1, 2, 0, 2, 3]);

  const starts: number[] = [];
  const controlAs: number[] = [];
  const controlBs: number[] = [];
  const ends: number[] = [];
  const motions: number[] = [];
  const styles: number[] = [];
  const startColors: number[] = [];
  const endColors: number[] = [];
  const stageShortEdge = Math.min(stage.width, stage.height);

  for (const particle of instances) {
    const sourceIndex = particle.stream === "hub" ? 3 : streamIndex(particle.stream);
    const path = particle.stream === "hub" ? null : geometry.paths[particle.stream];
    const start = path?.start ?? geometry.hub;
    const controlA = path?.controlA ?? geometry.hub;
    const controlB = path?.controlB ?? geometry.hub;
    const end = path?.end ?? geometry.hub;
    const spread = particle.stream === "hub"
      ? stageShortEdge * (0.008 + particle.clusterSeed * 0.026)
      : nebulaSpread(particle.stream, particle.layer, particle.phase, stageShortEdge) * particle.lateralSeed;
    const signedSpread = spread;
    const palette = streamPalette(particle.stream);
    starts.push(start.x, start.y);
    controlAs.push(controlA.x, controlA.y);
    controlBs.push(controlB.x, controlB.y);
    ends.push(end.x, end.y);
    motions.push(particle.phase, particle.speed, signedSpread, particle.size);
    styles.push(particle.rotation, particle.alpha, sourceIndex, particle.atlasCell);
    startColors.push(palette.start.r, palette.start.g, palette.start.b);
    endColors.push(palette.end.r, palette.end.g, palette.end.b);
  }

  setInstancedAttribute(result, "iStart", starts, 2);
  setInstancedAttribute(result, "iControlA", controlAs, 2);
  setInstancedAttribute(result, "iControlB", controlBs, 2);
  setInstancedAttribute(result, "iEnd", ends, 2);
  setInstancedAttribute(result, "iMotion", motions, 4);
  setInstancedAttribute(result, "iStyle", styles, 4);
  setInstancedAttribute(result, "iStartColor", startColors, 3);
  setInstancedAttribute(result, "iEndColor", endColors, 3);
  result.instanceCount = instances.length;
  return result;
};

const particleVertexShader = `
  uniform float uTime;
  attribute vec2 iStart;
  attribute vec2 iControlA;
  attribute vec2 iControlB;
  attribute vec2 iEnd;
  attribute vec4 iMotion;
  attribute vec4 iStyle;
  attribute vec3 iStartColor;
  attribute vec3 iEndColor;
  varying vec2 vAtlasUv;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vStream;

  vec2 cubic(float t) {
    float inverse = 1.0 - t;
    return inverse * inverse * inverse * iStart
      + 3.0 * inverse * inverse * t * iControlA
      + 3.0 * inverse * t * t * iControlB
      + t * t * t * iEnd;
  }

  vec2 cubicTangent(float t) {
    float inverse = 1.0 - t;
    return 3.0 * inverse * inverse * (iControlA - iStart)
      + 6.0 * inverse * t * (iControlB - iControlA)
      + 3.0 * t * t * (iEnd - iControlB);
  }

  void main() {
    float progress = fract(iMotion.x + uTime * iMotion.y);
    vec2 center = cubic(progress);
    vec2 tangent = normalize(cubicTangent(progress) + vec2(0.0001));
    vec2 normal = vec2(-tangent.y, tangent.x);
    if (iStyle.z > 2.5) {
      float angle = iMotion.x * 6.2831853 + uTime * iMotion.y;
      center = iStart + vec2(cos(angle), sin(angle) * 0.58) * abs(iMotion.z);
    } else {
      center += normal * iMotion.z;
    }
    float cosine = cos(iStyle.x);
    float sine = sin(iStyle.x);
    vec2 local = vec2(
      position.x * cosine - position.y * sine,
      position.x * sine + position.y * cosine
    );
    vec2 oriented = tangent * local.x * iMotion.w * 2.2 + normal * local.y * iMotion.w;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(center + oriented, 0.0, 1.0);
    vec2 atlasCell = vec2(mod(iStyle.w, 4.0), floor(iStyle.w / 4.0));
    vAtlasUv = (uv + atlasCell) * 0.25;
    vColor = mix(iStartColor, iEndColor, smoothstep(0.45, 0.9, progress));
    float edgeFade = min(1.0, min(progress / 0.08, (1.0 - progress) / 0.06));
    vAlpha = iStyle.z > 2.5 ? iStyle.y : iStyle.y * max(0.0, edgeFade);
    vStream = iStyle.z;
  }
`;

const particleFragmentShader = `
  uniform sampler2D uAtlas;
  uniform float uActiveStream;
  varying vec2 vAtlasUv;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vStream;

  void main() {
    vec4 sprite = texture2D(uAtlas, vAtlasUv);
    float emphasis = uActiveStream < -0.5 || abs(uActiveStream - vStream) < 0.25 ? 1.0 : 0.66;
    gl_FragColor = vec4(sprite.rgb * vColor, sprite.a * vAlpha * emphasis);
  }
`;

const hubVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const hubFragmentShader = `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec2 point = vUv - vec2(0.47, 0.53);
    float ellipse = length(vec2(point.x * 0.78, point.y * 1.18)) * 2.0;
    float breath = 0.97 + sin(uTime * 0.73) * 0.03;
    float haze = smoothstep(1.0, 0.08, ellipse / breath);
    float core = smoothstep(0.31, 0.0, length(point * vec2(1.05, 1.32)) * 2.0);
    vec3 cool = vec3(0.24, 0.62, 0.91);
    vec3 warm = vec3(0.88, 0.58, 0.24);
    vec3 color = mix(warm, cool, smoothstep(-0.18, 0.24, point.x + point.y));
    color = mix(color, vec3(0.92, 0.98, 1.0), core * 0.72);
    gl_FragColor = vec4(color, haze * 0.17 + core * 0.46);
  }
`;

const defaultEnvironment = (): OrreryEnvironment => {
  const browserNavigator = globalThis.navigator as Navigator & {
    connection?: { saveData?: boolean };
  };
  return {
    dpr: globalThis.devicePixelRatio || 1,
    saveData: browserNavigator?.connection?.saveData === true,
    hardwareConcurrency: browserNavigator?.hardwareConcurrency || 8,
  };
};

const defaultTextureLoader = (url: string) =>
  new Promise<Texture>((resolve, reject) => {
    new TextureLoader().load(url, resolve, undefined, reject);
  });

const createDependencies = (
  overrides: Partial<ThreeDependencies>,
): ThreeDependencies => ({
  rendererFactory:
    overrides.rendererFactory ??
    ((canvas) =>
      new WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        premultipliedAlpha: false,
        powerPreference: "low-power",
      })),
  textureLoader: overrides.textureLoader ?? defaultTextureLoader,
  requestFrame:
    overrides.requestFrame ??
    ((callback) => globalThis.requestAnimationFrame(callback)),
  cancelFrame:
    overrides.cancelFrame ??
    ((frame) => globalThis.cancelAnimationFrame(frame)),
  now: overrides.now ?? (() => performance.now()),
  environment: overrides.environment ?? defaultEnvironment(),
  onFailure: overrides.onFailure ?? (() => undefined),
});

export const createOrreryThreeStreamController = (
  canvas: HTMLCanvasElement,
  atlasUrl: string,
  dependencyOverrides: Partial<ThreeDependencies> = {},
): OrreryStreamController => {
  const dependencies = createDependencies(dependencyOverrides);
  const scene = new Scene();
  const camera = new OrthographicCamera(0, 1, 0, 1, -10, 10);
  camera.position.copy(new Vector3(0, 0, 1));
  let renderer: RendererLike | null = null;
  let texture: Texture | null = null;
  let particleGeometry: InstancedBufferGeometry | null = null;
  let particleMaterial: ShaderMaterial | null = null;
  let hubGeometry: PlaneGeometry | null = null;
  let hubMaterial: ShaderMaterial | null = null;
  let snapshot: OrreryRenderSnapshot = { geometry: null, width: 1, height: 1, dpr: 1 };
  let quality = selectOrreryQuality(1, dependencies.environment);
  let artifact: OrreryArtifact = "none";
  let running = false;
  let prepared = false;
  let destroyed = false;
  let failed = false;
  let frame = 0;
  let lastFrame = 0;

  const activeIndex = () =>
    artifact === "document" ? 0 : artifact === "repo" ? 1 : artifact === "idea" ? 2 : -1;

  const disposeVisuals = () => {
    particleGeometry?.dispose();
    particleMaterial?.dispose();
    hubGeometry?.dispose();
    hubMaterial?.dispose();
    particleGeometry = null;
    particleMaterial = null;
    hubGeometry = null;
    hubMaterial = null;
    scene.clear();
  };

  const render = (time = dependencies.now()) => {
    if (!prepared || destroyed || failed || !renderer) return;
    if (particleMaterial) {
      particleMaterial.uniforms.uTime.value = time / 1000;
      particleMaterial.uniforms.uActiveStream.value = activeIndex();
    }
    if (hubMaterial) hubMaterial.uniforms.uTime.value = time / 1000;
    renderer.render(scene, camera);
  };

  const rebuildVisuals = () => {
    disposeVisuals();
    if (!prepared || !renderer || !texture || !snapshot.geometry) {
      render();
      return;
    }
    quality = selectOrreryQuality(snapshot.width, dependencies.environment);
    renderer.setPixelRatio(quality.dpr);
    renderer.setSize(snapshot.width, snapshot.height, false);
    camera.left = 0;
    camera.right = snapshot.width;
    camera.top = 0;
    camera.bottom = snapshot.height;
    camera.updateProjectionMatrix();

    particleGeometry = createParticleGeometry(
      snapshot.geometry,
      createOrreryNebulaParticles(quality.particleCount),
      snapshot,
    );
    particleMaterial = new ShaderMaterial({
      uniforms: {
        uTime: { value: dependencies.now() / 1000 },
        uAtlas: { value: texture },
        uActiveStream: { value: activeIndex() },
      },
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
      side: DoubleSide,
    });
    scene.add(new Mesh(particleGeometry, particleMaterial));

    hubGeometry = new PlaneGeometry(34, 34);
    hubMaterial = new ShaderMaterial({
      uniforms: { uTime: { value: dependencies.now() / 1000 } },
      vertexShader: hubVertexShader,
      fragmentShader: hubFragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
      side: DoubleSide,
    });
    const hub = new Mesh(hubGeometry, hubMaterial);
    hub.position.set(snapshot.geometry.hub.x, snapshot.geometry.hub.y, 0.2);
    scene.add(hub);
    render();
  };

  const tick = (time: number) => {
    if (!running || destroyed || failed) return;
    if (time - lastFrame >= 1000 / quality.fps) {
      lastFrame = time;
      render(time);
    }
    frame = dependencies.requestFrame(tick);
  };

  const stop = () => {
    running = false;
    dependencies.cancelFrame(frame);
    frame = 0;
  };

  const handleContextLost = (event: Event) => {
    event.preventDefault();
    if (destroyed || failed) return;
    failed = true;
    stop();
    dependencies.onFailure();
  };
  canvas.addEventListener("webglcontextlost", handleContextLost);

  const disposeRenderer = () => {
    if (!renderer) return;
    renderer.dispose();
    renderer = null;
  };

  return {
    async prepare() {
      if (destroyed || failed) return false;
      if (prepared) return true;
      try {
        renderer = dependencies.rendererFactory(canvas);
        renderer.setClearColor(0x000000, 0);
        const loadedTexture = await dependencies.textureLoader(atlasUrl);
        if (destroyed || failed) {
          loadedTexture.dispose();
          return false;
        }
        texture = loadedTexture;
        texture.colorSpace = SRGBColorSpace;
        texture.minFilter = LinearFilter;
        texture.magFilter = LinearFilter;
        texture.generateMipmaps = false;
        texture.needsUpdate = true;
        prepared = true;
        rebuildVisuals();
        if (running) frame = dependencies.requestFrame(tick);
        return true;
      } catch {
        failed = true;
        disposeVisuals();
        disposeRenderer();
        return false;
      }
    },
    setRunning(next) {
      if (destroyed || failed || running === next) return;
      running = next;
      if (running && prepared) {
        lastFrame = 0;
        frame = dependencies.requestFrame(tick);
      } else if (!running) {
        dependencies.cancelFrame(frame);
        frame = 0;
        render();
      }
    },
    setActiveArtifact(next) {
      if (destroyed) return;
      artifact = next;
      if (!running) render();
    },
    setGeometry(next) {
      if (destroyed) return;
      snapshot = {
        ...next,
        dpr: clamp(next.dpr, 1, 2),
      };
      rebuildVisuals();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      disposeVisuals();
      texture?.dispose();
      texture = null;
      disposeRenderer();
    },
  };
};
