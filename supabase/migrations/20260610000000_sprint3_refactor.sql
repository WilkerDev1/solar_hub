-- Sprint 3 Migration: Refactorización Profunda del Esquema
-- Objetivo: Reubicar gps_coordinates a projects, flexibilizar clients, expandir profiles para RRHH

-- ============================================================
-- 1. CLIENTS: Eliminar gps_coordinates y hacer document_id nullable
-- ============================================================
ALTER TABLE clients DROP COLUMN IF EXISTS gps_coordinates;
ALTER TABLE clients ALTER COLUMN document_id DROP NOT NULL;

-- ============================================================
-- 2. PROJECTS: Añadir gps_coordinates para geolocalización de obra
-- ============================================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS gps_coordinates TEXT;

-- ============================================================
-- 3. PROFILES: Expandir para gestión de RRHH
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS occupation TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Políticas RLS adicionales para que admins puedan insertar perfiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Admins can insert profiles in their company'
  ) THEN
    CREATE POLICY "Admins can insert profiles in their company" ON profiles
      FOR INSERT WITH CHECK (company_id = get_user_active_company());
  END IF;
END $$;

-- Políticas RLS para que admins puedan actualizar perfiles de su compañía
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Admins can update profiles in their company'
  ) THEN
    CREATE POLICY "Admins can update profiles in their company" ON profiles
      FOR UPDATE USING (company_id = get_user_active_company());
  END IF;
END $$;

-- Políticas RLS para user_roles INSERT (necesario para asignación de roles)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_roles'
      AND policyname = 'Admins can manage user roles in their company'
  ) THEN
    CREATE POLICY "Admins can manage user roles in their company" ON user_roles
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM roles r
          WHERE r.id = user_roles.role_id
            AND r.company_id = get_user_active_company()
        )
      );
  END IF;
END $$;

-- Políticas RLS para role_permissions INSERT/DELETE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'role_permissions'
      AND policyname = 'Admins can manage role permissions in their company'
  ) THEN
    CREATE POLICY "Admins can manage role permissions in their company" ON role_permissions
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM roles r
          WHERE r.id = role_permissions.role_id
            AND r.company_id = get_user_active_company()
        )
      );
  END IF;
END $$;

-- ============================================================
-- 4. SEED DATA: Actualizar datos semilla
-- ============================================================
DO $$
DECLARE
  default_comp_id UUID;
  client_1_id UUID;
  client_2_id UUID;
  client_3_id UUID;
  seed_profile_id UUID;
BEGIN
  -- Obtener la compañía default
  SELECT id INTO default_comp_id FROM public.companies WHERE slug = 'default-tenant';

  IF default_comp_id IS NULL THEN
    INSERT INTO public.companies (name, slug, status)
    VALUES ('Default Solar Hub Tenant', 'default-tenant', 'active')
    RETURNING id INTO default_comp_id;
  END IF;

  -- Limpiar datos semilla previos (evitar duplicados en reset)
  DELETE FROM public.projects WHERE company_id = default_comp_id;
  DELETE FROM public.clients WHERE company_id = default_comp_id;

  -- Re-insertar clientes SIN gps_coordinates y con document_id opcional
  INSERT INTO public.clients (company_id, name, document_id, phone, address, status, category, avg_kwh_consumption)
  VALUES (default_comp_id, 'Agrícola Valle Central Ltda.', '76.123.456-7', '+56 9 8888 7777', 'Camino del Valle Km 12, Copiapó', 'activo', 'Comercial', 4500)
  RETURNING id INTO client_1_id;

  INSERT INTO public.clients (company_id, name, document_id, phone, address, status, category, avg_kwh_consumption)
  VALUES (default_comp_id, 'Minera del Norte S.A.', '88.987.654-K', '+56 9 9999 1111', 'Ruta Ch-21 Km 45, Calama', 'activo', 'Industrial', 125000)
  RETURNING id INTO client_2_id;

  INSERT INTO public.clients (company_id, name, phone, status, category, avg_kwh_consumption)
  VALUES (default_comp_id, 'Residencial Las Condes', '+56 9 4444 3333', 'prospecto', 'Residencial', 850)
  RETURNING id INTO client_3_id;

  -- Cliente rápido sin datos adicionales (simula registro con solo nombre)
  INSERT INTO public.clients (company_id, name, status)
  VALUES (default_comp_id, 'Juan Pérez (Prospecto Rápido)', 'prospecto');

  -- Insertar proyectos CON gps_coordinates (la geolocalización pertenece aquí)
  INSERT INTO public.projects (company_id, client_id, name, location, capacity, phase, status, gps_coordinates)
  VALUES
    (default_comp_id, client_2_id, 'Planta Solar Copiapó 100MW', 'Copiapó, Atacama', '100 MWp', 'Construccion', 'en_progreso', '-27.3670,-70.3320'),
    (default_comp_id, client_1_id, 'Techo Industrial Solar Santiago', 'Maipú, RM', '2.5 MWp', 'Permisos', 'en_progreso', '-33.5100,-70.7570'),
    (default_comp_id, client_2_id, 'Parque Solar Antofagasta', 'Antofagasta', '150 MWp', 'Diseno', 'demorado', '-23.6345,-70.3966'),
    (default_comp_id, client_3_id, 'Paneles Residenciales Condominio', 'Las Condes, RM', '15 kWp', 'Diseno', 'en_progreso', '-33.4144,-70.5732');

  -- Actualizar occupation en perfiles existentes (si hay alguno con esta compañía)
  UPDATE public.profiles
  SET occupation = ARRAY['Administración', 'Ingeniería']
  WHERE company_id = default_comp_id
    AND occupation = '{}'::TEXT[];

END $$;
