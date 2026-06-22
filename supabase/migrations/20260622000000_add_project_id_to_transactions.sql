-- Migration: Add project_id to inventory_transactions and update dispatch_material_to_project function
-- Objective: Support per-project dispatch history and metrics

-- 1. Add project_id column if not exists
ALTER TABLE public.inventory_transactions 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- 2. Update dispatch_material_to_project function to store the project_id
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

  -- C. Record transaction in log with project_id
  INSERT INTO public.inventory_transactions (company_id, item_id, quantity, transaction_type, reason, created_by, project_id)
  VALUES (user_company_id, it_id, -qty, 'salida', COALESCE(reason, 'Despacho a proyecto: ' || project_name), current_user_id, proj_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
