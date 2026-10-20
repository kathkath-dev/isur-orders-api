#!/usr/bin/env sh
# Respaldo lógico de PostgreSQL antes de un despliegue.
# Uso (en el servidor): ./scripts/backup.sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-compose.prod.yaml}"
ENV_FILE="${ENV_FILE:-.env.prod}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date +%Y%m%d_%H%M%S)"

# Carga POSTGRES_USER y POSTGRES_DB desde el archivo de entorno
set -a
. "$ENV_FILE"
set +a

mkdir -p "$BACKUP_DIR"
OUT="$BACKUP_DIR/isur_orders_$STAMP.sql.gz"

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner | gzip > "$OUT"

echo "Backup generado: $OUT"
