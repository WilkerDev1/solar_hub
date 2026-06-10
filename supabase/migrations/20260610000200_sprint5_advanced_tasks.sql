-- Migration: Sprint 5 Advanced Tasks, Project Chat and Area Permissions

-- 1. Expansión de global_tasks
-- Expandimos el enum de task_type para soportar 'reporte' y 'evidencia'
ALTER TABLE global_tasks DROP CONSTRAINT IF EXISTS global_tasks_task_type_check;
ALTER TABLE global_tasks ADD CONSTRAINT global_tasks_task_type_check 
  CHECK (task_type IN ('check', 'entregable', 'reporte', 'evidencia'));

-- Añadimos las nuevas columnas
ALTER TABLE global_tasks 
  ADD COLUMN IF NOT EXISTS area TEXT CHECK (area IN ('legal', 'almacen', 'operaciones', 'administracion', 'general')) DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS audit_status TEXT CHECK (audit_status IN ('pendiente', 'aceptado', 'denegado', 'requiere_revision')) DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS evidence_urls TEXT[] DEFAULT '{}'::TEXT[];


-- 2. Creación de project_messages para el Mini Chat
CREATE TABLE IF NOT EXISTS project_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en project_messages
ALTER TABLE project_messages ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para project_messages
CREATE POLICY "Users can view project messages in their company" ON project_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = project_messages.project_id AND p.company_id = get_user_active_company()
    )
  );

CREATE POLICY "Users can insert project messages in their company" ON project_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = project_messages.project_id AND p.company_id = get_user_active_company()
    )
  );

-- Habilitar Supabase Realtime para la tabla project_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'project_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE project_messages;
  END IF;
EXCEPTION WHEN undefined_object THEN
  -- Crear la publicación si no existiese en el entorno
  CREATE PUBLICATION supabase_realtime FOR TABLE project_messages;
END
$$;


-- 3. Nuevos Permisos de Visibilidad por Área
INSERT INTO permissions (action, description) VALUES
  ('task:area:legal', 'Visibilidad de tareas del departamento legal'),
  ('task:area:almacen', 'Visibilidad de tareas del almacén e inventario'),
  ('task:area:operaciones', 'Visibilidad de tareas de campo y operaciones'),
  ('task:area:administracion', 'Visibilidad de tareas administrativas')
ON CONFLICT (action) DO NOTHING;

-- Agregar permisos nuevos al rol de Administrador en la tabla de templates
UPDATE role_permissions_templates 
SET permission_actions = array_append(permission_actions, 'task:area:legal')
WHERE role_name = 'Administrador' AND NOT ('task:area:legal' = ANY(permission_actions));

UPDATE role_permissions_templates 
SET permission_actions = array_append(permission_actions, 'task:area:almacen')
WHERE role_name = 'Administrador' AND NOT ('task:area:almacen' = ANY(permission_actions));

UPDATE role_permissions_templates 
SET permission_actions = array_append(permission_actions, 'task:area:operaciones')
WHERE role_name = 'Administrador' AND NOT ('task:area:operaciones' = ANY(permission_actions));

UPDATE role_permissions_templates 
SET permission_actions = array_append(permission_actions, 'task:area:administracion')
WHERE role_name = 'Administrador' AND NOT ('task:area:administracion' = ANY(permission_actions));

-- Reflejar los permisos también en los perfiles físicos ya instanciados
DO $$
DECLARE
  v_admin_role_id UUID;
  v_perm_id UUID;
BEGIN
  FOR v_admin_role_id IN SELECT id FROM roles WHERE name = 'Administrador' LOOP
    FOR v_perm_id IN SELECT id FROM permissions WHERE action IN ('task:area:legal', 'task:area:almacen', 'task:area:operaciones', 'task:area:administracion') LOOP
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_admin_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
