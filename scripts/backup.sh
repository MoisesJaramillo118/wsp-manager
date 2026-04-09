#!/bin/bash
# Backup diario de la base de datos
# Ejecutar con cron: 0 2 * * * /ruta/wsp-manager/scripts/backup.sh

DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$DIR/backups"
DB_PATH="$DIR/backend/data/whatsapp.db"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

if [ -f "$DB_PATH" ]; then
  cp "$DB_PATH" "$BACKUP_DIR/whatsapp_${DATE}.db"
  echo "[Backup] $DATE - OK"

  # Mantener solo los ultimos 30 backups
  ls -t "$BACKUP_DIR"/whatsapp_*.db 2>/dev/null | tail -n +31 | xargs -r rm
  echo "[Backup] Limpieza de backups antiguos completada"
else
  echo "[Backup] ERROR: DB no encontrada en $DB_PATH"
fi
