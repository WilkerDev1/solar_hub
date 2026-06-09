# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo. El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto se adhiere a la versión semántica.

---

## [2.0.0] - 2026-06-09

### Añadido
- Nueva tabla `projects` en base de datos PostgreSQL de Supabase con relaciones a `clients` y políticas RLS.
- Columnas `category`, `avg_kwh_consumption` y `gps_coordinates` en la tabla `clients`.
- Archivos de migración de base de datos en `/supabase/migrations`:
  - `20260609000200_clients_expansion.sql`
- Vista detallada del perfil del cliente `/clients/[id]` que agrupa metadatos técnicos y proyectos asociados.
- Ruta administrativa para gestión de usuarios e interactividad RBAC en `/admin/users`.
- Integración de `@base-ui/react` para resolver la interactividad reactiva en menús contextuales y modales dialog.
- Estructura formal de documentación del repositorio de conocimiento en `/docs`.

### Modificado
- `DashboardShell` refactorizado para soportar navegación fluida y preservar la barra lateral izquierda en sub-rutas dinámicas.
- Tipos de TypeScript regenerados automáticamente en `src/core/database/types.ts`.

---

## [1.0.0] - 2026-06-09

### Añadido
- Arquitectura de directorios Next.js basada en módulos funcionales (`src/modules`) y componentes transversales (`src/core`).
- Configuración de Supabase local mediante CLI y docker containers.
- Migración `20260609000100_clients_schema.sql` conteniendo el trigger automático `on_auth_user_created` para aprovisionar perfiles y organizaciones por defecto.
- Layout responsive inspirado en Orion con soporte de Sidebar colapsable y componentes adaptados para técnicos de campo (alto contraste, zonas táctiles de al menos `h-12`).
- Contexto de Autenticación `AuthContext.tsx` y wrapper de autorización basada en permisos declarativos `<RequirePermission>`.
- Módulo de clientes CRM en `/clients` implementando rejilla de datos en PC y vista de tarjetas de campo en móvil.
- Datos de semilla iniciales para compañías, perfiles, roles y permisos de prueba.
