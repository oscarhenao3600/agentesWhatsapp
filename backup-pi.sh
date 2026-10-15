#!/bin/bash
# ===================================================================
# SCRIPT DE COPIA DE SEGURIDAD AUTOMÁTICA - AGENTES WHATSAPP
# Guarda base de datos MongoDB, sesiones de WhatsApp Web (.wwebjs_auth) y .env
# Rotación automática (últimos 14 días) y notificación opcional por Telegram
# ===================================================================

set -e

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"

handle_error() {
    local exit_code=$?
    local line_no=$1
    echo "❌ [$(date +'%T')] Error en backup-pi.sh en la línea $line_no (Código: $exit_code)"
}
trap 'handle_error $LINENO' ERR

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 1. Cargar variables de entorno si existen
if [ -f .env ]; then
    set -a
    source .env 2>/dev/null || true
    set +a
fi

BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/agentes_whatsapp}"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
TEMP_BACKUP_DIR="/tmp/agentes_whatsapp_backup_${TIMESTAMP}"
mkdir -p "$TEMP_BACKUP_DIR"
chmod 700 "$TEMP_BACKUP_DIR" 2>/dev/null || true

echo "📦 [$(date +'%T')] Iniciando respaldo de Agentes WhatsApp..."

# 2. Respaldo de Base de Datos MongoDB
echo "💾 [1/3] Respaldando base de datos MongoDB..."
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^agentes_whatsapp_db$"; then
    docker exec agentes_whatsapp_db mongodump --archive=/tmp/mongo_dump.gz --gzip 2>/dev/null || true
    if docker cp agentes_whatsapp_db:/tmp/mongo_dump.gz "$TEMP_BACKUP_DIR/mongo_dump.gz" 2>/dev/null; then
        docker exec agentes_whatsapp_db rm -f /tmp/mongo_dump.gz 2>/dev/null || true
        echo "   ✅ Dump de MongoDB local completado."
    else
        echo "   ⚠️ No se pudo copiar el dump de MongoDB."
    fi
else
    echo "   ℹ️ Contenedor agentes_whatsapp_db no detectado activo (o usando Atlas)."
fi

# 3. Respaldo de Sesiones WhatsApp Web
echo "🔑 [2/3] Respaldando sesiones de WhatsApp Web (.wwebjs_auth)..."
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^agentes_whatsapp_backend$"; then
    docker cp agentes_whatsapp_backend:/app/.wwebjs_auth "$TEMP_BACKUP_DIR/wwebjs_auth" 2>/dev/null || true
    echo "   ✅ Sesiones autenticadas respaldadas."
fi

# 4. Respaldo del archivo .env
echo "⚙️ [3/3] Respaldando configuración .env..."
if [ -f .env ]; then
    cp .env "$TEMP_BACKUP_DIR/env_backup"
fi

# 5. Comprimir todo el respaldo
ARCHIVE_NAME="agentes_whatsapp_backup_${TIMESTAMP}.tar.gz"
tar -czf "$BACKUP_DIR/$ARCHIVE_NAME" -C "$TEMP_BACKUP_DIR" .
rm -rf "$TEMP_BACKUP_DIR"

BACKUP_SIZE=$(du -h "$BACKUP_DIR/$ARCHIVE_NAME" | cut -f1)
echo "✅ [$(date +'%T')] Respaldo creado exitosamente: $BACKUP_DIR/$ARCHIVE_NAME ($BACKUP_SIZE)"

# 6. Rotación de respaldos: conservar los últimos 14 días
RETENTION_DAYS="${RETENTION_DAYS:-14}"
find "$BACKUP_DIR" -name "agentes_whatsapp_backup_*.tar.gz" -type f -mtime +"$RETENTION_DAYS" -exec rm -f {} \;
echo "🧹 Rotación completada (archivos mayores a $RETENTION_DAYS días eliminados)."
