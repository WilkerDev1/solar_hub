# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo. El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto se adhiere a la versión semántica.

---

## [5.0.0] - 2026-06-10

### Añadido
- **Persistencia Nativa**: Inserción directa de cuentas en la tabla de auth interna de Supabase usando el módulo `pgcrypto` para los entornos de desarrollo, garantizando que no se pierdan los perfiles (`admin@solarhub.com`) tras un reset local.
- **Centro de Mando de Proyectos**: La vista de Detalles del Proyecto (`/projects/[id]`) fue transformada en una interfaz modular de pestañas (Detalles, Tareas, Chat).
- **Mini-Chat de Proyecto (Realtime)**: Nueva tabla `project_messages` con suscripción nativa a WebSockets para chatear entre involucrados en la obra de forma interactiva y reactiva.
- **Auditoría de Entregables**: Funcionalidades de aprobación/denegación/revisión para tareas de área de `reporte` o `evidencia`, visibles sólo para perfiles `admin:*`.
- **RBAC Customizado en Cliente**: El panel de Datos & Sistema permite crear desde cero nuevas plantillas de roles inyectando un nombre y las facultades requeridas, propagando automáticamente los accesos mediante un trigger de base de datos.
- Subida de archivos mock/preparatoria conectada a `supabase.storage` en la capa de servicios API-First (`uploadTaskEvidence`).

---

## [4.0.0] - 2026-06-10

### Añadido
- Nuevo motor de tareas relacionales con tabla `global_tasks` en base de datos PostgreSQL, soportando tareas de tipo "check" y "entregable".
- Tabla `role_permissions_templates` para gestionar plantillas de rol en caliente.
- Triggers PL/pgSQL en Supabase para sincronizar automáticamente plantillas de rol con la asignación física de `roles` y `role_permissions`.
- Nueva vista `/tasks` para que los usuarios gestionen sus tareas personales, con un botón táctil de 48px optimizado para campo ("Ir al Proyecto").
- Nuevo componente Combobox inteligente en el diálogo de añadir proyecto para autocompletar clientes con creación inline integrada ("Crear nuevo cliente").
- Endpoint `/api/admin/reset-password` para restablecer contraseñas de empleados.
- Autocompletado mediante `datalist` con sugerencias de ocupaciones históricas reales para la edición de empleados en la Consola Orion.
- Tarjetas de Producción e Inventario en Orion vinculadas reactivamente a pestañas específicas del shell.

### Modificado
- API Routes `/api/admin/create-employee` y `/api/admin/reset-password` ahora exigen y validan cabecera `Authorization: Bearer <token>`, comprobando rol Administrador.
- Vista de proyectos (`/projects`) para mostrar contador dinámico de tareas y estado de entregables en lugar de hitos/planos estáticos.
- Seccion "Datos & Sistema" en la Consola Orion para editar plantillas de permisos en caliente con guardado reactivo.

## [3.0.0] - 2026-06-10

### Añadido
- Nueva API Route `/api/admin/create-employee` para el aprovisionamiento seguro de usuarios utilizando `supabase.auth.admin.createUser` con la `service_role_key`.
- Columnas `occupation` (`text[]`) y `is_active` (`boolean`) en la tabla `profiles` en base de datos.
- Columna `gps_coordinates` (`text`) en la tabla `projects` en base de datos.
- Diálogo modal de creación de proyectos directamente desde la vista del expediente de cliente (`/clients/[id]`).
- Panel completo de CRUD para administración de empleados en `/admin/users`, con filtros de estado y edición en caliente.

### Modificado
- Columna `document_id` de la tabla `clients` modificada a opcional (nullable).
- Formulario de creación rápida de clientes simplificado para exigir únicamente el campo **Nombre**.
- Vista de expediente de cliente `/clients/[id]` ahora es editable en caliente, permitiendo actualizar todos los metadatos técnicos.
- La geolocalización GPS (`gps_coordinates`) se trasladó de clientes a proyectos (obras).
- Consola Orion (`/admin`) actualizada con consultas reactivas reales de Supabase (`COUNT`) en lugar de datos estáticos.

### Eliminado
- Columna `gps_coordinates` de la tabla `clients`.

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
