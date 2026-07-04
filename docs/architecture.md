# Solar Hub - Arquitectura Técnica de Software

Documentación técnica detallada de la arquitectura de la plataforma **Solar Hub**, un SaaS híbrido multi-tenant para la gestión de proyectos de ingeniería solar y comunicación operativa.

---

## 1. Visión de la Arquitectura

Solar Hub está estructurado en torno a dos principios clave:
1. **Modularidad Estricta (Mini-programas):** Componentes funcionales independientes que pueden ser añadidos o removidos sin interferir con el núcleo central. Los módulos se aíslan en `src/modules/` y se comunican únicamente a través de los componentes globales de `src/core/components/`.
2. **Aislamiento Multi-Tenant (Seguridad RLS):** Integración nativa en base de datos para asegurar que los usuarios accedan únicamente a los datos de sus respectivas organizaciones (Workspaces).

---

## 2. Stack Tecnológico

- **Frontend (Web de Oficina & Admin):** Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui (basado en `@base-ui/react` para componentes de diálogo/menús).
- **Base de Datos & Auth:** Supabase (PostgreSQL) con RLS (Row Level Security) habilitado a nivel de tablas.
- **Mobile (Técnicos de Campo):** Flutter (para soporte Offline-First con sincronización en la nube y optimización de UI/UX de alto contraste para exteriores).
- **Alojamiento:** Vercel (Frontend) y Cloudflare (Seguridad, DNS).

---

## 3. Estructura del Frontend (SaaS Modular)

La estructura del directorio de código en Next.js separa los componentes transversales de los módulos operativos:

```
src/
├── core/                      # Recursos compartidos transversales (Core Layer)
│   ├── auth/
│   │   └── AuthContext.tsx    # Contexto de sesión y Wrapper <RequirePermission>
│   ├── database/
│   │   ├── supabase.ts        # Inicialización de cliente con tipos estrictos
│   │   └── types.ts           # Tipos de TypeScript generados por Supabase CLI
│   └── components/            # Componentes atómicos comunes y layouts compartidos
└── modules/                   # Módulos / "Mini-Programas" autocontenidos
    ├── dashboard/             # Vista principal, métricas y tareas del día
    ├── chat/                  # Canales de chat en tiempo real
    ├── projects/              # Gestión de planos, fases e hitos de obra
    ├── inventory/             # Control de stock de paneles, inversores, etc.
    └── clients/               # CRM y consumos energéticos industriales
```

---

## 4. Estrategia de Roles y Permisos (RBAC & RLS)

### Autorización en Frontend (Declarativa)
No se evalúan roles de forma dura (`user.role === 'admin'`). En su lugar, se usa el componente declarativo `<RequirePermission>` basado en permisos atómicos inyectados en la sesión:

```tsx
<RequirePermission action="project:create" fallback={<p>Acceso denegado</p>}>
  <NewProjectButton />
</RequirePermission>
```

### Seguridad en Backend (PostgreSQL Row Level Security)
Toda la restricción de visibilidad se aplica en la base de datos a través de políticas RLS:

- **companies**: Permite consultar solo la compañía activa del perfil.
- **profiles**: Permite la lectura mutua de perfiles dentro del mismo `company_id`.
- **roles/permissions/user_roles**: Filtrado por el tenant activo del usuario.

#### Funciones de Soporte (PL/pgSQL)
- `get_user_active_company()`: Retorna el UUID de la empresa del perfil autenticado.
- `user_has_permission(required_action)`: Comprueba si existe la relación usuario-rol-permiso que habilite la acción.

---

## 5. Esquema Relacional de Base de Datos (Core)

```mermaid
erDiagram
    companies ||--o{ profiles : "pertenece a"
    companies ||--o{ roles : "define"
    profiles ||--o{ user_roles : "tiene"
    roles ||--o{ user_roles : "asociado a"
    roles ||--o{ role_permissions : "contiene"
    permissions ||--o{ role_permissions : "mapeado a"
    companies ||--o{ clients : "pertenece a"
    profiles ||--o{ clients : "creado por"
    companies ||--o{ projects : "pertenece a"
    clients ||--o{ projects : "tiene (1:N)"
    companies ||--o{ global_tasks : "tiene"
    projects ||--o{ global_tasks : "vincula"
    profiles ||--o{ global_tasks : "asignado a"
    companies ||--o{ role_permissions_templates : "define"
    projects ||--o{ project_messages : "tiene"
    profiles ||--o{ project_messages : "escribe"
    companies ||--o{ inventory_categories : "pertenece a"
    companies ||--o{ inventory_tags : "pertenece a"
    companies ||--o{ inventory_items : "pertenece a"
    companies ||--o{ inventory_transactions : "pertenece a"
    companies ||--o{ project_materials : "pertenece a"
    inventory_categories ||--o{ inventory_items : "clasifica"
    inventory_items ||--o{ inventory_transactions : "audita"
    profiles ||--o{ inventory_transactions : "creado por"
    projects ||--o{ project_materials : "contiene"
    inventory_items ||--o{ project_materials : "mapea"
    companies ||--o{ folders : "pertenece a"
    companies ||--o{ documents : "pertenece a"
    projects ||--o{ folders : "vincula"
    folders ||--o{ folders : "auto-referencial (parent_id)"
    folders ||--o{ documents : "contiene"
    profiles ||--o{ documents : "subido por"
    global_tasks ||--o{ documents : "evidencia"

    companies {
        uuid id PK
        text name
        text slug
        text status
        timestamp created_at
    }

    profiles {
        uuid id PK
        uuid company_id FK
        text full_name
        text email
        text avatar_url
        text_array occupation
        boolean is_active
    }

    roles {
        uuid id PK
        uuid company_id FK
        text name
        text description
    }

    permissions {
        uuid id PK
        text action
        text description
    }

    clients {
        uuid id PK
        uuid company_id FK
        text name
        text document_id
        text phone
        text address
        text status
        text category
        numeric avg_kwh_consumption
        timestamp created_at
        uuid created_by FK
    }

    projects {
        uuid id PK
        uuid company_id FK
        uuid client_id FK
        text name
        text location
        text capacity
        text phase
        text status
        text gps_coordinates
        timestamp created_at
        uuid created_by FK
    }

    global_tasks {
        uuid id PK
        uuid company_id FK
        uuid project_id FK
        text title
        text description
        text origin
        text status
        text task_type
        text area
        text audit_status
        text_array evidence_urls
        uuid assigned_to FK
        timestamp created_at
        uuid created_by FK
    }

    project_messages {
        uuid id PK
        uuid project_id FK
        uuid profile_id FK
        text message
        timestamp created_at
    }

    role_permissions_templates {
        uuid id PK
        uuid company_id FK
        text role_name
        text_array permission_actions
        timestamp created_at
        timestamp updated_at
    }

    inventory_categories {
        uuid id PK
        uuid company_id FK
        text name
        timestamp created_at
    }

    inventory_tags {
        uuid id PK
        uuid company_id FK
        text name
        timestamp created_at
    }

    inventory_items {
        uuid id PK
        uuid company_id FK
        uuid category_id FK
        text name
        text sku
        text description
        text image_url
        text_array providers
        text_array tags
        numeric cost
        text unit
        text packaging
        numeric length
        numeric weight
        integer stock
        integer min_stock
        integer usage_count
        timestamp created_at
        timestamp updated_at
    }

    inventory_transactions {
        uuid id PK
        uuid company_id FK
        uuid item_id FK
        integer quantity
        text transaction_type
        text reason
        uuid created_by FK
        timestamp created_at
    }

    project_materials {
        uuid id PK
        uuid company_id FK
        uuid project_id FK
        uuid item_id FK
        integer quantity
        integer required_quantity
        timestamp created_at
    }

    folders {
        uuid id PK
        uuid company_id FK
        uuid parent_id FK
        uuid project_id FK
        text department_id
        text name
        timestamp created_at
    }

    documents {
        uuid id PK
        uuid company_id FK
        uuid folder_id FK
        text name
        text physical_path
        bigint file_size
        text mime_type
        uuid uploaded_by FK
        uuid task_id FK
        timestamp created_at
    }
```

---

## 6. Procedimiento de Inicialización Local

1. Instalar Supabase CLI y Docker.
2. Correr `supabase init` y `supabase start`.
3. Aplicar las migraciones correspondientes:
   ```bash
   supabase db reset
   ```
4. Generar tipos de TypeScript locales:
   ```bash
   supabase gen types typescript --local > src/core/database/types.ts
   ```

---

## 7. Infraestructura y Estrategia de Despliegue (Servidor Caddy)

Para optimizar el uso de recursos y controlar el consumo de memoria RAM en el servidor de producción (Naski), Solar Hub se despliega utilizando una arquitectura híbrida:

1. **Frontend Estático (RAM de 0%):** El frontend de Next.js se compila localmente mediante exportación estática (`output: 'export'`). Caddy sirve los archivos estáticos desde `/home/naski/solar-hub/out` de manera directa, sin requerir un proceso de Node corriendo en background.
2. **API & AI Proxy (Node.js/Express):** Las llamadas a las herramientas de inteligencia artificial y almacenamiento se canalizan a través de un proxy local en el puerto `5000` administrado por PM2.
3. **Mapeo de Rutas Clean URLs en Caddyfile:**
   Caddy está configurado para enrutar de forma inteligente:
   - `/api/*`: Redirigido mediante proxy inverso a `localhost:5000` inyectando tokens de autenticación internos para asegurar la conexión del Agente Caleb.
   - Resto de rutas: Servidas mediante `file_server` mapeando rutas sin extensión `.html` de forma automática usando `try_files {path} {path}.html {path}/ /index.html`.

### Configuración del Caddyfile en Naski

```caddy
http://solarhubweb.com, http://www.solarhubweb.com {
    handle /api/* {
        reverse_proxy localhost:5000 {
            header_up Authorization "Bearer 1130_secret_caleb_bridge_token"
        }
    }

    handle {
        root * /home/naski/solar-hub/out
        try_files {path} {path}.html {path}/ /index.html
        file_server
    }

    log {
        output stderr
    }
}
```
