# Changelog

# Changelog de Solar Hub

## [v11.0.0] - 2026-06-20 (Sprint 11)
### Añadido
- **Manejadores CRUD de Tareas en Servidor MCP**: Casos para `create_task`, `update_task` y `delete_task` implementados en `src/core/mcp/server.ts` con soporte RLS completo.
- **Historial IA / Bitácora Behalf-Of**: Flujo dinámico de auditoría que guarda cambios e hitos en `task_activities`. Soporte para marcar tareas completadas a nombre de colaboradores de la empresa (`completedOnBehalfOf`).
- **Prevención de fugas en API Bridge**: Mecanismo `res.on('close')` y safety timeout de 45 segundos para limpiar y finalizar procesos Hermes zombies en `naski`.
- **Integración de Chat Terminal**: Panel de chat estilo cyberpunk/Notion (`src/modules/caleb/page.tsx`) conectado a través de proxy local (`src/app/api/caleb/route.ts`).

## [v10.0.0] - 2026-06-20 (Sprint 10)
### Añadido
- **Consola de Inventario Orion**: Dashboard administrativo de control de stock (`src/modules/inventory/page.tsx`) con widgets de métricas analíticas en tiempo real (Items totales, Stock Crítico, Top Material, Valor Estimado).
- **Vista de Ajuste Masivo ("Modo Almacén")**: Conciliación local masiva de stock y guardado atómico mediante la función RPC `process_inventory_transactions`.
- **Módulo de Materiales de Obra (BOM)**: Nueva pestaña "Materiales / Almacén" en el detalle de la obra (`src/modules/projects/[id]/page.tsx`) con control de cantidad Requerida vs En Sitio y estados de stock (`COMPLETO`, `PARCIAL`, `FALTANTE`).
- **Despacho Central e Historial**: Panel de "Buscar en Inventario Global" en la obra para añadir requisitos en caliente y realizar remisiones/despachos atómicos con número de guía.
- **Auditoría de Despachos**: Rejilla de últimos despachos ("Últimos Despachos") y línea de tiempo ("Log de Movimientos") cronológica en la obra.
- **Exportación BOM**: Función de descarga CSV de la Lista de Materiales asignada a la obra.

## [v9.0.0] - 2026-06-19 (Sprint 9)
### Añadido
- **Caja de Check Interactiva**: Implementación de una caja de check en tareas tipo `check` para cambiar su estado reactivamente entre `pendiente` y `completada` desde la vista Kanban y la vista de Lista.
- **Participantes Múltiples**: Soporte para asignación y modificación de múltiples colaboradores en una tarea (`assigned_to_ids` array de UUID) y visualización en forma de pila de avatares (avatar stack).
- **Gestión de Miembros de Proyecto**: Edición de equipo colaborador por proyecto (`member_ids` array de UUID) mediante el engranaje ⚙️ de configuraciones de obra, restringiendo la selección en la creación de tareas asociadas.
- **Línea de Actividad General del Proyecto**: Nueva pestaña en la vista del proyecto para auditar cronológicamente las acciones de todos los integrantes en las tareas, filterable por miembro.

### Modificado
- **Proporciones de Kanban**: Homogeneización de la altura de columnas a `h-[620px]` con scroll vertical independiente `overflow-y-auto min-h-0` en el tablero global y de proyecto.
- **Actividad de la Tarea**: El panel de "Mi Trabajo" en el Drawer de detalle de la tarea ahora es "Actividad de la Tarea", consolidando las acciones de todos los asignados.

## [v8.0.0] - 2026-06-15 (Sprint 8)
### Añadido
- **Cajón de Detalle Notion-style (`TaskDetailDrawer.tsx`)**: Un panel lateral interactivo con pestañas para gestionar asignaciones secundarias (subtareas), chat interno por tarea, registro de actividad auditada para "Mi Trabajo", materiales requeridos y carga de entregables de evidencia.
- **Vista de Calendario y Agenda Mensual**: Nueva rejilla mensual interactiva adaptada tanto para la consola de tareas global como para el tablero interno de proyectos.
- **Auditoría de Requisitos y Materiales**: Panel de control interactivo para que líderes autoricen o rechacen en caliente los insumos técnicos de almacén asignados a tareas.
- **Vista de Archivos y Evidencias**: Tablero centralizado de archivos asociados a obras con filtros avanzados por extensión y áreas operativas (Legal, Operaciones, Almacén, etc.).
- **Ficha Técnica Comercial (Overview) y Configuración**: Añadido banner personalizable, descripción detallada y vinculación de clientes, editable desde un botón de engranaje (⚙️) con controles reactivos.
- **Visualización de Banner en Tarjetas de Proyectos**: Las tarjetas de proyectos en la vista general ahora incluyen la visualización en tiempo real de la imagen principal/banner de cada obra, con soporte de micro-animaciones en escala y un gradiente HSL por defecto.
- **Migración de Base de Datos `sprint7_matured_tasks`**: Extensión de columnas de metadatos prioritarios (`priority`, `due_date`, `tags`, JSONB para sub-módulos) y datos de settings del proyecto.

## [v7.0.0] - 2026-06-10 (Sprint 7)
### Añadido
- **Tablero Kanban (Drag & Drop)**: Instalación de `@hello-pangea/dnd` para implementar una vista Kanban interactiva en los Detalles del Proyecto, permitiendo a los usuarios mover tareas entre columnas (Pendiente, En Progreso, Completado).
- **Layout de Panel Dividido (Split Pane)**: Se reemplazó el antiguo sistema de "Tabs" por un entorno de alta densidad inspirado en CRMs, compuesto por un Main View flexible y una barra lateral derecha (Sidebar) persistente o colapsable.
- **Chat de Actividad Continuo**: El hilo de mensajes del proyecto (`project_messages`) ya no se esconde tras una pestaña. Ahora vive en el Sidebar derecho en formato "Línea de tiempo" para dar seguimiento sin perder de vista el progreso de las tareas.
- **Banner Superior de Metadatos**: Integración de tarjetas tipo widget en el encabezado del proyecto que reportan, a simple vista, la Fase, GPS, Capacidad Energética y Estado general.

### Modificado
- **Arquitectura UI de Detalles**: `src/modules/projects/[id]/page.tsx` fue totalmente reestructurado con flexbox avanzado, manteniendo el tipado estricto e interconectando el módulo en tiempo real a Supabase (WebSockets).


## [v6.0.0] - 2026-06-10 (Sprint 6)
### Añadido
- **Componentes Nativos (Shadcn UI)**: Se incorporó `@radix-ui/react-tabs` para reescribir y estandarizar la ventana de Detalles del Proyecto (`/projects/[id]`).
- **Filtrado Avanzado (Dashboard de Proyectos)**: Los usuarios pueden ahora buscar proyectos por nombre mediante input textual y filtrar exhaustivamente por Fase (Diseño, Permisos, Construcción, etc.) y Estado (Completado, Demorado, etc.).
- **CRUD de Proyectos**: Botonera flotante (Kebab menu `<DropdownMenu>`) que inyecta opciones para Archivar o Eliminar proyectos masivamente.
- **Botón de Nuevo Proyecto**: Incorporado un modal (`<Dialog>`) que permite dar de alta nuevas obras asincrónicamente.
- **Persistencia Segura (SQL)**: Se habilitó la regla de integridad `ON DELETE CASCADE` en las llaves foráneas de `global_tasks` y `project_messages`. Al eliminar un proyecto en la consola, se erradican todas sus tareas y chats huérfanos sin quebrar el entorno.

### Modificado
- **Enrutamiento Principal**: El botón de "Tareas" en la tarjeta de los proyectos en la pantalla principal fue rebautizado a "Detalles" y redirigido exitosamente al Centro de Mando del Proyecto individual (`/projects/[id]`).

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
