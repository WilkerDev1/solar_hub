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
