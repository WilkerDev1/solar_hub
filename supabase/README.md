# Configuración Local de Supabase CLI (Docker)

Esta guía te ayudará a poner en marcha el entorno local de Supabase para desarrollo y auditoría.

## Prerrequisitos
- Tener instalado **Docker** y que esté corriendo.
- Tener instalado **Supabase CLI**. En Arch Linux se puede instalar con:
  ```bash
  # Usando yay o yay-bin (AUR)
  yay -S supabase-cli
  ```

---

## 1. Inicializar Supabase en el Proyecto
Si el comando no ha sido ejecutado, corre esto en la raíz del proyecto `solar_hub`:
```bash
supabase init
```
Esto creará una carpeta llamada `supabase/` con las configuraciones por defecto.

## 2. Iniciar Servicios Locales (Base de Datos, Auth, Storage)
Asegúrate de que Docker esté corriendo, luego ejecuta:
```bash
supabase start
```
Esto descargará y arrancará los contenedores de Docker. Al finalizar, mostrará las URLs locales y claves (anon, service_role).

## 3. Aplicar Migraciones de Base de Datos
La migración de la base de datos core que creamos se encuentra en:
`supabase/migrations/20260609000000_core_schema.sql`

Para restablecer la base de datos local y aplicar esta migración de manera limpia, ejecuta:
```bash
supabase db reset
```

## 4. Generación Automática de Tipos TypeScript
Una vez que las tablas estén creadas localmente, puedes regenerar los tipos de TypeScript con:
```bash
supabase gen types typescript --local > src/core/database/types.ts
```
Luego podrás importar estos tipos seguros desde tu frontend en Next.js.

## 5. Detener el Entorno Local
Para pausar los contenedores locales sin perder datos:
```bash
supabase stop
```
Y si quieres destruirlos liberando espacio de almacenamiento:
```bash
supabase stop --clean
```
