-- Seed initial WMS Inventory categories and items for the company
DO $$
DECLARE
  comp_id UUID;
  cat_paneles_id UUID;
  cat_inversores_id UUID;
  cat_cableado_id UUID;
  cat_conectores_id UUID;
BEGIN
  -- Get the first active company
  SELECT id INTO comp_id FROM public.companies LIMIT 1;
  
  IF comp_id IS NOT NULL THEN
    -- 1. Insert categories
    INSERT INTO public.inventory_categories (company_id, name)
    VALUES 
      (comp_id, 'Paneles Solares'),
      (comp_id, 'Inversores'),
      (comp_id, 'Cableado'),
      (comp_id, 'Conectores')
    ON CONFLICT (company_id, name) DO UPDATE SET name = EXCLUDED.name;

    -- Fetch their IDs
    SELECT id INTO cat_paneles_id FROM public.inventory_categories WHERE company_id = comp_id AND name = 'Paneles Solares';
    SELECT id INTO cat_inversores_id FROM public.inventory_categories WHERE company_id = comp_id AND name = 'Inversores';
    SELECT id INTO cat_cableado_id FROM public.inventory_categories WHERE company_id = comp_id AND name = 'Cableado';
    SELECT id INTO cat_conectores_id FROM public.inventory_categories WHERE company_id = comp_id AND name = 'Conectores';

    -- 2. Insert items using categories
    INSERT INTO public.inventory_items (company_id, category_id, name, sku, stock, unit, min_stock, cost)
    VALUES 
      (comp_id, cat_paneles_id, 'Panel Solar Trina 550W Vertex S+', 'SOL-PL-TR550', 1240, 'unidades', 10, 150.00),
      (comp_id, cat_inversores_id, 'Inversor SMA Sunny Tripower 50kW', 'SOL-INV-SMA50', 18, 'unidades', 2, 2500.00),
      (comp_id, cat_cableado_id, 'Cable de Cobre Solar 4mm2 Rojo (100m)', 'SOL-CB-RED4MM', 3, 'rollos', 5, 85.00),
      (comp_id, cat_conectores_id, 'Conectores MC4 Macho/Hembra', 'SOL-MC4-CONN', 0, 'unidades', 20, 1.50)
    ON CONFLICT (company_id, sku) DO UPDATE 
    SET stock = EXCLUDED.stock,
        category_id = EXCLUDED.category_id,
        cost = EXCLUDED.cost,
        min_stock = EXCLUDED.min_stock;
        
  END IF;
END $$;
