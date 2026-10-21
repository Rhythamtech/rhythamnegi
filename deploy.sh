#!/usr/bin/env bash
#
# deploy.sh — one-command deploy of the devfolio stack to an Ubuntu VPS.
#
#   ./deploy.sh user@your-vps yourdomain.com
#
# What it does, in order:
#   1. Checks SSH connectivity.
#   2. Installs Docker Engine + compose plugin (idempotent) and opens the firewall.
#   3. rsyncs this repo to ~/devfolio on the VPS (data/ and .env are never touched).
#   4. Creates .env on first deploy (or leaves the existing one alone) and sets
#      SITE / CADDY_DOMAIN / SQLITE_PATH for production.
#   5. Builds the image, starts Caddy + app, waits for health, verifies HTTPS.
#
# Re-running is safe: it updates the code and restarts the containers but keeps
# the SQLite database (./data) and your production secrets (.env) untouched.
#
# Requirements on your machine: bash, ssh, rsync, and scp (all ship with macOS).
#
# NOTE: deliberately no `-u` — macOS ships bash 3.2, where `set -u` breaks
# empty-array expansion ("${arr[@]}").
set -Eeo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# Defaults
# ──────────────────────────────────────────────────────────────────────────────
TARGET=""                 # user@host (positional 1)
DOMAIN=""                 # yourdomain.com (positional 2 or --domain)
SSH_PORT=22
SSH_KEY=""
APP_DIR="devfolio"        # directory on the VPS
FIREWALL=1                # configure ufw (80/443/ssh) when present
RECREATE_ENV=0            # force-regenerate the remote .env
CMS_PASSWORD_OVERRIDE="${CMS_PASSWORD:-}"

if [ -t 1 ]; then
	BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'; GREEN=$'\033[32m'
	YELLOW=$'\033[33m'; CYAN=$'\033[36m'; RESET=$'\033[0m'
else
	BOLD=""; DIM=""; RED=""; GREEN=""; YELLOW=""; CYAN=""; RESET=""
fi

log()  { printf '%s▸%s %s\n' "$CYAN" "$RESET" "$*"; }
ok()   { printf '%s✔%s %s\n' "$GREEN" "$RESET" "$*"; }
warn() { printf '%s!%s %s\n' "$YELLOW" "$RESET" "$*" >&2; }
die()  { printf '%s✘%s %s\n' "$RED" "$RESET" "$*" >&2; exit 1; }

usage() {
	cat <<'EOF'
Usage:
  ./deploy.sh user@host yourdomain.com [options]

Options:
  -d, --domain <name>     Public domain (enables Let's Encrypt). Also accepts https://...
  -p, --port <port>       SSH port (default: 22)
  -k, --key <path>        SSH private key
  -a, --app-dir <dir>     Directory on the VPS (default: devfolio)
      --password <pass>   CMS password to write on first deploy
                          (default: reuse .env, or generate a strong one)
      --recreate-env      Overwrite the remote .env (backed up first)
      --no-firewall       Do not touch ufw
  -h, --help              Show this help

Examples:
  ./deploy.sh deploy@203.0.113.10 rhythamnegi.com
  ./deploy.sh root@vps --domain example.com --key ~/.ssh/id_ed25519
  ./deploy.sh deploy@vps example.com --recreate-env
EOF
}

# ──────────────────────────────────────────────────────────────────────────────
# Arguments
# ──────────────────────────────────────────────────────────────────────────────
while [ $# -gt 0 ]; do
	case "$1" in
		-h|--help)       usage; exit 0 ;;
		-d|--domain)     [ $# -ge 2 ] || die "--domain needs a value"; DOMAIN="$2"; shift 2 ;;
		-p|--port)       [ $# -ge 2 ] || die "--port needs a value"; SSH_PORT="$2"; shift 2 ;;
		-k|--key)        [ $# -ge 2 ] || die "--key needs a value"; SSH_KEY="$2"; shift 2 ;;
		-a|--app-dir)    [ $# -ge 2 ] || die "--app-dir needs a value"; APP_DIR="$2"; shift 2 ;;
		--password)      [ $# -ge 2 ] || die "--password needs a value"; CMS_PASSWORD_OVERRIDE="$2"; shift 2 ;;
		--recreate-env)  RECREATE_ENV=1; shift ;;
		--no-firewall)   FIREWALL=0; shift ;;
		-*)              die "Unknown option: $1 (try --help)" ;;
		*)
			if [ -z "$TARGET" ]; then
				TARGET="$1"
			elif [ -z "$DOMAIN" ]; then
				DOMAIN="$1"
			else
				die "Unexpected argument: $1 (try --help)"
			fi
			shift
			;;
	esac
done

[ -n "$TARGET" ] || { usage; echo; die "Missing user@host."; }

# Always operate from the repo root, no matter where the script was invoked.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || die "Cannot enter $SCRIPT_DIR"

# Fall back to CADDY_DOMAIN from the local .env if no domain was given.
if [ -z "$DOMAIN" ] && [ -f .env ]; then
	DOMAIN="$(sed -n 's/^[[:space:]]*CADDY_DOMAIN=//p' .env | head -n 1 | tr -d "\"'" | sed 's/[[:space:]]*#.*$//')"
fi
[ -n "$DOMAIN" ] || die "Missing domain. Usage: ./deploy.sh user@host yourdomain.com"

# Normalise the domain: strip scheme/path/trailing slashes.
DOMAIN="${DOMAIN#http://}"
DOMAIN="${DOMAIN#https://}"
DOMAIN="${DOMAIN%%/*}"
DOMAIN="${DOMAIN%/}"
[ -n "$DOMAIN" ] || die "Invalid domain."
[[ "$DOMAIN" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$ ]] \
	|| die "Invalid domain '$DOMAIN' (expected e.g. example.com, without scheme or port)."

case "$CMS_PASSWORD_OVERRIDE" in
	*"'"*) die "The CMS password may not contain a single quote." ;;
esac

# The remote path is spliced into shell commands — keep it boring.
[[ "$APP_DIR" =~ ^[A-Za-z0-9._/-]+$ ]] || die "APP_DIR may only contain letters, digits, . _ / -"
[[ "$TARGET" =~ ^[A-Za-z0-9._@:-]+$ ]] || die "TARGET must look like user@host"

for cmd in ssh rsync scp; do
	command -v "$cmd" >/dev/null 2>&1 || die "Missing '$cmd' on this machine."
done

# ──────────────────────────────────────────────────────────────────────────────
# SSH plumbing
# ──────────────────────────────────────────────────────────────────────────────
SSH_OPTS_ARRAY=(-p "$SSH_PORT" -o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30)
[ -n "$SSH_KEY" ] && SSH_OPTS_ARRAY+=(-i "$SSH_KEY")
SCP_OPTS_ARRAY=(-P "$SSH_PORT")
[ -n "$SSH_KEY" ] && SCP_OPTS_ARRAY+=(-i "$SSH_KEY")
SSH_TTY_ARRAY=()
[ -t 0 ] && SSH_TTY_ARRAY=(-t)

ssh_run() { ssh "${SSH_OPTS_ARRAY[@]}" "$TARGET" "$@"; }

log "Checking SSH connection to $TARGET …"
ssh_run true >/dev/null 2>&1 || die "Cannot SSH to $TARGET. Check the host, port, key and that your public key is authorised."
ok "SSH reachable."

# ──────────────────────────────────────────────────────────────────────────────
# 1. Bootstrap the server (Docker, rsync, firewall) — safe to run every time
# ──────────────────────────────────────────────────────────────────────────────
log "Bootstrapping server (Docker, rsync, firewall)…"
ssh "${SSH_TTY_ARRAY[@]}" "${SSH_OPTS_ARRAY[@]}" "$TARGET" \
	"APP_DIR='$APP_DIR' FIREWALL='$FIREWALL' SSH_PORT='$SSH_PORT' bash -s" <<'BOOTSTRAP'
set -euo pipefail

say() { printf '\033[36m  [server]\033[0m %s\n' "$*"; }
if [ "$(id -u)" -eq 0 ]; then SUDO=""; else SUDO="sudo"; fi

# --- Docker Engine + compose plugin -----------------------------------------
need_docker=0
if ! command -v docker >/dev/null 2>&1; then
	need_docker=1
elif ! docker compose version >/dev/null 2>&1; then
	need_docker=1
fi

if [ "$need_docker" -eq 1 ]; then
	command -v apt-get >/dev/null 2>&1 || {
		echo "Docker is not installed and this is not an apt-based system." >&2
		echo "Install Docker Engine + the compose plugin, then re-run deploy.sh." >&2
		exit 1
	}

	say "Installing Docker Engine (first run only, may take a minute)…"
	export DEBIAN_FRONTEND=noninteractive
	$SUDO apt-get update -qq
	$SUDO apt-get install -y -qq ca-certificates curl rsync

	. /etc/os-release
	case "${ID:-ubuntu}" in
		debian) repo_distro="debian" ;;
		*)      repo_distro="ubuntu" ;;
	esac
	codename="${VERSION_CODENAME:-$(printf '%s' "${VERSION_ID:-}" | tr -d '.')}"

	$SUDO install -m 0755 -d /etc/apt/keyrings
	$SUDO curl -fsSL "https://download.docker.com/linux/${repo_distro}/gpg" -o /etc/apt/keyrings/docker.asc
	$SUDO chmod a+r /etc/apt/keyrings/docker.asc
	printf 'deb [arch=%s signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/%s %s stable\n' \
		"$(dpkg --print-architecture)" "$repo_distro" "$codename" \
		| $SUDO tee /etc/apt/sources.list.d/docker.list >/dev/null

	$SUDO apt-get update -qq
	$SUDO apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
	$SUDO systemctl enable --now docker
else
	# rsync is required for the code sync that follows.
	if ! command -v rsync >/dev/null 2>&1 && command -v apt-get >/dev/null 2>&1; then
		say "Installing rsync…"
		export DEBIAN_FRONTEND=noninteractive
		$SUDO apt-get update -qq && $SUDO apt-get install -y -qq rsync
	fi
fi

# --- docker group (so future logins don't need sudo) -------------------------
if [ "$(id -u)" -ne 0 ]; then
	if ! id -nG "$(id -un)" | tr ' ' '\n' | grep -qx docker; then
		$SUDO usermod -aG docker "$(id -un)"
		say "Added $(id -un) to the docker group (takes effect on your next login)."
	fi
fi

# --- firewall ---------------------------------------------------------------
if [ "$FIREWALL" = "1" ] && command -v ufw >/dev/null 2>&1; then
	$SUDO ufw allow "$SSH_PORT/tcp" >/dev/null 2>&1 || true
	$SUDO ufw allow 80/tcp >/dev/null 2>&1 || true
	$SUDO ufw allow 443/tcp >/dev/null 2>&1 || true
	$SUDO ufw allow 443/udp >/dev/null 2>&1 || true
	if ! $SUDO ufw status 2>/dev/null | grep -q "Status: active"; then
		say "Enabling ufw (22, 80, 443/tcp, 443/udp allowed)…"
		$SUDO ufw --force enable >/dev/null
	fi
fi

mkdir -p "$APP_DIR/data"
command -v rsync >/dev/null 2>&1 || {
	echo "rsync is required on the server for the code sync step." >&2
	echo "Install it with: $SUDO apt-get install -y rsync" >&2
	exit 1
}
say "Docker $(docker --version | sed 's/Docker version //; s/,.*//') ready."
BOOTSTRAP
ok "Server ready."

# ──────────────────────────────────────────────────────────────────────────────
# 2. Sync the code (data/ and .env are excluded, so they survive)
# ──────────────────────────────────────────────────────────────────────────────
log "Syncing code to $TARGET:$APP_DIR …"
RSYNC_RSH="ssh -p $SSH_PORT -o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new"
[ -n "$SSH_KEY" ] && RSYNC_RSH="$RSYNC_RSH -i $SSH_KEY"

rsync -az --delete --human-readable \
	-e "$RSYNC_RSH" \
	--exclude '.git/' \
	--exclude 'node_modules/' \
	--exclude 'dist/' \
	--exclude '.astro/' \
	--exclude '.env' \
	--exclude '.env.local' \
	--exclude '.env.production' \
	--exclude '.env.bak.*' \
	--exclude 'data/' \
	--exclude '*.db' \
	--exclude '.DS_Store' \
	./ "$TARGET:$APP_DIR/"
ok "Code synced."

# ──────────────────────────────────────────────────────────────────────────────
# 3. Provision .env (first deploy) or reuse it (subsequent deploys)
# ──────────────────────────────────────────────────────────────────────────────
umask 077
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/devfolio-deploy.XXXXXX")"
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT
TMP_ENV="$TMP_DIR/env"

get_key() {
	local file="$1" key="$2"
	[ -f "$file" ] || return 0
	awk -v k="$key" '
		BEGIN { q = sprintf("%c", 39) }
		$0 ~ "^[[:space:]]*" k "=" {
			sub("^[[:space:]]*" k "=", "")
			first = substr($0, 1, 1)
			if (first == q || first == "\"") {
				$0 = substr($0, 2)
				i = index($0, first)
				if (i > 0) $0 = substr($0, 1, i - 1)
			} else {
				sub(/[[:space:]]*#.*$/, "")
				sub(/[[:space:]]+$/, "")
			}
			print
			exit
		}
	' "$file"
}

set_key() {
	local file="$1" key="$2" value="$3"
	awk -v k="$key" -v v="$value" '
		BEGIN { q = sprintf("%c", 39); done = 0 }
		$0 ~ "^[[:space:]]*" k "=" {
			if (!done) { print k "=" q v q; done = 1 }
			next
		}
		{ print }
		END { if (!done) print k "=" q v q }
	' "$file" > "$file.tmp"
	mv "$file.tmp" "$file"
}

is_weak_password() {
	case "$1" in
		''|change-me|changeme|dev-cms-password|password|admin|secret) return 0 ;;
	esac
	[ "${#1}" -lt 12 ]
}

random_password() {
	if command -v openssl >/dev/null 2>&1; then
		openssl rand -hex 16
	elif [ -r /dev/urandom ]; then
		od -An -tx1 -N16 /dev/urandom | tr -d ' \n'
	else
		date +%s%N | shasum | cut -c1-32
	fi
}

remote_env_exists=0
if ssh_run "test -f '$APP_DIR/.env'" >/dev/null 2>&1; then
	remote_env_exists=1
fi

NEW_PASSWORD=""
DEPLOY_USER=""
if [ "$remote_env_exists" -eq 0 ] || [ "$RECREATE_ENV" -eq 1 ]; then
	log "Creating .env for production…"
	if [ -f .env ]; then
		cp .env "$TMP_ENV"
	elif [ -f .env.example ]; then
		cp .env.example "$TMP_ENV"
	else
		die "Neither .env nor .env.example exists in the current directory."
	fi

	set_key "$TMP_ENV" SITE "https://$DOMAIN"
	set_key "$TMP_ENV" CADDY_DOMAIN "$DOMAIN"
	set_key "$TMP_ENV" SQLITE_PATH "/app/data/cms.db"

	if [ -n "$CMS_PASSWORD_OVERRIDE" ]; then
		set_key "$TMP_ENV" CMS_PASSWORD "$CMS_PASSWORD_OVERRIDE"
	elif is_weak_password "$(get_key "$TMP_ENV" CMS_PASSWORD)"; then
		NEW_PASSWORD="$(random_password)"
		set_key "$TMP_ENV" CMS_PASSWORD "$NEW_PASSWORD"
	fi

	DEPLOY_USER="$(get_key "$TMP_ENV" CMS_USERNAME)"
	[ -n "$DEPLOY_USER" ] || DEPLOY_USER="admin"

	if [ "$remote_env_exists" -eq 1 ]; then
		backup=".env.bak.$(date +%Y%m%d-%H%M%S)"
		ssh_run "cd '$APP_DIR' && cp -p .env '$backup' && chmod 600 '$backup'"
		warn "Existing .env backed up on the server as $APP_DIR/$backup"
	fi

	scp "${SCP_OPTS_ARRAY[@]}" "$TMP_ENV" "$TARGET:$APP_DIR/.env" >/dev/null
	ssh_run "chmod 600 '$APP_DIR/.env'"
	ok ".env written (mode 600)."
else
	ok "Keeping existing $APP_DIR/.env on the server."
fi

# ──────────────────────────────────────────────────────────────────────────────
# 4. Build + launch + verify
# ──────────────────────────────────────────────────────────────────────────────
log "Building and starting containers…"
ssh "${SSH_TTY_ARRAY[@]}" "${SSH_OPTS_ARRAY[@]}" "$TARGET" \
	"APP_DIR='$APP_DIR' DOMAIN='$DOMAIN' bash -s" <<'REMOTE'
set -euo pipefail
say() { printf '\033[36m  [server]\033[0m %s\n' "$*"; }
cd "$APP_DIR"
[ -f .env ] || { echo "ERROR: .env is missing in $APP_DIR" >&2; exit 1; }

# Pick a docker invocation that works in this session.
if docker info >/dev/null 2>&1; then
	USE_SUDO=0
else
	USE_SUDO=1
fi
dc() { if [ "$USE_SUDO" -eq 1 ]; then sudo docker compose "$@"; else docker compose "$@"; fi; }

# Keep CADDY_DOMAIN in sync if .env predates it.
have_domain="$(sed -n 's/^[[:space:]]*CADDY_DOMAIN=//p' .env | head -n 1 | tr -d "\"'" | sed 's/[[:space:]]*#.*$//' || true)"
if [ -z "$have_domain" ]; then
	printf "\nCADDY_DOMAIN='%s'\n" "$DOMAIN" >> .env
	say "Added CADDY_DOMAIN=$DOMAIN to .env"
elif [ "$have_domain" != "$DOMAIN" ]; then
	say "WARNING: .env has CADDY_DOMAIN='$have_domain' but deploy target is '$DOMAIN'."
	say "         Re-run with --recreate-env if that is wrong."
fi

gtag="$(sed -n 's/^[[:space:]]*PUBLIC_GTAG_MEASUREMENT_ID=//p' .env | head -n 1 | tr -d "\"'" | sed 's/[[:space:]]*#.*$//' || true)"
say "Building image…"
dc build --build-arg "PUBLIC_GTAG_MEASUREMENT_ID=$gtag" app
say "Starting stack…"
dc up -d --remove-orphans --no-build
dc ps

# Wait for both services to report running.
say "Waiting for containers to become healthy…"
running=0
for _ in $(seq 1 45); do
	running="$(dc ps --services --filter status=running 2>/dev/null | wc -l | tr -d ' ')"
	[ "$running" -ge 2 ] && break
	sleep 2
done
if [ "$running" -lt 2 ]; then
	echo "ERROR: containers did not both start. Recent logs:" >&2
	dc ps >&2 || true
	dc logs --tail=50 app caddy >&2 || true
	exit 1
fi
say "Both containers are running."

# Verify HTTPS from the box itself (works even before DNS propagates).
# Caddy may need a few seconds to obtain its certificate on first deploy.
if command -v curl >/dev/null 2>&1; then
	code=""
	for _ in $(seq 1 8); do
		code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 \
			--resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/" || true)"
		case "$code" in
			200|301|302) break ;;
		esac
		sleep 5
	done
	case "$code" in
		200|301|302) say "HTTPS check passed (HTTP $code)." ;;
		*)
			echo "ERROR: HTTPS check for https://$DOMAIN returned '${code:-no response}'." >&2
			echo "  - First deploy: DNS may not point here yet, or Caddy is still issuing the certificate." >&2
			echo "  - Check with: cd $APP_DIR && docker compose logs --tail=60 caddy" >&2
			exit 1
			;;
	esac
else
	say "curl not installed; skipping the HTTPS check."
fi

say "Pruning old images…"
if [ "$USE_SUDO" -eq 1 ]; then sudo docker image prune -f >/dev/null 2>&1 || true; else docker image prune -f >/dev/null 2>&1 || true; fi
REMOTE

# ──────────────────────────────────────────────────────────────────────────────
# Done
# ──────────────────────────────────────────────────────────────────────────────
echo
ok "${BOLD}Deployed${RESET} → https://$DOMAIN"
printf '   %sDashboard%s  https://%s/cms\n' "$DIM" "$RESET" "$DOMAIN"
printf '   %sOn the VPS%s cd %s && docker compose logs -f\n' "$DIM" "$RESET" "$APP_DIR"
if [ -n "$NEW_PASSWORD" ]; then
	echo
	printf '   %sCMS login:%s %s / %s%s%s\n' "$BOLD" "$RESET" "$DEPLOY_USER" "$BOLD$GREEN" "$NEW_PASSWORD" "$RESET"
	printf '   %s(save this now — it is stored only in %s/.env on the server)%s\n' "$DIM" "$APP_DIR" "$RESET"
fi
