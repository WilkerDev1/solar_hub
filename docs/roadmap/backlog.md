# Solar Hub - Sprint Backlog & Requisitos

Listado priorizado de requisitos pendientes de desarrollo para los siguientes sprints de Solar Hub.

---

## Sprint 3 (Próximo Sprint): Módulo de Proyectos & Integración de Mapas

### Requisitos Funcionales
- **[ ] Listado de Proyectos:**
  - Crear la pantalla principal de proyectos en `/projects`.
  - Grid de alta densidad visual con filtros por fase (Estudio, Instalación, Pruebas, Operativo) y estado.
- **[ ] Formulario de Creación de Proyecto:**
  - Dialog modal interactivo para registrar un nuevo proyecto asociado a un cliente.
  - Campos: Nombre del Proyecto, Cliente (Dropdown), Capacidad (kWp), Ubicación, Fase, Estado.
- **[ ] Integración de Mapas Interactivos:**
  - En la vista del cliente `/clients/[id]`, reemplazar el enlace estático de Google Maps con un mapa interactivo (ej. Leaflet o Google Maps API) embebido que muestre el marcador del cliente y proyectos cercanos.

### Requisitos Técnicos
- **[ ] RLS Completo para Proyectos:**
  - Asegurar políticas Postgres para que solo perfiles con permisos de edición de proyectos puedan crearlos o modificarlos.
- **[ ] Automatización:**
  - Scripts de seeding enriquecidos para proyectos con consumos históricos simulados.

---

## Sprint 4: Control de Inventario Básico

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
