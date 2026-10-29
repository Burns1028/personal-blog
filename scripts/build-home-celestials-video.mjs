import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const input = args[args.indexOf("--input") + 1];
if (!args.includes("--input") || !input) throw new Error("Pass --input with the original green-screen MP4 path.");
const root = resolve(import.meta.dirname, "..");
const destination = resolve(root, "public/assets/home-celestials-v6");
mkdirSync(destination, { recursive: true });
// Key before resizing, preserve opaque dark surfaces, and remove green spill.
const key = "format=rgba,colorkey=0x22dc00:0.18:0.18,despill=type=green:expand=0:alpha=0";
const ffmpeg = (...options) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", input, ...options], { stdio: "inherit" });
const still = async (filter, name) => {
  const frame = execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", input, "-frames:v", "1", "-vf", filter, "-f", "image2pipe", "-c:v", "png", "-"], { maxBuffer: 20_000_000 });
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
ffmpeg("-filter_complex", `[0:v]${key},scale=960:770,format=rgba,split=2[rgb][matte];[rgb]format=rgb24[color];[matte]alphaextract,format=rgb24[alpha];[color][alpha]vstack=inputs=2,format=yuv420p[out]`,
  "-map", "[out]", "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "25", "-movflags", "+faststart", resolve(destination, "scene-alpha-packed.mp4"));

if (args.includes("--export-dir")) {
  const exports = resolve(args[args.indexOf("--export-dir") + 1]);
  mkdirSync(exports, { recursive: true });
  ffmpeg("-vf", `${key},scale=1280:-2`, "-an", "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "31", "-deadline", "good", "-cpu-used", "3", resolve(exports, "celestials-transparent.webm"));
}
