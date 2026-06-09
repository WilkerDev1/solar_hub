# CLAUDE.md - Guía del Desarrollador y Comandos

Este archivo contiene los comandos operativos y las directrices de estilo del proyecto Solar Hub.

## Comandos Operativos Seguro (Usando ejecutores locales nativos)

### Desarrollo y Compilación
- **Iniciar servidor de desarrollo:** `npx next dev`
- **Compilar para producción:** `npx next build`
- **Ejecutar formateo y linting:** `npx next lint`
- **Escaneo de seguridad de dependencias:** `npm audit`

### Base de Datos Supabase (Local)
- **Iniciar contenedores de desarrollo:** `supabase start`
- **Detener contenedores:** `supabase stop`
- **Reestablecer base de datos y correr migraciones:** `supabase db reset`
- **Generar tipos locales de TypeScript:** `supabase gen types typescript --local > src/core/database/types.ts`

---

## Directrices de Desarrollo y Estilo

### Arquitectura de Frontend
- **Framework:** Next.js (App Router) y TypeScript estricto.
- **UI/UX Stack:** Tailwind CSS + shadcn/ui. Prohibido usar IBM Carbon / `@carbon/react`.
- **Estrategia Responsiva:**
  - *Escritorio (Desktop):* Diseños ricos en paneles colapsables, multi-barras de navegación y alta densidad de información.
  - *Móvil (Campo):* Contraste extremo (Modo Campo), Wizards sencillos, botones de interacción de al menos `h-12` o `p-4` para uso con guantes.

### Estructura de Módulos (Cajas)
- Ubicación de módulos: `src/modules/<modulo>/`.
- Prohibida la importación directa entre módulos operativos. Todo componente o lógica compartida debe delegarse a `src/core/components/` o `src/core/auth/`.

### Documentación y Registro
- Es obligatorio registrar cada cambio estructural o migración de base de datos de manera autónoma en:
  `/home/ishiro/Documents/obsidian-vault/obsidian cache/Life-OS/Life-OS/04-Proyectos/05-codigo/solar-hub.md`
