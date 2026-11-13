#!/usr/bin/env bash
# Acceso al dev server desde el celular usando Cloudflare Quick Tunnel.
#
# Uso:
#   npm run dev:phone            # dev completo (WhatsApp + workers)
#   DEV_SCRIPT=dev:fast npm run dev:phone   # sin WhatsApp ni workers
#
# Requisitos: cloudflared instalado en el PATH y PostgreSQL arriba (ver docs/dev-acceso-celular.md).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-3001}"
DEV_SCRIPT="${DEV_SCRIPT:-dev}"
LOG_DIR="${TMPDIR:-/tmp}/liveflow-dev-phone"
SERVER_LOG="$LOG_DIR/server.log"
TUNNEL_LOG="$LOG_DIR/tunnel.log"

mkdir -p "$LOG_DIR"

SERVER_PID=""
TUNNEL_PID=""

cleanup() {
  local code=$?
  trap - INT TERM EXIT
  echo ""
  echo "[dev:phone] Cerrando túnel y dev server..."
  if [ -n "$TUNNEL_PID" ]; then kill "$TUNNEL_PID" 2>/dev/null || true; fi
  if [ -n "$SERVER_PID" ]; then kill -- -"$SERVER_PID" 2>/dev/null || kill "$SERVER_PID" 2>/dev/null || true; fi
  wait 2>/dev/null || true
  exit "$code"
}
trap cleanup INT TERM EXIT

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "[dev:phone] ERROR: cloudflared no está instalado." >&2
  echo "  Instalación rápida:" >&2
  echo "  mkdir -p ~/.local/bin && curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o ~/.local/bin/cloudflared && chmod +x ~/.local/bin/cloudflared" >&2
  exit 1
fi

if ! timeout 2 bash -c "cat < /dev/null > /dev/tcp/127.0.0.1/5432" 2>/dev/null; then
  echo "[dev:phone] AVISO: no responde PostgreSQL en 127.0.0.1:5432."
  echo "            El sistema va a abrir, pero el login y los datos van a fallar."
  echo "            Levantá Postgres antes de probar desde el celu."
  echo ""
fi

echo "[dev:phone] Arrancando 'npm run $DEV_SCRIPT' (log: $SERVER_LOG)"
setsid npm run "$DEV_SCRIPT" >"$SERVER_LOG" 2>&1 &
SERVER_PID=$!

echo -n "[dev:phone] Esperando el puerto $PORT"
READY=""
for _ in $(seq 1 120); do
  if timeout 1 bash -c "cat < /dev/null > /dev/tcp/127.0.0.1/$PORT" 2>/dev/null; then
    READY="1"
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo ""
    echo "[dev:phone] El dev server terminó. Últimas líneas del log:" >&2
    tail -n 30 "$SERVER_LOG" >&2
    exit 1
  fi
  echo -n "."
  sleep 1
done

if [ -z "$READY" ]; then
  echo ""
  echo "[dev:phone] Timeout esperando el puerto $PORT. Log:" >&2
  tail -n 30 "$SERVER_LOG" >&2
  exit 1
fi
echo " OK"

echo "[dev:phone] Abriendo túnel Cloudflare (log: $TUNNEL_LOG)"
cloudflared tunnel --url "http://localhost:$PORT" --no-autoupdate >"$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!

URL=""
for _ in $(seq 1 60); do
  URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" | head -n 1 || true)"
  if [ -n "$URL" ]; then break; fi
  if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
    echo "[dev:phone] El túnel terminó. Log:" >&2
    tail -n 30 "$TUNNEL_LOG" >&2
    exit 1
  fi
  sleep 1
done

if [ -z "$URL" ]; then
  echo "[dev:phone] No se pudo leer la URL del túnel. Log:" >&2
  tail -n 30 "$TUNNEL_LOG" >&2
  exit 1
fi

echo ""
echo "================================================================"
echo "  Abrí esto desde el celular:"
echo ""
echo "  $URL"
echo ""
echo "  (Ctrl+C para cortar el túnel y el dev server)"
echo "================================================================"
echo ""

node -e 'require("qrcode-terminal").generate(process.argv[1], { small: true })' "$URL" 2>/dev/null || true

# La primera vez Cloudflare tarda unos segundos en publicar el DNS y WSL
# puede tener el resolver en caché. Se reinteta sin cortar el proceso.
echo -n "[dev:phone] Verificando la URL"
HTTP_CODE=""
CURL_EXIT=0
for _ in $(seq 1 30); do
  HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' -m 10 "$URL" 2>/dev/null)" || CURL_EXIT=$?
  case "$HTTP_CODE" in
    200|307|308) break ;;
  esac
  echo -n "."
  sleep 2
done
echo " ${HTTP_CODE:-sin respuesta}"
echo ""

if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "307" ] && [ "$HTTP_CODE" != "308" ]; then
  if [ "$CURL_EXIT" = "6" ]; then
    echo "[dev:phone] La compu todavía no resuelve el DNS del túnel (pasa en WSL)." >&2
    echo "            Probá abrir la URL desde el celu igual: el DNS del teléfono es otro." >&2
  else
    echo "[dev:phone] La URL respondió ${HTTP_CODE:-sin respuesta}. Revisá $TUNNEL_LOG y $SERVER_LOG." >&2
  fi
fi
echo ""

wait "$SERVER_PID"
