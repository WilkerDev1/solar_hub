#!/bin/bash
# deploy-web.sh — Despliega la web estática de Solar Hub a naski
# Uso: bash deploy-web.sh

set -e

NASKI_HOST="naski"
NASKI_PATH="/home/naski/solar-hub"
LOCAL_DIR="$(dirname "$0")"

echo "🔨 [1/3] Compilando la web localmente (Exportación Estática)..."
npm run build

echo "🚀 [2/3] Sincronizando la carpeta compilada 'out/' a naski..."
ssh "$NASKI_HOST" "mkdir -p $NASKI_PATH"
rsync -avz --delete "$LOCAL_DIR/out/" "$NASKI_HOST:$NASKI_PATH/out/"

echo "✅ [3/3] ¡Despliegue completado con éxito! Caddy servirá los archivos estáticos."
