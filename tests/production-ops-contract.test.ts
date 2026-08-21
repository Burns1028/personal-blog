import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

test("Nginx protects publishing routes and serves persistent media", () => {
  const nginx = read("ops/nginx/burnsgao.me.conf");
  assert.match(nginx, /server_name burnsgao\.me www\.burnsgao\.me/);
  assert.match(nginx, /alias \/var\/lib\/burns-blog\/media\/articles\//);
  assert.match(nginx, /client_max_body_size 32m/);
  assert.match(nginx, /limit_req_zone .* zone=burns_publish:10m rate=60r\/m/);
  assert.match(nginx, /limit_req zone=burns_publish burst=20 nodelay/);
  assert.equal(
    nginx.match(
      /add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always/g,
    )?.length,
    3,
    "the HTTPS server and locations with their own add_header directives must all send HSTS",
  );
  assert.doesNotMatch(nginx, /Access-Control-Allow-Origin/);

  const mediaLocation = nginx.match(/location \^~ \/media\/articles\/ \{([\s\S]*?)\n    \}/)?.[1];
  assert.ok(mediaLocation, "persistent media location must exist");
  assert.doesNotMatch(
    mediaLocation,
    /try_files\s+\$uri/,
    "an alias location must not re-append the public URI to the filesystem path",
  );
});

test("systemd runs the app as an unprivileged persistent service", () => {
  const service = read("ops/systemd/burns-blog.service");
  const bootstrap = read("ops/bootstrap-ecs.sh");
  assert.match(service, /User=burns-blog/);
  assert.match(service, /EnvironmentFile=\/etc\/burns-blog\/app\.env/);
  assert.match(service, /ReadWritePaths=\/var\/lib\/burns-blog/);
  assert.match(bootstrap, /usermod -a -G burns-blog nginx/);
  assert.match(bootstrap, /systemctl enable --now certbot-renew\.timer/);
  assert.match(read("ops/systemd/burns-blog-backup.timer"), /Persistent=true/);
});

test("deployment checks out one commit and never pulls a mutable branch", () => {
  const deploy = read("ops/deploy-release.sh");
  assert.match(deploy, /git checkout --detach/);
  assert.match(deploy, /npm ci/);
  assert.match(deploy, /api\/health/);
  assert.doesNotMatch(deploy, /git pull/);
  assert.match(read("ops/bootstrap-ecs.sh"), /SHASUMS256\.txt/);
});
