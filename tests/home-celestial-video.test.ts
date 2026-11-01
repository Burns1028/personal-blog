import assert from "node:assert/strict";
import test from "node:test";
import { createCelestialVideoController } from "../src/lib/home-celestial-video.ts";

// Exercise playback policy failures without requiring a GPU or media decoder.
function fixture(t: test.TestContext) {
  const previousObserver = Object.getOwnPropertyDescriptor(globalThis, "ResizeObserver");
  Object.defineProperty(globalThis, "ResizeObserver", { configurable: true, value: class {
    observe() {}
    disconnect() {}
  } });
  t.after(() => {
    if (previousObserver) Object.defineProperty(globalThis, "ResizeObserver", previousObserver);
    else Reflect.deleteProperty(globalThis, "ResizeObserver");
  });
  const gl = new Proxy({}, {
    get: (_, key) => key === "getShaderParameter" || key === "getProgramParameter"
      ? () => true : () => ({}),
  });
  const canvas = Object.assign(new EventTarget(), { getContext: () => gl });
  const video = Object.assign(new EventTarget(), {
    paused: true,
    readyState: 0,
    src: "",
    dataset: { src: "/animation.mp4" },
    attempts: 0,
    allowed: false,
    play() {
      this.attempts++;
      if (!this.allowed) return Promise.reject(new DOMException("Gesture required", "NotAllowedError"));
      this.paused = false;
      return Promise.resolve();
    },
    pause() { this.paused = true; },
    requestVideoFrameCallback: () => 1,
    cancelVideoFrameCallback() {},
    removeAttribute() { this.src = ""; },
    load() {},
  });
  const blocked: boolean[] = [];
  const player = createCelestialVideoController(
    video as unknown as HTMLVideoElement,
    canvas as unknown as HTMLCanvasElement,
    [],
    () => {},
    (value) => blocked.push(value),
  )!;
  t.after(() => player.destroy());
  return { video, player, blocked };
}

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

test("autoplay refusal can recover synchronously from a user gesture", async (t) => {
  const { video, player, blocked } = fixture(t);
  player.setRunning(true);
  await flush();
  assert.deepEqual(blocked, [true]);
  video.allowed = true;
  player.retry();
  assert.equal(video.attempts, 2, "play must be called within the gesture handler");
  await flush();
  assert.equal(video.paused, false);
  assert.deepEqual(blocked, [true, false]);
});

test("a gesture cannot start an offscreen or preference-disabled animation", async (t) => {
  const { video, player } = fixture(t);
  player.setRunning(true);
  await flush();
  player.setRunning(false);
  video.allowed = true;
  player.retry();
  await flush();
  assert.equal(video.attempts, 1);
  assert.equal(video.paused, true);
});

test("a gesture also resumes a video paused by the browser", async (t) => {
  const { video, player } = fixture(t);
  video.allowed = true;
  player.setRunning(true);
  await flush();
  video.pause();
  player.retry();
  await flush();
  assert.equal(video.attempts, 2);
  assert.equal(video.paused, false);
});

test("an aborted play attempt does not prevent a later retry", async (t) => {
  const { video, player } = fixture(t);
  t.mock.method(video, "play", () => Promise.reject(new DOMException("Interrupted", "AbortError")));
  player.setRunning(true);
  await flush();
  t.mock.restoreAll();
  video.allowed = true;
  player.retry();
  await flush();
  assert.equal(video.paused, false);
});
