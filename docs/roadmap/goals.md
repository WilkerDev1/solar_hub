# Solar Hub - Roadmap & Objetivos Futuros

Este documento define la hoja de ruta estratégica para el desarrollo de la plataforma **Solar Hub**, detallando los objetivos de negocio y requisitos técnicos pendientes de implementación.

---

## 1. Objetivos del Sistema

Solar Hub busca consolidarse como la herramienta definitiva de gestión operativa para empresas de energía solar. El desarrollo se guía por tres prioridades:
1. **Densidad de Información en Oficina:** Permitir que los ingenieros y administradores gestionen decenas de proyectos de forma paralela con paneles informativos rápidos inspirados en el diseño Orion.
2. **Operación Confiable en Campo:** Facilitar el trabajo de los técnicos instaladores mediante una interfaz móvil táctil adaptada para condiciones de exterior (alto contraste, controles grandes).
3. **Automatización Inteligente:** Estructura de servicios y backend "AI-Ready" para la fácil integración de agentes inteligentes y reportes analíticos automatizados.

---

## 2. Próximos Módulos a Desarrollar

### Módulo de Producción (Ingeniería & Obra)
- **Monitoreo de Plantas Solares:** Visualización de generación energética en tiempo real (kWh) mediante gráficos avanzados.
- **Seguimiento de Fases:** Hitos y cronogramas de instalación del proyecto (Anclaje, Montaje, Conexión, Pruebas).
- **Gestión de Archivos Técnicos:** Planos de distribución, diagramas unifilares y actas de entrega firmadas digitalmente.

### Módulo de Inventario & Suministros
- **Control de Stock:** Registro de paneles solares, inversores, estructuras de soporte y cableado.
- **Movimientos de Almacén:** Registro de entradas (compras a proveedores) y salidas (asignación a proyectos específicos).
- **Alertas de Stock Mínimo:** Notificaciones cuando el stock de materiales críticos caiga por debajo del umbral de seguridad.

### Sincronizador Offline-First para Campo (Mobile)
- **Modo Desconectado:** Capacidad de registrar avances de obra y subir fotografías sin cobertura de red.
- **Cola de Sincronización:** Guardado local de datos mediante SQLite/Hive y sincronización automática bidireccional en segundo plano al recuperar conexión.

---

## 3. Mejoras de Infraestructura y Calidad
- **Pruebas Automáticas:**
  - Pruebas unitarias para la capa de servicios de Supabase utilizando Jest.
  - Pruebas E2E (End-to-End) de flujos críticos de usuario (Login, creación de proyectos) mediante Playwright.
- **Optimización de Rendimiento:**
  - Auditoría de Core Web Vitals (con enfoque en LCP - Largest Contentful Paint).
  - Implementación de paginación y virtualización de listas en pantallas de alta densidad.
