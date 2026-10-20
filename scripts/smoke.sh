#!/usr/bin/env sh
# Smoke test posterior al despliegue: verifica readiness y versión.
# Uso: ./scripts/smoke.sh [URL_BASE]
set -eu

BASE_URL="${1:-http://localhost:3000}"
RETRIES=10

echo "Smoke test contra $BASE_URL"

i=1
until curl -fsS "$BASE_URL/health/ready" > /dev/null; do
  if [ "$i" -ge "$RETRIES" ]; then
    echo "FALLO: /health/ready no respondió después de $RETRIES intentos"
    exit 1
  fi
  echo "Esperando readiness (intento $i/$RETRIES)..."
  i=$((i + 1))
  sleep 3
done

echo "OK /health/ready: $(curl -fsS "$BASE_URL/health/ready")"
echo "OK /version:      $(curl -fsS "$BASE_URL/version")"
echo "Smoke test superado"
