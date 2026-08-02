#!/usr/bin/env bash
set -euo pipefail

release_sha="${1:-}"
if [[ ! "$release_sha" =~ ^[a-f0-9]{40}$ ]]; then
  echo "Usage: deploy-release.sh <40-character commit SHA>" >&2
  exit 2
fi

repository=/opt/burns-blog/repository
releases=/opt/burns-blog/releases
release_dir="${releases}/${release_sha}"
current_link=/opt/burns-blog/current
environment_file=/etc/burns-blog/app.env

test -f "$environment_file"
runuser -u burns-blog -- git -C "$repository" fetch --prune origin "$release_sha"

if [[ ! -d "$release_dir" ]]; then
  runuser -u burns-blog -- git clone --no-checkout "$repository" "$release_dir"
  runuser -u burns-blog -- bash -c "cd '$release_dir' && git checkout --detach '$release_sha'"
  runuser -u burns-blog -- bash -c "cd '$release_dir' && npm ci && npm run build"
fi

install -m 0644 "$release_dir/ops/systemd/burns-blog.service" /etc/systemd/system/burns-blog.service
install -m 0644 "$release_dir/ops/systemd/burns-blog-backup.service" /etc/systemd/system/burns-blog-backup.service
install -m 0644 "$release_dir/ops/systemd/burns-blog-backup.timer" /etc/systemd/system/burns-blog-backup.timer
systemctl daemon-reload
systemctl enable burns-blog.service burns-blog-backup.timer

set -a
# shellcheck disable=SC1090
source "$environment_file"
set +a
health_log="/tmp/burns-health-${release_sha}.log"
runuser -u burns-blog -- env \
  SITE_URL="$SITE_URL" BLOG_DB_PATH="$BLOG_DB_PATH" BLOG_MEDIA_PATH="$BLOG_MEDIA_PATH" \
  BURNS_PUBLISH_KEYS="$BURNS_PUBLISH_KEYS" BURNS_RELEASE_SHA="$release_sha" \
  HOST=127.0.0.1 PORT=4322 \
  /usr/local/bin/node "$release_dir/dist/server/entry.mjs" >"$health_log" 2>&1 &
health_pid=$!
trap 'kill "$health_pid" >/dev/null 2>&1 || true; rm -f "$health_log"' EXIT
for attempt in {1..30}; do
  if curl --fail --silent http://127.0.0.1:4322/api/health >/dev/null; then
    break
  fi
  if [[ "$attempt" == 30 ]]; then
    cat "$health_log" >&2
    exit 1
  fi
  sleep 1
done
kill "$health_pid" >/dev/null 2>&1 || true
wait "$health_pid" 2>/dev/null || true
rm -f "$health_log"
trap - EXIT

if [[ -s "$BLOG_DB_PATH" ]]; then
  runuser -u burns-blog -- env BLOG_DB_PATH="$BLOG_DB_PATH" \
    /usr/local/bin/node "$release_dir/ops/backup-sqlite.mjs"
fi

previous_target="$(readlink "$current_link" 2>/dev/null || true)"
next_link="${current_link}.next"
ln -sfn "$release_dir" "$next_link"
mv -Tf "$next_link" "$current_link"
printf 'BURNS_RELEASE_SHA=%s\n' "$release_sha" > /etc/burns-blog/release.env
chown root:burns-blog /etc/burns-blog/release.env
chmod 0640 /etc/burns-blog/release.env
systemctl restart burns-blog.service

service_healthy=false
for attempt in {1..15}; do
  if curl --fail --silent http://127.0.0.1:4321/api/health >/dev/null; then
    service_healthy=true
    break
  fi
  sleep 1
done
if [[ "$service_healthy" != true ]]; then
  if [[ -n "$previous_target" ]]; then
    ln -sfn "$previous_target" "$next_link"
    mv -Tf "$next_link" "$current_link"
    printf 'BURNS_RELEASE_SHA=%s\n' "$(basename "$previous_target")" > /etc/burns-blog/release.env
    systemctl restart burns-blog.service
  fi
  exit 1
fi

systemctl start burns-blog-backup.timer
echo "deployed ${release_sha}"
