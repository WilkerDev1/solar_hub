# Guía de Despliegue en el Servidor Naski

Esta guía detalla la infraestructura y los flujos de despliegue para la web frontend y los servicios backend (API Bridge y Servidor MCP) de **Solar Hub** en el servidor de producción **Naski**.

---

## 🏛️ Resumen de la Arquitectura de Despliegue

La infraestructura en **Naski** está optimizada para consumir el mínimo de recursos y garantizar alta disponibilidad:

1. **Frontend (Web):** Exportación 100% estática (`next build` / `out/`) servida directamente por **Caddy**. No hay ningún proceso Node.js corriendo continuamente para la web, logrando uso de RAM de ~0%.
2. **Backend (Caleb API Bridge):** Un servidor Express en Node.js que orquesta las llamadas al modelo de IA y las herramientas MCP. Se ejecuta como un proceso daemonizado administrado por **PM2** (`caleb-api-bridge`).
3. **Servidor MCP:** El servidor de protocolo (Model Context Protocol) local de herramientas que interactúa con la base de datos y archivos físicos, utilizado de forma transparente por Caleb.

---

## 💻 1. Despliegue del Frontend (Web Estática)

El frontend se compila localmente en la máquina del desarrollador para evitar problemas de falta de memoria (Out-of-Memory / OOM) en el servidor y luego se sincroniza mediante `rsync`.

### Script de Despliegue: [deploy-web.sh](file:///home/ishiro/.gemini/antigravity-ide/scratch/solar_hub/deploy-web.sh)

### Pasos Ejecutados de Forma Automática:
1. **Compilación local:** Corre `npm run build` (que ejecuta `next build` exportando la carpeta estática `out/`).
2. **Sincronización:** Crea el directorio `/home/naski/solar-hub` en el servidor si no existe.
3. **rsync seguro:** Sincroniza la carpeta local `out/` con `/home/naski/solar-hub/out/`, borrando los archivos antiguos del servidor que ya no existan en local.

### Ejecución Manual:
```bash
# Desde la raíz del proyecto
bash deploy-web.sh
```

---

## ⚙️ 2. Despliegue del Backend (Caleb API Bridge)

El API Bridge se compila localmente en TypeScript y se sube a Naski, instalando allí únicamente las dependencias de producción y reiniciando el servicio en PM2.

### Script de Despliegue: [deploy-naski.sh](file:///home/ishiro/.gemini/antigravity-ide/scratch/solar_hub/mcp/bridge/deploy-naski.sh)

### Pasos Ejecutados de Forma Automática:
1. **Compilación local:** Compila los archivos TypeScript tanto del servidor MCP global como del bridge local (`npx tsc`).
2. **Sincronización de código:** Sube mediante `rsync` la carpeta compilada `dist/` a `/home/naski/solar-hub/mcp/bridge/dist/` y `/home/naski/solar-hub/dist/core/`.
3. **Sincronización de package.json:** Sube los archivos de dependencias.
4. **Generación automática de variables de entorno (.env):** Lee las claves activas de Supabase de tu `.env.local` local y genera dinámicamente un archivo `.env` seguro en el servidor remoto `/home/naski/solar-hub/mcp/bridge/.env` con permisos restringidos (`600`).
5. **Instalación remota:** Instala solo las dependencias de producción en Naski (`npm install --production`).
6. **Reinicio de PM2:** Detiene e inicia de nuevo el proceso PM2 `caleb-api-bridge` guardando la configuración para persistir en caso de reinicio de la máquina.

### Ejecución Manual:
```bash
# Moverse al directorio del bridge
cd mcp/bridge
bash deploy-naski.sh
```

---

## 🚦 3. Verificación de Estado y Logs en el Servidor

Para revisar que el backend esté operando correctamente en Naski, conéctate vía SSH y ejecuta los siguientes comandos de diagnóstico:

### Estado de PM2:
```bash
# Mostrar tabla de procesos activos
npx pm2 status

# Ficha técnica del proceso
npx pm2 show caleb-api-bridge
```

### Monitoreo en Tiempo Real:
```bash
# Ver consola interactiva de logs y consumo de CPU/RAM
npx pm2 monit

# Ver los logs del API Bridge
npx pm2 logs caleb-api-bridge
```

---

## 🌐 4. Configuración de Caddy (Servidor Web)

Caddy está configurado en el servidor para servir el frontend de forma estática y enrutar las llamadas de Caleb. Un fragmento típico de configuración (`Caddyfile`):

```caddy
# Servir la Web estática de Solar Hub
solarhubweb.com, www.solarhubweb.com {
    root * /home/naski/solar-hub/out
    file_server
    
    # Soporte para Clean URLs (Next.js static export)
    try_files {path} {path}.html {path}/ =404
    
    # Compresión Gzip/Zstd activa
    encode zstd gzip
}

# Proxy reverso para el API Bridge de Caleb
caleb.ishiro-art.com {
    reverse_proxy localhost:3000
}
```
