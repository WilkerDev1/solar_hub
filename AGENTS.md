<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Solar Hub Developer Rules & Architecture Context

## 1. Modificación Total de UI/UX (Estrategia Adaptativa Desktop-Rich & Mobile-Field)
- **Stack Tecnológico UI:** El stack exclusivo y mandatorio para la interfaz es **Tailwind CSS** y componentes de **shadcn/ui**.
- **Prohibición:** Queda estrictamente prohibido el uso o referencia a IBM Carbon o la librería `@carbon/react`.
- **Estrategia PC (Escritorio):** Diseño sofisticado con alta densidad de información. Utilizar grids dinámicos, filtros avanzados, barras laterales de navegación múltiples (estilo Discord o Notion), y paneles colapsables derechos para auditoría o chat por proyecto.
- **Estrategia Móvil (Campo):** Interfaz Mobile-First extrema optimizada para técnicos en terreno con guantes y bajo el sol:
  - Paleta de colores de alto contraste (Modo Campo).
  - Componentes paso a paso (Wizards) simplificados.
  - Áreas de contacto masivas (mínimo de altura `h-12` o padding `p-4`).

## 2. Estructura de "Cajas" (Aislamiento de Módulos)
- **Regla de Aislamiento:** Los módulos operativos (`dashboard`, `chat`, `projects`, `inventory`, `clients`) deben estar totalmente aislados en `src/modules/`.
- **Comunicación Estricta:** Queda prohibida la importación directa de componentes o utilidades internas entre diferentes módulos de `src/modules/`. Toda reutilización o comunicación entre módulos debe canalizarse exclusivamente a través de los componentes globales ubicados en `src/core/components/`.

## 3. Protocolo de Documentación Automatizada (Obsidian Vault)
- **Documentación de Cambios:** Cada hito técnico relevante, refactorización o cambio estructural en la base de datos debe ser documentado de forma autónoma en la nota principal de la bóveda de Obsidian:
  - **Ruta Absoluta:** `/home/ishiro/Documents/obsidian-vault/obsidian cache/Life-OS/Life-OS/04-Proyectos/05-codigo/solar-hub.md`
- **Requisitos de la Nota:**
  - Mantener actualizado el registro cronológico de cambios (Changelog).
  - Actualizar el diagrama de Mermaid que ilustra el modelado de la base de datos ante cambios en el esquema.
