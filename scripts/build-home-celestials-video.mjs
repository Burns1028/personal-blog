import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const input = args[args.indexOf("--input") + 1];
if (!args.includes("--input") || !input) throw new Error("Pass --input with the original green-screen MP4 path.");
const root = resolve(import.meta.dirname, "..");
const destination = resolve(root, "public/assets/home-celestials-v7");
mkdirSync(destination, { recursive: true });
const loopSeconds = 10;
const blendSeconds = 0.4;
const fps = 20;
const fadeSeconds = (blendSeconds * fps - 1) / fps;
// Key before resizing, preserve opaque dark surfaces, and remove green spill.
const key = "format=rgba,colorkey=0x22dc00:0.18:0.18,despill=type=green:expand=0:alpha=0";
const ffmpeg = (...options) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", input, ...options], { stdio: "inherit" });
const still = async (filter, name) => {
  const frame = execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", input, "-ss", String(blendSeconds), "-frames:v", "1", "-vf", filter, "-f", "image2pipe", "-c:v", "png", "-"], { maxBuffer: 20_000_000 });
  await sharp(frame).webp({ quality: 86, alphaQuality: 100 }).toFile(resolve(destination, name));
};

for (const width of [1200, 1600]) {
  await still(`${key},scale=${width}:-1`, `scene-${width}.webp`);
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
ffmpeg("-filter_complex", `[0:v]fps=${fps},${key},scale=1080:866,format=rgba,split=2[rgb][matte];[rgb]format=rgb24[color];[matte]alphaextract,format=rgb24[alpha];[color][alpha]vstack=inputs=2,format=yuv444p,${loop},format=yuv420p[out]`,
  "-map", "[out]", "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-level:v", "4.1", "-refs", "4", "-movflags", "+faststart", resolve(destination, "scene-alpha-packed.mp4"));

if (args.includes("--export-dir")) {
  const exports = resolve(args[args.indexOf("--export-dir") + 1]);
  mkdirSync(exports, { recursive: true });
  ffmpeg("-vf", `${key},scale=1280:-2`, "-an", "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "31", "-deadline", "good", "-cpu-used", "3", resolve(exports, "celestials-transparent.webm"));
}
