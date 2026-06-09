-- Migration: Create clients table and auto-initialization trigger for new users

-- 1. Create Clients Table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document_id TEXT NOT NULL, -- Cédula, RNC, etc.
  phone TEXT,
  address TEXT,
  status TEXT NOT NULL CHECK (status IN ('activo', 'inactivo', 'prospecto')) DEFAULT 'prospecto',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS on clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies for clients based on company_id
CREATE POLICY "Users can view clients in their company" ON clients
  FOR SELECT USING (company_id = get_user_active_company());

CREATE POLICY "Users can insert clients in their company" ON clients
  FOR INSERT WITH CHECK (company_id = get_user_active_company());

CREATE POLICY "Users can update clients in their company" ON clients
  FOR UPDATE USING (company_id = get_user_active_company());

CREATE POLICY "Users can delete clients in their company" ON clients
  FOR DELETE USING (company_id = get_user_active_company());


-- 2. Seed Permissions
INSERT INTO permissions (action, description) VALUES
  ('admin:*', 'Permiso absoluto de administración'),
  ('project:read', 'Ver proyectos'),
  ('project:create', 'Crear proyectos'),
  ('project:update', 'Actualizar proyectos'),
  ('project:delete', 'Eliminar proyectos'),
  ('inventory:read', 'Ver inventario'),
  ('inventory:use_material', 'Usar materiales en terreno'),
  ('client:read', 'Ver clientes en CRM'),
  ('client:write', 'Crear y editar clientes'),
  ('client:manage', 'Eliminar o suspender clientes')
ON CONFLICT (action) DO NOTHING;


-- 3. Automatic User Signup Initializer Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_company_id UUID;
  admin_role_id UUID;
BEGIN
  -- A. Ensure a default company exists, or create one
  SELECT id INTO default_company_id FROM public.companies WHERE slug = 'default-tenant';
  
  IF default_company_id IS NULL THEN
    INSERT INTO public.companies (name, slug, status)
    VALUES ('Default Solar Hub Tenant', 'default-tenant', 'active')
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO default_company_id;
  END IF;

  -- Fallback if conflict handler returned null due to concurrent insertion
  IF default_company_id IS NULL THEN
    SELECT id INTO default_company_id FROM public.companies WHERE slug = 'default-tenant';
  END IF;

  -- B. Ensure default roles exist for this company
  INSERT INTO public.roles (company_id, name, description)
  VALUES (default_company_id, 'Administrador', 'Acceso total a la configuración y módulos')
  ON CONFLICT (company_id, name) DO NOTHING
  RETURNING id INTO admin_role_id;

  IF admin_role_id IS NULL THEN
    SELECT id INTO admin_role_id FROM public.roles WHERE company_id = default_company_id AND name = 'Administrador';
  END IF;

  INSERT INTO public.roles (company_id, name, description)
  VALUES (default_company_id, 'Técnico de Campo', 'Acceso operativo para tareas en terreno')
  ON CONFLICT (company_id, name) DO NOTHING;

  -- C. Map all permissions to the Administrador role
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT admin_role_id, p.id
  FROM public.permissions p
  ON CONFLICT DO NOTHING;

  -- D. Create the user profile
  INSERT INTO public.profiles (id, company_id, full_name, email, avatar_url)
  VALUES (
    new.id,
    default_company_id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );

  -- E. Map the user to the Administrador role
  INSERT INTO public.user_roles (user_id, role_id)
  VALUES (new.id, admin_role_id);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition on auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
