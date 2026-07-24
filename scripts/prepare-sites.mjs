import {
  cp,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const astroDist = join(root, ".astro-dist");
const client = join(dist, "client");
const server = join(dist, "server");
const hostingSource = join(root, ".openai", "hosting.json");
const hostingTarget = join(dist, ".openai", "hosting.json");

await rm(astroDist, { recursive: true, force: true });
await rename(dist, astroDist);
await mkdir(client, { recursive: true });
await mkdir(server, { recursive: true });
await mkdir(dirname(hostingTarget), { recursive: true });
await cp(astroDist, client, { recursive: true });
await writeFile(hostingTarget, await readFile(hostingSource));

const worker = `const hasExtension = (pathname) => /\\.[a-z0-9]+$/i.test(pathname);

async function serve(request, env) {
  if (!env?.ASSETS) {
    return new Response("Static asset binding is unavailable.", { status: 500 });
  }

  const direct = await env.ASSETS.fetch(request);
  if (direct.status !== 404 || !["GET", "HEAD"].includes(request.method)) {
    return direct;
  }

  const url = new URL(request.url);
  if (hasExtension(url.pathname)) return direct;

  url.pathname = url.pathname.endsWith("/")
    ? url.pathname + "index.html"
    : url.pathname + "/index.html";

  return env.ASSETS.fetch(new Request(url, request));
}

export default {
  fetch(request, env) {
    return serve(request, env);
  },
};
`;

await writeFile(join(server, "index.js"), worker);
await rm(astroDist, { recursive: true, force: true });

console.log("Prepared dist/client and dist/server for Sites deployment.");
