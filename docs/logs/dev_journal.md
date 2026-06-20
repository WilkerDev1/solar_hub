# Diario de Desarrollo - Decisiones de Ingeniería y Notas Técnicas

Registro de decisiones técnicas tomadas durante el desarrollo de Solar Hub, incluyendo soluciones a problemas de librerías externas y patrones de diseño.

---

## 1. Integración de Componentes Dialog con `@base-ui/react`

### Problema
Durante el desarrollo del editor RBAC en `/admin/users`, intentamos utilizar componentes modales comunes de `shadcn/ui` y `@radix-ui/react-dialog`. Sin embargo, la biblioteca instalada en el proyecto para modales y menús es `@base-ui/react`.
Intentar usar la sintaxis tradicional de Radix UI:
```tsx
<Dialog.Trigger asChild>
  <Button>Editar</Button>
</Dialog.Trigger>
```
resultaba en un error de compilación estricta de TypeScript porque `@base-ui/react` no expone la propiedad `asChild`, sino que requiere el patrón de renderizado mediante la propiedad `render`:
```tsx
<Dialog.Trigger render={<Button />}>
  Editar
</Dialog.Trigger>
```

### Solución Implementada
Todos los componentes interactivos de diálogos (`Dialog.Trigger`, `Dialog.Close`, etc.) se adaptaron para usar la propiedad `render` y pasar el elemento React correspondiente directamente. Esto solucionó los errores de compilación y garantizó la plena compatibilidad con TypeScript.

---

## 2. Inserciones Masivas en Postgres (PL/pgSQL Seed Triggers)

### Problema
Al escribir las migraciones SQL de Supabase y poblar los datos semilla en la base de datos local, ejecutar un script bulk de tipo:
```sql
INSERT INTO table (...) VALUES (...) RETURNING id INTO local_variable;
```
provocaba un fallo de ejecución en Postgres si se insertaban múltiples registros simultáneamente, dado que `RETURNING ... INTO` en variables escalares solo soporta el retorno de una única fila.

### Solución Implementada
Se modificó el seeding para realizar las inserciones una a una de manera imperativa en los bloques anónimos de PL/pgSQL, almacenando la ID del perfil y de la compañía en variables individuales para asociar correctamente las claves foráneas en las tablas hijas (`user_roles`, `role_permissions`).

---

## 3. Arquitectura Next.js: Shell de Navegación vs. Rutas Internas

### Problema
Inicialmente, al navegar a rutas internas como `/clients` o `/admin`, la página Next.js se recargaba por completo, perdiendo temporalmente el estado local del Sidebar y forzando la re-evaluación del Contexto de Autenticación de Supabase, lo que causaba un molesto "parpadeo" de la interfaz.

### Solución Implementada
Se modularizó el `DashboardShell` de la raíz (`src/app/page.tsx`) para actuar como un layout shell real que acepta un prop `children`. De esta manera, el layout transversal envuelve las sub-páginas a través de los layouts de Next.js, preservando el estado de la barra lateral, el multi-tenant y la sesión del usuario durante la navegación.

---

## 4. Aprovisionamiento Seguro de Usuarios con Next.js API Routes

### Problema
Para registrar nuevos empleados en la base de datos de Supabase, es necesario usar la API de administración de Supabase Auth (`supabase.auth.admin.createUser`). Esta API requiere privilegios de `service_role`, cuya clave jamás debe exponerse en el cliente web debido a riesgos críticos de seguridad (permite saltarse todas las políticas de RLS).

### Solución Implementada
Se implementó una API Route de Next.js en `src/app/api/admin/create-employee/route.ts` que se ejecuta exclusivamente en el servidor. Esta ruta lee la clave `SUPABASE_SERVICE_ROLE_KEY` del entorno seguro, inicializa un cliente administrativo de Supabase y realiza la creación del usuario Auth. Adicionalmente, se valida que la sesión del usuario que solicita la creación sea de un Administrador (`roleId` de Administrador) para evitar escalado de privilegios.

---

## 5. Reubicación de Geolocalización a Obras (Proyectos) y Flexibilización de CRM

### Problema
La geolocalización por coordenadas GPS estaba previamente asociada al perfil de cliente. Sin embargo, en el mundo real, un mismo cliente (por ejemplo, una empresa comercial o industrial) puede encargar múltiples proyectos solares en diferentes ubicaciones geográficas. Asimismo, el formulario de creación de clientes requería demasiados campos iniciales obligatorios, dificultando el registro rápido de prospectos.

### Solución Implementada
Se realizó una migración incremental que eliminó `gps_coordinates` de la tabla `clients` y la incorporó a la tabla `projects`. Además, se modificó `document_id` en la tabla `clients` para ser nullable. En la interfaz de usuario, el modal de creación de cliente se simplificó para solicitar únicamente el nombre del cliente, y se expandió la página `/clients/[id]` para permitir actualizar el expediente de forma detallada y registrar múltiples proyectos asociados con sus coordenadas GPS y dirección de obra específicas.

---

## 6. Prevención de Fugas de Recursos en API Bridge (PM2/Hermes)

### Problema
Al arrancar el bridge en Node.js/Express, se invocaban instancias secundarias de Hermes CLI en modo oneshot (`hermes -z`). Si una solicitud HTTP de cliente se cancelaba abruptamente (por ejemplo, si el usuario cerraba la pestaña del chat de Caleb o recargaba la página a mitad del procesamiento), el proceso hijo de Hermes continuaba ejecutándose en segundo plano en la máquina virtual remota `naski`. Esto provocó un escape de memoria y un consumo desmedido de CPU que saturó el sistema.

### Solución Implementada
Se implementó un manejador de ciclo de vida del proceso en `src/core/mcp/bridge/index.ts`. Se capturan los cierres de conexión del cliente HTTP mediante `res.on('close')`, validando si el proceso no ha terminado y no ha sido marcado previamente. En tal caso, se envía inmediatamente una señal `SIGTERM` / `SIGKILL` para eliminar la instancia huérfana de Hermes. Adicionalmente, se estableció un temporizador de seguridad de 45 segundos para forzar el apagado en caso de bloqueos por latencia de red o inactividad.

---

## 7. Operaciones CRUD de Tareas con Inferencia de Contexto RLS

### Problema
Para permitir al asistente Caleb gestionar tareas globales (`create_task`, `update_task`, `delete_task`) sin vulnerar las reglas de aislamiento Row Level Security (RLS) en Supabase, el servidor MCP requería instanciar clientes que heredasen el contexto de seguridad del usuario autenticado en vez de operar con privilegios ilimitados de súper-administrador (`service_role`). Sin embargo, llamar a `setSession()` de forma síncrona provocaba fallos de sincronía interna, impidiendo recuperar al usuario autenticado.

### Solución Implementada
Se transformó el generador de clientes `getSupabaseClient` de `src/core/mcp/server.ts` en una función asíncrona que realiza un `await` formal sobre `client.auth.setSession()`. Adicionalmente, todas las llamadas a `getUser()` se modificaron para inyectar explícitamente el token JWT (`getUser(userJwt)`), permitiendo una validación de firma infalible por parte de GoTrue. Para las modificaciones por Caleb, se introdujo una estructura comparativa que detecta qué campos de la tarea cambiaron y concatena un registro cronológico detallado en `task_activities` (guardando la acción bajo el nombre `"Caleb (IA)"` o `"Caleb (IA) a nombre de <Colaborador>"` según se indique en el parámetro opcional `completedOnBehalfOf`).

