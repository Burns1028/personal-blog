#!/usr/bin/env bash
set -euo pipefail

NODE_VERSION="${NODE_VERSION:-24.15.0}"
case "$(uname -m)" in
  x86_64) node_arch="x64" ;;
  aarch64|arm64) node_arch="arm64" ;;
  *) echo "Unsupported CPU architecture" >&2; exit 1 ;;
esac

dnf install -y git nginx curl tar gzip openssl ca-certificates
if ! command -v certbot >/dev/null 2>&1; then
  dnf install -y certbot python3-certbot-nginx || {
    dnf install -y python3-pip
    python3 -m pip install --disable-pip-version-check certbot certbot-nginx
  }
fi

node_bundle="node-v${NODE_VERSION}-linux-${node_arch}.tar.xz"
node_tmp="$(mktemp -d /tmp/burns-node.XXXXXX)"
trap 'rm -rf "$node_tmp"' EXIT
curl --fail --location --silent --show-error \
  "https://nodejs.org/dist/v${NODE_VERSION}/${node_bundle}" \
  --output "${node_tmp}/${node_bundle}"
curl --fail --location --silent --show-error \
  "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt" \
  --output "${node_tmp}/SHASUMS256.txt"
(
  cd "$node_tmp"
  grep " ${node_bundle}$" SHASUMS256.txt | sha256sum --check --strict -
)
tar -xJf "${node_tmp}/${node_bundle}" -C /opt
ln -sfn "/opt/node-v${NODE_VERSION}-linux-${node_arch}/bin/node" /usr/local/bin/node
ln -sfn "/opt/node-v${NODE_VERSION}-linux-${node_arch}/bin/npm" /usr/local/bin/npm
ln -sfn "/opt/node-v${NODE_VERSION}-linux-${node_arch}/bin/npx" /usr/local/bin/npx
ln -sfn "/opt/node-v${NODE_VERSION}-linux-${node_arch}/bin/corepack" /usr/local/bin/corepack

id burns-blog >/dev/null 2>&1 || useradd --system --create-home --home-dir /home/burns-blog --shell /bin/bash burns-blog
usermod -a -G burns-blog nginx
install -d -m 0755 -o burns-blog -g burns-blog /opt/burns-blog /opt/burns-blog/releases /opt/burns-blog/repository
install -d -m 0750 -o burns-blog -g burns-blog /var/lib/burns-blog /var/lib/burns-blog/media /var/lib/burns-blog/media/articles /var/lib/burns-blog/backups
install -d -m 0750 -o root -g burns-blog /etc/burns-blog
install -d -m 0755 -o nginx -g nginx /var/www/letsencrypt
timedatectl set-timezone Asia/Shanghai
systemctl enable nginx
systemctl enable --now certbot-renew.timer

/usr/local/bin/node --version
git --version
nginx -v
