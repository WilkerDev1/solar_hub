# Solar Hub - Sprint Backlog & Requisitos

Listado priorizado de requisitos pendientes de desarrollo para los siguientes sprints de Solar Hub.

---

## Sprint 3 (Completado): Reestructuración Profunda — CRM, Admin CRUD & Orion

### Requisitos Funcionales
- **[x] Simplificación de CRM:**
  - Dialog de creación de cliente simplificado para requerir únicamente el nombre.
  - Registro de prospectos más rápido y sin fricciones.
- **[x] Expediente de Cliente Editable:**
  - Formulario en `/clients/[id]` para actualizar en caliente todos los campos del CRM (categoría, consumo promedio, etc.).
- **[x] Formulario de Creación de Proyecto:**
  - Dialog modal interactivo para registrar un nuevo proyecto directamente desde el expediente del cliente asociado.
  - Campos: Nombre del Proyecto, Ubicación, Coordenadas GPS, Capacidad (kWp), Fase y Estado.
- **[x] Panel de Control RRHH (Admin):**
  - Panel completo en `/admin/users` para listar, crear, editar, archivar y restaurar empleados.
  - Asignación de múltiples ocupaciones/áreas de responsabilidad mediante arrays de texto.
  - Creación segura a través de API Route Next.js sin exponer la `service_role_key`.
- **[x] Consola Orion Interactiva:**
  - Métricas agregadas de la base de datos PostgreSQL cargadas de forma reactiva (conteo de clientes, proyectos, empleados) en lugar de valores estáticos.

---

## Sprint 4 (Próximo Sprint): Módulo de Proyectos & Integración de Mapas

### Requisitos Funcionales
- **[ ] Listado de Proyectos Centralizado:**
  - Crear la pantalla principal de proyectos en `/projects`.
  - Grid de alta densidad visual con filtros avanzados por fase (Estudio, Instalación, Pruebas, Operativo) y estado.
- **[ ] Integración de Mapas Interactivos:**
  - En la vista del cliente `/clients/[id]`, reemplazar el enlace estático de Google Maps con un mapa interactivo (ej. Leaflet) embebido que muestre el marcador del cliente y proyectos cercanos.

### Requisitos Técnicos
- **[ ] RLS Completo para Proyectos:**
  - Asegurar políticas Postgres para que solo perfiles autorizados puedan crear o modificar proyectos.
- **[ ] Automatización:**
  - Scripts de seeding enriquecidos para proyectos con consumos históricos simulados.

---

## Sprint 5: Control de Inventario Básico

### Requisitos Funcionales
- **[ ] Tablero de Inventario:**
  - Vista general de stock disponible en la organización.
- **[ ] Logs de Transacción:**
  - Registrar quién extrajo materiales del inventario, para qué proyecto y en qué fecha.

---

## Backlog General (Ideas y Mejoras Futuras)
- **[ ] Automatización de Cotizaciones:** PDF generado dinámicamente según el consumo promedio de kWh de un cliente residencial/industrial.
- **[ ] Notificaciones Push:** Alertas en tiempo real para técnicos en campo cuando se les asigna un nuevo proyecto.
- **[ ] Firma Digital:** Módulo para que los clientes firmen la aceptación de la instalación fotovoltaica directamente en el móvil del técnico.
