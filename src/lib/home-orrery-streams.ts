import { createOrreryHubGeometry, type Ellipse } from "./home-orrery-geometry.ts";
import {
  createOrrery2DStreamController,
  type OrreryArtifact,
  type OrreryRenderSnapshot,
  type OrreryStreamController,
} from "./home-orrery-streams-2d.ts";

export type { OrreryArtifact } from "./home-orrery-streams-2d.ts";

export type RectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type OrreryBodyRects = {
  moon: RectLike;
  earth: RectLike;
  blackHole: RectLike;
};

export type OrreryBodyElements = {
  moon: HTMLElement;
  earth: HTMLElement;
  blackHole: HTMLElement;
  earthOrigin: HTMLElement;
};

export type OrreryStreamOriginRects = {
  earth: RectLike;
};

export type OrreryStreamFacade = {
  prepare: () => Promise<boolean>;
  setRunning: (running: boolean) => void;
  setActiveArtifact: (artifact: OrreryArtifact) => void;
  resize: () => void;
  destroy: () => void;
};

const usableRect = (rect: RectLike) =>
  rect.width > 0 &&
  rect.height > 0 &&
  [rect.left, rect.top, rect.width, rect.height].every(Number.isFinite);

export const ellipseFromRect = (
  rect: RectLike,
  stage: RectLike,
): Ellipse => ({
  x: rect.left + rect.width / 2 - stage.left,
  y: rect.top + rect.height / 2 - stage.top,
  rx: rect.width / 2,
  ry: rect.height / 2,
});

export const createOrrerySnapshot = (
  stageRect: RectLike,
  bodyRects: OrreryBodyRects,
  devicePixelRatio: number,
  viewportWidth = stageRect.width,
  originRects?: OrreryStreamOriginRects,
): OrreryRenderSnapshot => {
  const width = Math.max(0, Number.isFinite(stageRect.width) ? stageRect.width : 0);
  const height = Math.max(0, Number.isFinite(stageRect.height) ? stageRect.height : 0);
  const measuredViewportWidth = Math.max(
    0,
    Number.isFinite(viewportWidth) ? viewportWidth : width,
  );
  const dpr = Math.min(2, Math.max(1, devicePixelRatio || 1));
  if (
    !usableRect(stageRect) ||
    !Object.values(bodyRects).every(usableRect) ||
    (originRects && !Object.values(originRects).every(usableRect))
  ) {
    return { geometry: null, width, height, viewportWidth: measuredViewportWidth, dpr };
  }
  const bodies = {
    moon: ellipseFromRect(bodyRects.moon, stageRect),
    earth: ellipseFromRect(bodyRects.earth, stageRect),
    blackHole: ellipseFromRect(bodyRects.blackHole, stageRect),
  };
  return {
    geometry: createOrreryHubGeometry(
      bodies,
      { width, height },
      originRects
        ? {
            earth: {
              x: originRects.earth.left + originRects.earth.width / 2 - stageRect.left,
              y: originRects.earth.top + originRects.earth.height / 2 - stageRect.top,
            },
          }
        : undefined,
    ),
    width,
    height,
    viewportWidth: measuredViewportWidth,
    dpr,
  };
};

type AtlasSources = {
  standard: string;
  retina: string;
};

type ThreeModule = typeof import("./home-orrery-streams-three");

type FacadeDependencies = {
  loadThree: () => Promise<ThreeModule>;
  create2D: typeof createOrrery2DStreamController;
};

export const createOrreryStreamController = (
  initialCanvas: HTMLCanvasElement,
  bodyElements: OrreryBodyElements,
  atlasSources: AtlasSources,
  dependencyOverrides: Partial<FacadeDependencies> = {},
): OrreryStreamFacade => {
  const stage = initialCanvas.parentElement;
  const dependencies: FacadeDependencies = {
    loadThree:
      dependencyOverrides.loadThree ??
      (() => import("./home-orrery-streams-three")),
    create2D: dependencyOverrides.create2D ?? createOrrery2DStreamController,
  };
  let canvas = initialCanvas;
  let backend: OrreryStreamController | null = null;
  let snapshot: OrreryRenderSnapshot = {
    geometry: null,
    width: 1,
    height: 1,
    viewportWidth: 1,
    dpr: 1,
  };
  let running = false;
  let artifact: OrreryArtifact = "none";
  let destroyed = false;
  let resizeFrame = 0;
  let fallbackPromise: Promise<boolean> | null = null;

  const measure = () => {
    if (!stage) return snapshot;
    const stageRect = stage.getBoundingClientRect();
    const viewportWidths = [
      window.innerWidth,
      document.documentElement?.clientWidth,
    ].filter((value) => Number.isFinite(value) && value > 0);
    snapshot = createOrrerySnapshot(
      stageRect,
      {
        moon: bodyElements.moon.getBoundingClientRect(),
        earth: bodyElements.earth.getBoundingClientRect(),
        blackHole: bodyElements.blackHole.getBoundingClientRect(),
      },
      window.devicePixelRatio || 1,
      viewportWidths.length > 0 ? Math.min(...viewportWidths) : stageRect.width,
      { earth: bodyElements.earthOrigin.getBoundingClientRect() },
    );
    return snapshot;
  };

  const applyState = (controller: OrreryStreamController) => {
    controller.setGeometry(snapshot);
    controller.setActiveArtifact(artifact);
    controller.setRunning(running);
  };

  const replaceCanvas = () => {
    const replacement = canvas.cloneNode(false) as HTMLCanvasElement;
    replacement.removeAttribute("width");
    replacement.removeAttribute("height");
    canvas.replaceWith(replacement);
    canvas = replacement;
    return replacement;
  };

  const activateFallback = () => {
    if (fallbackPromise) return fallbackPromise;
    fallbackPromise = (async () => {
      if (destroyed) return false;
      backend?.destroy();
      const fallbackCanvas = replaceCanvas();
      const fallback = dependencies.create2D(fallbackCanvas);
      if (!fallback) return false;
      backend = fallback;
      applyState(fallback);
      const ready = await fallback.prepare();
      if (destroyed) return false;
      if (!ready) {
        fallback.destroy();
        if (backend === fallback) backend = null;
        return false;
      }
      fallbackCanvas.dataset.renderer = "2d";
      fallbackCanvas.style.opacity = "1";
      return true;
    })();
    return fallbackPromise;
  };

  const resize = () => {
    if (destroyed) return;
    measure();
    backend?.setGeometry(snapshot);
  };

  const scheduleResize = () => {
    if (destroyed || resizeFrame !== 0) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      resize();
    });
  };

  const resizeObserver = new ResizeObserver(scheduleResize);
  if (stage) resizeObserver.observe(stage);
  for (const body of Object.values(bodyElements)) resizeObserver.observe(body);
  window.addEventListener("resize", scheduleResize, { passive: true });
  void document.fonts?.ready.then(scheduleResize);
  measure();

  return {
    async prepare() {
      if (destroyed) return false;
      try {
        const threeModule = await dependencies.loadThree();
        if (destroyed) return false;
        const source =
          window.devicePixelRatio > 1.25
            ? atlasSources.retina
            : atlasSources.standard;
        const three = threeModule.createOrreryThreeStreamController(
          canvas,
          source,
          { onFailure: () => void activateFallback() },
        );
        backend = three;
        applyState(three);
        if (!(await three.prepare()) || destroyed) {
          return activateFallback();
        }
        canvas.dataset.renderer = "three";
        canvas.style.opacity = "1";
        return true;
      } catch {
        return activateFallback();
      }
    },
    setRunning(next) {
      running = next;
      backend?.setRunning(next);
    },
    setActiveArtifact(next) {
      artifact = next;
      backend?.setActiveArtifact(next);
    },
    resize,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      window.cancelAnimationFrame(resizeFrame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleResize);
      backend?.destroy();
      backend = null;
    },
  };
};
