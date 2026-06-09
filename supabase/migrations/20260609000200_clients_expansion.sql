-- Migration: Clients Expansion and Projects Schema Definition

-- 1. Alter Clients Table to add technical fields
ALTER TABLE clients 
  ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('Residencial', 'Comercial', 'Industrial')) DEFAULT 'Residencial',
  ADD COLUMN IF NOT EXISTS avg_kwh_consumption NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gps_coordinates TEXT;

-- 2. Create Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  capacity TEXT,
  phase TEXT NOT NULL CHECK (phase IN ('Diseno', 'Permisos', 'Construccion', 'Operacion')) DEFAULT 'Diseno',
  status TEXT NOT NULL CHECK (status IN ('completado', 'en_progreso', 'demorado')) DEFAULT 'en_progreso',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS on projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies for projects
CREATE POLICY "Users can view projects in their company" ON projects
  FOR SELECT USING (company_id = get_user_active_company());

CREATE POLICY "Users can insert projects in their company" ON projects
  FOR INSERT WITH CHECK (company_id = get_user_active_company());

CREATE POLICY "Users can update projects in their company" ON projects
  FOR UPDATE USING (company_id = get_user_active_company());

CREATE POLICY "Users can delete projects in their company" ON projects
  FOR DELETE USING (company_id = get_user_active_company());


-- 3. Seed Data Block inside DO block
DO $$
DECLARE
  default_comp_id UUID;
  client_1_id UUID;
  client_2_id UUID;
  client_3_id UUID;
BEGIN
  -- A. Ensure default company exists
  SELECT id INTO default_comp_id FROM public.companies WHERE slug = 'default-tenant';
  
  IF default_comp_id IS NULL THEN
    INSERT INTO public.companies (name, slug, status)
    VALUES ('Default Solar Hub Tenant', 'default-tenant', 'active')
    RETURNING id INTO default_comp_id;
  END IF;

  -- B. Seed Clients (if they do not already exist under the default tenant)
  -- Clear previous mock clients if any to avoid duplicates on reset
  DELETE FROM public.clients WHERE company_id = default_comp_id;

  INSERT INTO public.clients (company_id, name, document_id, phone, address, status, category, avg_kwh_consumption, gps_coordinates)
  VALUES (default_comp_id, 'Agrícola Valle Central Ltda.', '76.123.456-7', '+56 9 8888 7777', 'Camino del Valle Km 12, Copiapó', 'activo', 'Comercial', 4500, '-27.3670,-70.3320')
  RETURNING id INTO client_1_id;

  INSERT INTO public.clients (company_id, name, document_id, phone, address, status, category, avg_kwh_consumption, gps_coordinates)
  VALUES (default_comp_id, 'Minera del Norte S.A.', '88.987.654-K', '+56 9 9999 1111', 'Ruta Ch-21 Km 45, Calama', 'activo', 'Industrial', 125000, '-22.4544,-68.9294')
  RETURNING id INTO client_2_id;

  INSERT INTO public.clients (company_id, name, document_id, phone, address, status, category, avg_kwh_consumption, gps_coordinates)
  VALUES (default_comp_id, 'Residencial Las Condes', '15.432.109-8', '+56 9 4444 3333', 'Av. Apoquindo 4500, Las Condes', 'prospecto', 'Residencial', 850, '-33.4144,-70.5732')
  RETURNING id INTO client_3_id;

  -- C. Seed Projects (linked to the above clients)
  DELETE FROM public.projects WHERE company_id = default_comp_id;

  INSERT INTO public.projects (company_id, client_id, name, location, capacity, phase, status)
  VALUES
    (default_comp_id, client_2_id, 'Planta Solar Copiapó 100MW', 'Copiapó, Atacama', '100 MWp', 'Construccion', 'en_progreso'),
    (default_comp_id, client_1_id, 'Techo Industrial Solar Santiago', 'Maipú, RM', '2.5 MWp', 'Permisos', 'en_progreso'),
    (default_comp_id, client_2_id, 'Parque Solar Antofagasta', 'Antofagasta', '150 MWp', 'Diseno', 'demorado'),
    (default_comp_id, client_3_id, 'Paneles Residenciales Condominio', 'Las Condes, RM', '15 kWp', 'Diseno', 'en_progreso');

END $$;
