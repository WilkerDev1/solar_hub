-- Migration: Sprint 10 Advanced WMS Inventory and Warehouse Module
-- Objective: Create categories, tags, items, transactions, project BOM tables, RPC functions, and configure storage.

-- 1. Create Categories Table
CREATE TABLE IF NOT EXISTS public.inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (company_id, name)
);

-- 2. Create Tags Table
CREATE TABLE IF NOT EXISTS public.inventory_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (company_id, name)
);

-- 3. Create Items Table (Catalogue)
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  providers TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  tags TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  cost NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
  -- Physical metrics
  unit TEXT NOT NULL DEFAULT 'unidades',
  packaging TEXT, -- caja, bolsa, carrete, etc.
  length NUMERIC,
  weight NUMERIC,
  -- Stock
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock INTEGER NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (company_id, sku)
);

-- 4. Create Transactions Table (Auditable log)
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL, -- +/-
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('entrada', 'salida', 'ajuste')),
  reason TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Project Materials Table (BOM)
CREATE TABLE IF NOT EXISTS public.project_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0), -- En Sitio
  required_quantity INTEGER NOT NULL DEFAULT 0 CHECK (required_quantity >= 0), -- Requerido
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (project_id, item_id)
);

-- Enable RLS on all WMS tables
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_materials ENABLE ROW LEVEL SECURITY;

-- 6. Setup RLS Policies
-- Categories Policies
CREATE POLICY "View categories by company" ON public.inventory_categories
  FOR SELECT USING (company_id = get_user_active_company());
CREATE POLICY "Manage categories by company" ON public.inventory_categories
  FOR ALL USING (company_id = get_user_active_company() AND user_has_permission('inventory:write'));

-- Tags Policies
CREATE POLICY "View tags by company" ON public.inventory_tags
  FOR SELECT USING (company_id = get_user_active_company());
CREATE POLICY "Manage tags by company" ON public.inventory_tags
  FOR ALL USING (company_id = get_user_active_company() AND user_has_permission('inventory:write'));

-- Items Policies
CREATE POLICY "View items by company" ON public.inventory_items
  FOR SELECT USING (company_id = get_user_active_company());
CREATE POLICY "Manage items by company" ON public.inventory_items
  FOR ALL USING (company_id = get_user_active_company() AND user_has_permission('inventory:write'));

-- Transactions Policies
CREATE POLICY "View transactions by company" ON public.inventory_transactions
  FOR SELECT USING (company_id = get_user_active_company());
CREATE POLICY "Insert transactions by company" ON public.inventory_transactions
  FOR INSERT WITH CHECK (company_id = get_user_active_company() AND (user_has_permission('inventory:write') OR user_has_permission('inventory:use_material')));

-- Project Materials Policies
CREATE POLICY "View project materials by company" ON public.project_materials
  FOR SELECT USING (company_id = get_user_active_company());
CREATE POLICY "Manage project materials by company" ON public.project_materials
  FOR ALL USING (company_id = get_user_active_company() AND (user_has_permission('inventory:write') OR user_has_permission('inventory:use_material')));

-- 7. Stored Procedure: Atomic bulk stock adjustments
CREATE OR REPLACE FUNCTION public.process_inventory_transactions(adjustments jsonb)
RETURNS VOID AS $$
DECLARE
  adj RECORD;
  current_user_id UUID;
  user_company_id UUID;
BEGIN
  -- Retrieve execution context
  current_user_id := auth.uid();
  user_company_id := get_user_active_company();

  FOR adj IN SELECT * FROM jsonb_to_recordset(adjustments) AS x(item_id UUID, quantity INTEGER, transaction_type TEXT, reason TEXT) LOOP
    -- A. Update master stock and usage log
    UPDATE public.inventory_items
    SET 
      stock = stock + adj.quantity,
      usage_count = usage_count + CASE WHEN adj.transaction_type = 'salida' THEN ABS(adj.quantity) ELSE 0 END,
      updated_at = now()
    WHERE id = adj.item_id AND company_id = user_company_id;

    -- B. Insert transaction record
    INSERT INTO public.inventory_transactions (company_id, item_id, quantity, transaction_type, reason, created_by)
    VALUES (user_company_id, adj.item_id, adj.quantity, adj.transaction_type, adj.reason, current_user_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Stored Procedure: Atomic project materials dispatch
CREATE OR REPLACE FUNCTION public.dispatch_material_to_project(
  proj_id UUID,
  it_id UUID,
  qty INTEGER,
  reason TEXT
)
RETURNS VOID AS $$
DECLARE
  current_user_id UUID;
  user_company_id UUID;
  item_name TEXT;
  project_name TEXT;
  current_stock INTEGER;
BEGIN
  -- Retrieve execution context
  current_user_id := auth.uid();
  user_company_id := get_user_active_company();

  -- Retrieve and validate stock
  SELECT stock, name INTO current_stock, item_name 
  FROM public.inventory_items 
  WHERE id = it_id AND company_id = user_company_id;

  IF current_stock IS NULL THEN
    RAISE EXCEPTION 'Material no encontrado en esta compañía.';
  END IF;

  IF current_stock < qty THEN
    RAISE EXCEPTION 'Stock insuficiente para despachar. Stock disponible: %', current_stock;
  END IF;

  -- Validate project
  SELECT name INTO project_name 
  FROM public.projects 
  WHERE id = proj_id AND company_id = user_company_id;

  IF project_name IS NULL THEN
    RAISE EXCEPTION 'Proyecto no encontrado en esta compañía.';
  END IF;

  -- A. Decrement stock and increment usage log
  UPDATE public.inventory_items
  SET 
    stock = stock - qty,
    usage_count = usage_count + qty,
    updated_at = now()
  WHERE id = it_id AND company_id = user_company_id;

  -- B. Insert or update project_materials record
  INSERT INTO public.project_materials (company_id, project_id, item_id, quantity, required_quantity)
  VALUES (user_company_id, proj_id, it_id, qty, qty)
  ON CONFLICT (project_id, item_id)
  DO UPDATE SET 
    quantity = public.project_materials.quantity + EXCLUDED.quantity,
    updated_at = now();

  -- C. Record transaction in log
  INSERT INTO public.inventory_transactions (company_id, item_id, quantity, transaction_type, reason, created_by)
  VALUES (user_company_id, it_id, -qty, 'salida', COALESCE(reason, 'Despacho a proyecto: ' || project_name), current_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Storage Buckets and Policies Configuration
-- A. Create bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('inventory-images', 'inventory-images', true, 52428800, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- B. Create policies on storage objects for local environment
CREATE POLICY "Allow public read access on inventory images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'inventory-images');

CREATE POLICY "Allow authenticated upload access on inventory images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'inventory-images');

CREATE POLICY "Allow authenticated update access on inventory images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'inventory-images');

CREATE POLICY "Allow authenticated delete access on inventory images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'inventory-images');

-- 10. Seed permissions
INSERT INTO public.permissions (action, description) VALUES
  ('inventory:write', 'Crear y editar materiales de inventario'),
  ('inventory:read', 'Ver inventario'),
  ('inventory:use_material', 'Usar materiales en terreno')
ON CONFLICT (action) DO NOTHING;

-- Associate permissions to the Administrador template role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'Administrador' AND p.action IN ('inventory:write', 'inventory:read', 'inventory:use_material')
ON CONFLICT DO NOTHING;
