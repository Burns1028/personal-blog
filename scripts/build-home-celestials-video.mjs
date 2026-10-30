import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { homeCelestialRegions as atlas } from "../src/data/home-celestial-regions.ts";

const args = process.argv.slice(2);
const input = args[args.indexOf("--input") + 1];
if (!args.includes("--input") || !input) throw new Error("Pass --input with the original green-screen MP4 path.");
const root = resolve(import.meta.dirname, "..");
const destination = resolve(root, "public/assets/home-celestials-v8");
mkdirSync(destination, { recursive: true });
const loopSeconds = 8;
const blendSeconds = 0.4;
const fps = 20;
const fadeSeconds = (blendSeconds * fps - 1) / fps;
// Key before resizing, preserve opaque dark surfaces, and remove green spill.
const key = "format=rgba,colorkey=0x22dc00:0.18:0.18,despill=type=green:expand=0:alpha=0";
const ffmpeg = (...options) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", input, ...options], { stdio: "inherit" });
const still = async (filter, name) => {
  const frame = execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", input, "-ss", String(blendSeconds), "-frames:v", "1", "-vf", filter, "-f", "image2pipe", "-c:v", "png", "-"], { maxBuffer: 20_000_000 });
  await sharp(frame).webp({ quality: 92, alphaQuality: 100 }).toFile(resolve(destination, name));
};

for (const [name, { source: [x, y, width, height] }] of Object.entries(atlas.subjects)) {
  for (const size of [width / 2, width]) {
    await still(`${key},crop=${width}:${height}:${x}:${y},scale=${size}:-1`, `${name}-${size}.webp`);
  }
}
const navigation = [
  { name: "earth", crop: "512:512:185:85", sizes: [[64, 64], [128, 128]] },
  { name: "moon", crop: "448:448:860:688", sizes: [[64, 64], [128, 128]] },
  { name: "black-hole", crop: "768:512:760:85", sizes: [[80, 64], [160, 128]] },
];
for (const { name, crop, sizes } of navigation) {
  for (const [width, height] of sizes) {
    await still(`${key},crop=${crop},scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black@0`, `nav-${name}-${width}.webp`);
  }
}

// Pack RGB above its alpha mask in one ordinary H.264 stream. The browser
// reconstructs transparency with one GPU draw, including browsers without VP9 alpha.
// Crossfade the last eight frames into the source's opening, so trimming the
// clip does not introduce a hard jump. Pack before fading to preserve alpha.
const loop = `split=2[tail-source][head-source];[tail-source]trim=start=${blendSeconds}:end=${loopSeconds + blendSeconds},setpts=PTS-STARTPTS[tail];[head-source]trim=end=${blendSeconds},setpts=PTS-STARTPTS[head];[tail][head]xfade=transition=fade:duration=${fadeSeconds}:offset=${loopSeconds - blendSeconds}`;
const subjects = Object.entries(atlas.subjects);
const split = subjects.map(([name]) => `[${name}-source]`).join("");
const crops = subjects.map(([name, { source: [x, y, w, h] }]) => `[${name}-source]crop=${w}:${h}:${x}:${y}[${name}]`).join(";");
const inputs = subjects.map(([name]) => `[${name}]`).join("");
const layout = subjects.map(([, { region: [x, y] }]) => `${x}_${y}`).join("|");
ffmpeg("-filter_complex", `[0:v]fps=${fps},${key},split=3${split};${crops};${inputs}xstack=inputs=3:layout=${layout}:fill=black@0,format=rgba,split=2[rgb][matte];[rgb]format=rgb24[color];[matte]alphaextract,format=rgb24[alpha];[color][alpha]vstack=inputs=2,format=yuv444p,${loop},format=yuv420p,setsar=1[out]`,
  "-map", "[out]", "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-level:v", "4.1", "-refs", "4", "-movflags", "+faststart", resolve(destination, "scene-alpha-packed.mp4"));

if (args.includes("--export-dir")) {
  const exports = resolve(args[args.indexOf("--export-dir") + 1]);
  mkdirSync(exports, { recursive: true });
  ffmpeg("-vf", `${key},scale=1280:-2`, "-an", "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "31", "-deadline", "good", "-cpu-used", "3", resolve(exports, "celestials-transparent.webm"));
}
