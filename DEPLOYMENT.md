# Deploying to an Ubuntu VPS (Docker Compose + Caddy)

The stack is two containers: `caddy` publishes 80/443 with automatic Let's Encrypt TLS and
proxies everything to the internal Astro server (`app:4321`). The SQLite database persists in
`./data` on the host, so redeploying never loses content.

## 0. One-command deploy (recommended)

From your machine, with the repo checked out:

```bash
./deploy.sh deploy@YOUR_VPS_IP yourdomain.com
```

First run installs Docker + the compose plugin, opens `22`/`80`/`443`, syncs the code to
`~/devfolio`, writes `.env` (generating a strong CMS password if yours is weak), builds, starts
and verifies HTTPS. Later runs only sync the code and restart the stack — `./data` and `.env`
are never overwritten.

Useful flags: `--key ~/.ssh/id_ed25519`, `--port 2222`, `--password '…'`, `--recreate-env`
(overwrites `.env`, after backing it up), `--no-firewall`, `--help`.

The manual walkthrough below is the same thing, step by step.

## 1. DNS

Create an **A record** for `yourdomain.com` (and `www`, if used) pointing at the VPS IP and wait
for propagation. Caddy requests its certificate on first start and fails if DNS isn't live.

## 2. Provision the server (Ubuntu 22.04 / 24.04)

```bash
ssh root@YOUR_VPS_IP
adduser deploy
usermod -aG sudo deploy
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## 3. Install Docker Engine

```bash
sudo apt-get update && sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker deploy   # run docker without sudo (re-login to apply)
```

## 4. Clone the repo

```bash
git clone https://github.com/rhythamnegi/rhythamnegi.git devfolio
cd devfolio
```

## 5. Configure `.env`

```bash
cp .env.example .env && chmod 600 .env
```

VPS-critical values:

| Variable | Value |
| --- | --- |
| `SITE` | `https://yourdomain.com` (real origin — canonical URLs / og images) |
| `CADDY_DOMAIN` | `yourdomain.com` (enables automatic Let's Encrypt + renewal) |
| `CMS_PASSWORD` | strong value — the dashboard is now internet-exposed |
| `SQLITE_PATH` | leave as `/app/data/cms.db` |
| `AI_API_KEY` | Groq key, or empty to disable the AI assist |

## 6. Launch

```bash
docker compose up -d --build
docker compose ps              # both containers up
docker compose logs -f caddy   # first start: watch the certificate get issued
curl -I https://yourdomain.com # expect HTTP/2 200
```

The CMS dashboard is live at `https://yourdomain.com/cms`.

## 7. Operations

```bash
# Update: data survives (./data is a host bind mount)
./deploy.sh user@your-vps yourdomain.com   # from your machine
# or, on the server: git pull && docker compose up -d --build

# Logs / shell
docker compose logs -f app
docker compose exec app sh

# Backup (posts, projects, settings and images are all in the one DB file)
docker compose exec app cp /app/data/cms.db /tmp/backup.db
docker compose cp app:/tmp/backup.db ./backup-$(date +%F).db
```

- `restart: unless-stopped` keeps both containers running across reboots.
- Nothing is published on 4321 from the outside — traffic is
  `internet → caddy (80/443) → app:4321 (internal)`.
- Caddy renews certificates and picks up restarted containers on its own.

## Optional hardening

- `sudo apt-get install -y unattended-upgrades && sudo dpkg-reconfigure --priority=low unattended-upgrades`
- Key-only SSH (disable password auth in `/etc/ssh/sshd_config`).
- Nightly backup cron using the backup command above.
