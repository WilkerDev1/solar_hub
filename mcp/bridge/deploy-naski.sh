#!/bin/bash
# deploy-naski.sh — Despliega el bridge compilado de Caleb a naski y reinicia PM2
# Ejecutar desde: /home/ishiro/Proyectos/1_Principales/solar-hub/mcp/bridge/
# Uso: bash deploy-naski.sh

set -e

NASKI_HOST="naski"
NASKI_PATH="/home/naski/solar-hub/mcp/bridge"
LOCAL_DIST="$(dirname "$0")/dist"
LOCAL_PKG="$(dirname "$0")/package.json"
LOCAL_LOCK="$(dirname "$0")/package-lock.json"

echo "🔨 [0/5] Compilando localmente..."
npx tsc -p "$(dirname "$0")/../tsconfig.json"
cp "$(dirname "$0")/../run-server.sh" "$(dirname "$0")/../../dist/core/mcp/run-server.sh"
chmod +x "$(dirname "$0")/../../dist/core/mcp/run-server.sh"
npx tsc -p "$(dirname "$0")/tsconfig.json"

echo "🚀 [1/5] Sincronizando dist/ compilado a naski..."
ssh "$NASKI_HOST" "mkdir -p $NASKI_PATH/dist"
rsync -avz --delete "$LOCAL_DIST/" "$NASKI_HOST:$NASKI_PATH/dist/"
ssh "$NASKI_HOST" "mkdir -p /home/naski/solar-hub/dist/core"
rsync -avz --delete "$(dirname "$0")/../../dist/core/" "$NASKI_HOST:/home/naski/solar-hub/dist/core/"

echo "📦 [2/5] Sincronizando package.json..."
rsync -avz "$LOCAL_PKG" "$NASKI_HOST:$NASKI_PATH/"
rsync -avz "$LOCAL_LOCK" "$NASKI_HOST:$NASKI_PATH/"

echo "🔑 [3/5] Creando .env en naski con las keys de Supabase..."
# IMPORTANTE: Aquí van las keys de desarrollo/producción de Supabase.
# Usamos el hostname archlinux para conectar con la máquina local desde naski vía Tailscale.
ssh "$NASKI_HOST" "cat > $NASKI_PATH/.env << 'ENVEOF'
NEXT_PUBLIC_SUPABASE_URL=http://archlinux:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE
ENVEOF
chmod 600 $NASKI_PATH/.env"

echo "📥 [4/5] Instalando dependencias en naski..."
ssh "$NASKI_HOST" "cd $NASKI_PATH && npm install --production 2>&1"

echo "♻️  [5/5] Reiniciando PM2 (caleb-api-bridge)..."
ssh "$NASKI_HOST" "npx pm2 delete caleb-api-bridge 2>/dev/null || true; npx pm2 start $NASKI_PATH/dist/index.js --name caleb-api-bridge && npx pm2 save"

echo ""
echo "✅ Deploy completado. Verificando estado PM2..."
ssh "$NASKI_HOST" "npx pm2 show caleb-api-bridge 2>&1 | head -20"

echo ""
echo "🧪 Test rápido (curl al bridge vía Caddy)..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" \
  -X POST http://caleb.ishiro-art.com/api/caleb \
  -H "Authorization: Bearer 1130_secret_caleb_bridge_token" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"ping","userJwt":"test"}' || echo "⚠️  curl falló (normal si la URL aún no resuelve)"
