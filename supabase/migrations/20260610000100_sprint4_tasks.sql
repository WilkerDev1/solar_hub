-- Migration: Sprint 4 Tasks and Role Templates
-- Objective: Create global_tasks and role_permissions_templates tables with proper constraints, RLS, and reactive triggers.

-- ============================================================
-- 1. GLOBAL_TASKS: Tabla para tareas del sistema
-- ============================================================
CREATE TABLE IF NOT EXISTS global_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  origin TEXT NOT NULL CHECK (origin IN ('proyecto', 'administracion', 'consulta', 'almacen')),
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_progreso', 'completada')),
  task_type TEXT NOT NULL DEFAULT 'check' CHECK (task_type IN ('check', 'entregable')),
  assigned_to UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Habilitar RLS en global_tasks
ALTER TABLE global_tasks ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para global_tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'global_tasks'
      AND policyname = 'Users can view tasks in their company'
  ) THEN
    CREATE POLICY "Users can view tasks in their company" ON global_tasks
      FOR SELECT USING (company_id = get_user_active_company());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'global_tasks'
      AND policyname = 'Users can insert tasks in their company'
  ) THEN
    CREATE POLICY "Users can insert tasks in their company" ON global_tasks
      FOR INSERT WITH CHECK (company_id = get_user_active_company());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'global_tasks'
      AND policyname = 'Users can update tasks in their company'
  ) THEN
    CREATE POLICY "Users can update tasks in their company" ON global_tasks
      FOR UPDATE USING (company_id = get_user_active_company());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'global_tasks'
      AND policyname = 'Users can delete tasks in their company'
  ) THEN
    CREATE POLICY "Users can delete tasks in their company" ON global_tasks
      FOR DELETE USING (company_id = get_user_active_company());
  END IF;
END $$;


-- ============================================================
-- 2. ROLE_PERMISSIONS_TEMPLATES: Plantillas de permisos
-- ============================================================
CREATE TABLE IF NOT EXISTS role_permissions_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  permission_actions TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (company_id, role_name)
);

-- Habilitar RLS en role_permissions_templates
ALTER TABLE role_permissions_templates ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para role_permissions_templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'role_permissions_templates'
      AND policyname = 'Users can view templates in their company'
  ) THEN
    CREATE POLICY "Users can view templates in their company" ON role_permissions_templates
      FOR SELECT USING (company_id = get_user_active_company());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'role_permissions_templates'
      AND policyname = 'Admins can manage templates in their company'
  ) THEN
    CREATE POLICY "Admins can manage templates in their company" ON role_permissions_templates
      FOR ALL USING (company_id = get_user_active_company() AND user_has_permission('admin:*'));
  END IF;
END $$;


-- ============================================================
-- 3. TRIGGERS: Propagación reactiva de permisos a roles reales
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_role_permissions_template()
RETURNS TRIGGER AS $$
DECLARE
  v_role_id UUID;
  v_perm_id UUID;
  v_action TEXT;
BEGIN
  -- 1. Asegurar que exista el rol físico para esa compañía y nombre
  SELECT id INTO v_role_id
  FROM public.roles
  WHERE company_id = NEW.company_id AND name = NEW.role_name;

  IF v_role_id IS NULL THEN
    INSERT INTO public.roles (company_id, name, description)
    VALUES (NEW.company_id, NEW.role_name, 'Rol creado automáticamente a partir de plantilla')
    RETURNING id INTO v_role_id;
  END IF;

  -- 2. Limpiar todos los permisos actuales vinculados a este rol
  DELETE FROM public.role_permissions WHERE role_id = v_role_id;

  -- 3. Mapear e insertar las nuevas relaciones en base al array de acciones
  FOREACH v_action IN ARRAY NEW.permission_actions LOOP
    SELECT id INTO v_perm_id FROM public.permissions WHERE action = v_action;
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO public.role_permissions (role_id, permission_id)
      VALUES (v_role_id, v_perm_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_role_permissions_template_change
  AFTER INSERT OR UPDATE ON public.role_permissions_templates
  FOR EACH ROW EXECUTE FUNCTION public.sync_role_permissions_template();


CREATE OR REPLACE FUNCTION public.sync_role_permissions_template_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_role_id UUID;
BEGIN
  SELECT id INTO v_role_id
  FROM public.roles
  WHERE company_id = OLD.company_id AND name = OLD.role_name;

  IF v_role_id IS NOT NULL THEN
    DELETE FROM public.role_permissions WHERE role_id = v_role_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_role_permissions_template_delete
  AFTER DELETE ON public.role_permissions_templates
  FOR EACH ROW EXECUTE FUNCTION public.sync_role_permissions_template_delete();


-- ============================================================
-- 4. SEED DATA: Cargar plantillas por defecto y tareas semilla
-- ============================================================
DO $$
DECLARE
  default_comp_id UUID;
  profile_admin_id UUID;
  project_id UUID;
BEGIN
  -- Obtener compañía por defecto
  SELECT id INTO default_comp_id FROM public.companies WHERE slug = 'default-tenant';

  IF default_comp_id IS NOT NULL THEN
    -- A. Seed templates para los roles típicos
    -- Administrador
    INSERT INTO public.role_permissions_templates (company_id, role_name, permission_actions)
    VALUES (default_comp_id, 'Administrador', ARRAY['admin:*', 'project:read', 'project:create', 'project:update', 'project:delete', 'inventory:read', 'inventory:use_material', 'client:read', 'client:write', 'client:manage'])
    ON CONFLICT (company_id, role_name) DO UPDATE
    SET permission_actions = EXCLUDED.permission_actions;

    -- Técnico de Campo
    INSERT INTO public.role_permissions_templates (company_id, role_name, permission_actions)
    VALUES (default_comp_id, 'Técnico de Campo', ARRAY['project:read', 'inventory:read', 'inventory:use_material', 'client:read'])
    ON CONFLICT (company_id, role_name) DO UPDATE
    SET permission_actions = EXCLUDED.permission_actions;

    -- Ingeniero
    INSERT INTO public.role_permissions_templates (company_id, role_name, permission_actions)
    VALUES (default_comp_id, 'Ingeniero', ARRAY['project:read', 'project:create', 'project:update', 'inventory:read', 'client:read', 'client:write'])
    ON CONFLICT (company_id, role_name) DO UPDATE
    SET permission_actions = EXCLUDED.permission_actions;

    -- B. Seed initial tasks
    -- Buscar primer perfil de Administrador (para asignar tareas de prueba)
    SELECT p.id INTO profile_admin_id 
    FROM public.profiles p
    JOIN public.user_roles ur ON p.id = ur.user_id
    JOIN public.roles r ON ur.role_id = r.id
    WHERE p.company_id = default_comp_id AND r.name = 'Administrador'
    LIMIT 1;

    -- Si no hay perfil, buscar cualquiera en la compañía
    IF profile_admin_id IS NULL THEN
      SELECT id INTO profile_admin_id FROM public.profiles WHERE company_id = default_comp_id LIMIT 1;
    END IF;

    -- Buscar primer proyecto para enlazar
    SELECT id INTO project_id FROM public.projects WHERE company_id = default_comp_id LIMIT 1;

    IF profile_admin_id IS NOT NULL THEN
      -- Limpiar tareas previas de seed
      DELETE FROM public.global_tasks WHERE company_id = default_comp_id;

      -- Crear tareas de tipo check
      INSERT INTO public.global_tasks (company_id, project_id, title, description, origin, status, task_type, assigned_to, created_by)
      VALUES
        (default_comp_id, project_id, 'Revisar anclajes de estructura soporte', 'Inspeccionar que los tornillos del soporte estén ajustados a torque correcto.', 'proyecto', 'pendiente', 'check', profile_admin_id, profile_admin_id),
        (default_comp_id, null, 'Actualizar inventario de inversores monofásicos', 'Realizar conteo físico en bodega principal y registrar en la consola.', 'almacen', 'pendiente', 'check', profile_admin_id, profile_admin_id),
        (default_comp_id, null, 'Validar roles de nuevos técnicos contratados', 'Configurar perfiles e inyectar sus ocupaciones correspondientes.', 'administracion', 'pendiente', 'check', profile_admin_id, profile_admin_id);

      -- Crear tarea de tipo entregable
      INSERT INTO public.global_tasks (company_id, project_id, title, description, origin, status, task_type, assigned_to, created_by)
      VALUES
        (default_comp_id, project_id, 'Subir plano unifilar eléctrico aprobado', 'Subir el plano definitivo y visado por el organismo regulador para la obra.', 'proyecto', 'pendiente', 'entregable', profile_admin_id, profile_admin_id);
    END IF;

  END IF;
END $$;
