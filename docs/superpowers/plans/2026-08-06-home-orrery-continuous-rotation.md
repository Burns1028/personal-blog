# 首页思想星系连续自转 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在完全保留首页当前静态月球、地球、辉光、连接线和构图的前提下，让月球与地球内部纹理持续、单向、极慢自转，并彻底消除离散帧交叉淡化造成的重影和模糊。

**Architecture:** 现有透明星体切图继续作为首屏与失败回退母版；构建脚本把母版可见半球确定性展开到球面纹理正面，并把 ImageGen 生成的同调背面纹理只用于不可见半球。浏览器使用一个无依赖的原生 WebGL 片元着色器，每一帧只采样一张球面纹理并改变经度；外缘、定向辉光、连接线和交互容器保持静止。

**Tech Stack:** Astro 7、TypeScript 6、原生 WebGL 1、Sharp 0.35、Node test、ImageGen（只补不可见背面）

## Global Constraints

- 当前静态月球与地球是不可变视觉母版：不得重新调色、增亮、重构轮廓或替换正面纹理。
- 月球自转周期固定为 `180_000ms`；地球自转周期固定为 `150_000ms`；两者均为单向线性循环。
- 任意动画帧只允许一个球面纹理采样；禁止相邻帧透明叠加、镜像折叠、正弦往返和整个图片平面旋转。
- 月球与地球的 DOM 位置、尺寸、外轮廓和 hover 坐标必须恒定；hover 只允许 `brightness(1.12)`。
- `home-orrery-projects-earth-glow-v4-*`、连接线、粒子流、黑洞和卫星不在本次视觉改动范围内。
- WebGL 初始化、纹理解码或上下文恢复失败时，必须继续显示当前静态母版。
- 正常可见状态持续运动；离开视口、页面隐藏、导航开始、`prefers-reduced-motion` 或 `saveData` 时沿用现有生命周期暂停。
- 不新增第三方前端运行时依赖。

---

### Task 1: 锁定连续球面渲染契约

**Files:**
- Modify: `tests/home-orrery.test.ts`
- Create: `tests/home-celestial-sphere.test.ts`

**Interfaces:**
- Consumes: 设计文档中的 `180_000ms`、`150_000ms`、单采样和静态回退约束。
- Produces: 对 `createCelestialSphereController(canvas, options)`、纹理清单和旧帧架构移除的失败测试。

- [ ] **Step 1: 把旧帧测试替换成新运行时契约**

```ts
assert.match(manifest, /home-orrery-writing-moon-surface-v6-2048\.webp/);
assert.match(manifest, /home-orrery-projects-earth-surface-v6-2048\.webp/);
assert.doesNotMatch(manifest, /framePrefix|frameCount|frame-v5/);
assert.match(component, /createCelestialSphereController/);
assert.match(component, /durationMs:\s*180_000/);
assert.match(component, /durationMs:\s*150_000/);
assert.doesNotMatch(component, /createCelestialFrameController/);
```

- [ ] **Step 2: 新增 WebGL 控制器源码契约测试**

```ts
test("sphere renderer samples one seamless texture and rotates longitude continuously", () => {
  const source = readFileSync(resolve(root, "src/lib/home-celestial-sphere.ts"), "utf8");
  assert.match(source, /uniform sampler2D uTexture/);
  assert.match(source, /uniform float uRotation/);
  assert.match(source, /texture2D\(uTexture, uv\)/);
  assert.doesNotMatch(source, /globalAlpha|drawImage|Math\.sin\(|nextIndex|mix/);
});
```

- [ ] **Step 3: 运行测试并确认因新模块和新清单尚未实现而失败**

Run: `node --test tests/home-orrery.test.ts tests/home-celestial-sphere.test.ts`

Expected: FAIL，错误指向缺少 `home-celestial-sphere.ts`、`surface-v6` 纹理和旧 frame manifest。

---

### Task 2: 生成背面参考并构建视觉锁定的无缝球面纹理

**Files:**
- Create: `design-source/home-orrery-v3/moon-far-hemisphere-v1.png`
- Create: `design-source/home-orrery-v3/earth-far-hemisphere-v1.png`
- Modify: `scripts/build-home-orrery-assets.mjs`
- Create: `public/assets/home-cosmic-system-v4/home-orrery-writing-moon-surface-v6-2048.webp`
- Create: `public/assets/home-cosmic-system-v4/home-orrery-projects-earth-surface-v6-2048.webp`
- Modify: `tests/home-orrery.test.ts`

**Interfaces:**
- Consumes: 当前母版裁切 `home-orrery-writing-moon-v4-960.webp`、`home-orrery-projects-earth-v4-960.webp`；ImageGen 只生成不可见背面参考。
- Produces: 两张 `2048 × 1024`、横向无缝、WebGL 可 `REPEAT` 的球面纹理。

- [ ] **Step 1: 用 ImageGen 生成月球不可见半球参考**

Prompt:

```text
Use case: scientific-educational
Asset type: seamless equirectangular sphere texture, unseen lunar hemisphere only
Input image: the current Burns homepage moon is the immutable front-hemisphere style and color reference
Primary request: create a flat 2:1 equirectangular lunar surface map whose material, crater scale, warm graphite-gold tone, grain and restrained contrast match the reference exactly
Composition: no rendered globe, no space, no cast shadow, no rim glow; flat texture fills the canvas edge to edge and tiles seamlessly left-to-right
Constraints: this image supplies only unseen side/back information; do not brighten, stylize, relight or reinterpret the visible reference hemisphere; no text or watermark
```

Save as `design-source/home-orrery-v3/moon-far-hemisphere-v1.png`.

- [ ] **Step 2: 用 ImageGen 生成地球不可见半球参考**

Prompt:

```text
Use case: scientific-educational
Asset type: seamless equirectangular sphere texture, unseen stylized Earth hemisphere only
Input image: the current Burns homepage Earth is the immutable front-hemisphere style and color reference
Primary request: create a flat 2:1 equirectangular dark indigo Earth surface map with the same painterly mineral texture and sparse antique-gold land lights
Composition: no rendered globe, no space, no atmosphere, no cast shadow, no blue rim glow; flat texture fills the canvas edge to edge and tiles seamlessly left-to-right
Constraints: this image supplies only unseen side/back information; do not brighten, make photorealistic, add clouds, relight or reinterpret the visible reference hemisphere; no text or watermark
```

Save as `design-source/home-orrery-v3/earth-far-hemisphere-v1.png`.

- [ ] **Step 3: 在构建脚本中加入可见半球展开函数**

```js
const unwrapVisibleHemisphere = ({ sphere, farSide, width = 2048, height = 1024 }) => {
  // 对 |longitude| <= PI/2 的像素使用母版球体的逆投影采样；
  // 对其余经度使用 ImageGen farSide；只在 86°–94° 的不可见边缘做 smoothstep 接缝。
  // 输出 longitude 可横向循环的 RGBA Buffer。
};
```

可见半球采样必须使用：

```js
const sphereX = Math.cos(latitude) * Math.sin(longitude);
const sphereY = -Math.sin(latitude);
const sourceX = centerX + sphereX * radius;
const sourceY = centerY + sphereY * radius;
```

- [ ] **Step 4: 移除离散帧构建调用并输出 POT 纹理**

```js
await outputSphereTexture({
  box: { left: 831, top: 89, width: 128, height: 128 },
  farSide: "moon-far-hemisphere-v1.png",
  output: "home-orrery-writing-moon-surface-v6-2048.webp",
});
await outputSphereTexture({
  box: { left: 1236, top: 163, width: 300, height: 300 },
  farSide: "earth-far-hemisphere-v1.png",
  output: "home-orrery-projects-earth-surface-v6-2048.webp",
});
```

- [ ] **Step 5: 增加纹理尺寸、首屏复现和左右接缝测试**

```ts
assert.equal(metadata.width, 2048);
assert.equal(metadata.height, 1024);
assert.ok(meanFrontReprojectionDifference <= 3.5);
assert.ok(meanHorizontalSeamDifference <= 5);
```

- [ ] **Step 6: 构建纹理并运行素材测试**

Run: `npm run assets:home:orrery && node --test tests/home-orrery.test.ts`

Expected: PASS；不再生成或引用 `frame-v5`。

---

### Task 3: 实现无依赖 WebGL 球面控制器

**Files:**
- Create: `src/lib/home-celestial-sphere.ts`
- Modify: `tests/home-celestial-sphere.test.ts`

**Interfaces:**
- Consumes: `HTMLCanvasElement`、`textureUrl`、`durationMs`、可选 `initialRotation`。
- Produces: `CelestialSphereController`，接口为 `setRunning(running: boolean): void` 与 `destroy(): void`。

- [ ] **Step 1: 定义公开接口和初始化失败的空回退**

```ts
export interface CelestialSphereController {
  setRunning(running: boolean): void;
  destroy(): void;
}

export interface CelestialSphereOptions {
  textureUrl: string;
  durationMs: number;
  initialRotation?: number;
  maxDevicePixelRatio?: number;
}
```

- [ ] **Step 2: 实现单纹理球面片元着色器**

```glsl
precision highp float;
uniform sampler2D uTexture;
uniform float uRotation;
varying vec2 vUv;
const float PI = 3.141592653589793;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  p.y = -p.y;
  float r2 = dot(p, p);
  if (r2 > 1.0) discard;
  float z = sqrt(max(0.0, 1.0 - r2));
  float longitude = atan(p.x, z) + uRotation;
  float latitude = asin(clamp(p.y, -1.0, 1.0));
  vec2 uv = vec2(fract(longitude / (2.0 * PI) + 0.5), latitude / PI + 0.5);
  vec4 color = texture2D(uTexture, uv);
  float edgeAlpha = 1.0 - smoothstep(0.965, 0.998, sqrt(r2));
  gl_FragColor = vec4(color.rgb, color.a * edgeAlpha);
}
```

- [ ] **Step 3: 实现持续单向相位累计**

```ts
elapsedMs = (elapsedMs + Math.min(now - previousTime, 100)) % options.durationMs;
gl.uniform1f(rotationUniform, initialRotation + elapsedMs / options.durationMs * Math.PI * 2);
```

不得出现 `Math.sin`、负速度、`nextIndex`、`globalAlpha` 或两张纹理。

- [ ] **Step 4: 实现纹理设置和清晰度控制**

```ts
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.generateMipmap(gl.TEXTURE_2D);
```

Canvas backing store 使用 `min(devicePixelRatio, 2)`，并由 `ResizeObserver` 在显示尺寸变化时更新 viewport。

- [ ] **Step 5: 首帧成功后原子切换静态母版与 WebGL**

```ts
canvas.parentElement?.classList.add("is-motion-ready");
```

只有首帧完成后才添加；失败、上下文丢失或 `destroy()` 时移除，保证任何失败状态只显示静态母版。

- [ ] **Step 6: 运行控制器测试**

Run: `node --test tests/home-celestial-sphere.test.ts`

Expected: PASS。

---

### Task 4: 接入首页并删除重影路径

**Files:**
- Modify: `src/data/home-orrery-assets.ts`
- Modify: `src/components/HomeOrrery.astro`
- Modify: `src/styles/home-orrery.css`
- Delete: `src/lib/home-celestial-frames.ts`
- Delete: `public/assets/home-cosmic-system-v4/home-orrery-writing-moon-frame-v5-00.webp` through `-23.webp`
- Delete: `public/assets/home-cosmic-system-v4/home-orrery-projects-earth-frame-v5-00.webp` through `-23.webp`
- Modify: `tests/home-orrery.test.ts`

**Interfaces:**
- Consumes: Task 2 的两张 `surface-v6` 与 Task 3 的 `createCelestialSphereController`。
- Produces: 首页月球和地球连续自转；旧帧资源与代码完全退出运行时。

- [ ] **Step 1: 把 manifest motion 改成单纹理配置**

```ts
motion: {
  texture: `${matchedLayerRoot}/home-orrery-writing-moon-surface-v6-2048.webp`,
  durationMs: 180_000,
}
```

地球对应 `150_000`。

- [ ] **Step 2: 把 Canvas 数据属性改成纹理 URL**

```astro
<canvas
  class="home-cosmos__moon-motion-canvas"
  data-home-moon-motion
  data-texture-url={homeOrreryAssets.writing.motion.texture}
></canvas>
```

- [ ] **Step 3: 用 WebGL 控制器替换帧控制器**

```ts
const moonMotion = createSurfaceMotion(
  "[data-home-moon-motion]",
  homeOrreryAssets.writing.motion.durationMs,
);
const earthMotion = createSurfaceMotion(
  "[data-home-earth-motion]",
  homeOrreryAssets.projects.motion.durationMs,
);
```

- [ ] **Step 4: 用原子切换 CSS 避免母版与 Canvas 同时可见**

```css
.home-cosmos__sphere.is-motion-ready .home-cosmos__moon-base,
.home-cosmos__sphere.is-motion-ready .home-cosmos__earth-base { opacity: 0; }
.home-cosmos__sphere.is-motion-ready :is(
  .home-cosmos__moon-motion-canvas,
  .home-cosmos__earth-motion-canvas
) { opacity: 1; }
```

这组切换不使用 opacity transition，防止静态母版与动态球面短暂叠加。

- [ ] **Step 5: 删除旧控制器和 48 张离散帧**

只删除明确的 `frame-v5-00` 至 `frame-v5-23` 文件；保留全部 v4 母版、辉光、黑洞、连接线和卫星资源。

- [ ] **Step 6: 运行首页单元测试**

Run: `node --test tests/home-orrery.test.ts tests/home-celestial-sphere.test.ts tests/home-orrery-particles.test.ts`

Expected: PASS。

---

### Task 5: 构建、视觉回归和故障回退验收

**Files:**
- Modify: `docs/superpowers/plans/2026-08-06-home-orrery-continuous-rotation.md`（勾选完成项和记录验证结果）

**Interfaces:**
- Consumes: 完整首页实现。
- Produces: 自动化与浏览器视觉验收记录。

- [ ] **Step 1: 运行静态检查与生产构建**

Run: `npm run build`

Expected: `astro check` 0 errors、0 warnings，生产构建成功。

- [ ] **Step 2: 运行完整内容测试**

Run: `npm run test:content`

Expected: 所有与首页、素材、发布 API 有关的测试通过；若本机沙箱阻止监听端口，单独记录该环境错误，不把它误判为首页回归。

- [ ] **Step 3: 在 `http://127.0.0.1:4321/` 做正常状态视觉验收**

必须同时满足：

1. 首帧与当前 v4 静态母版在亮度、大小、位置、定向辉光上无可感差异。
2. 连续观察至少 `20s`，月球和地球内部纹理始终向同一方向缓慢移动。
3. 球体外缘、辉光、连接线交汇点和 DOM 边界不移动。
4. 不出现第二个轮廓、双层大陆、模糊叠影、帧跳变或反向摆动。
5. hover 仅提高亮度；进入和离开 hover 时坐标与尺寸不变。
6. 连接线粒子、黑洞和卫星保持现有效果。

- [ ] **Step 4: 验证回退路径**

在 DevTools 阻止任一 `surface-v6` 请求或临时模拟 `canvas.getContext("webgl") === null`，预期对应星体继续显示 v4 静态母版，没有透明洞、黑框或布局变化。

- [ ] **Step 5: 记录最终验证并提交实现**

```bash
git add src scripts tests public/assets/home-cosmic-system-v4 design-source/home-orrery-v3 docs/superpowers/plans/2026-08-06-home-orrery-continuous-rotation.md
git commit -m "fix: render homepage planets with continuous sphere rotation"
```
