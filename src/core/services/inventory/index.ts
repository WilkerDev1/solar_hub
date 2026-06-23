import { supabase } from '@/core/database/supabase';
import { Database } from '@/core/database/types';

export type InventoryCategoryRow = Database['public']['Tables']['inventory_categories']['Row'];
export type InventoryTagRow = Database['public']['Tables']['inventory_tags']['Row'];
export type InventoryItemRow = Database['public']['Tables']['inventory_items']['Row'];
export type InventoryTransactionRow = Database['public']['Tables']['inventory_transactions']['Row'];
export type ProjectMaterialRow = Database['public']['Tables']['project_materials']['Row'];

export interface InventoryTransactionWithUser extends InventoryTransactionRow {
  profiles: {
    full_name: string | null;
  } | null;
}

export interface ProjectMaterialWithItem extends ProjectMaterialRow {
  inventory_items: {
    name: string;
    sku: string;
    unit: string;
    cost: number;
    image_url: string | null;
  } | null;
}

export interface InventoryAnalytics {
  totalItems: number;
  lowStockCount: number;
  topUsed: { id: string; name: string; sku: string; usage_count: number }[];
  leastUsed: { id: string; name: string; sku: string; usage_count: number }[];
  estimatedValue: number;
}

export interface BulkAdjustment {
  itemId: string;
  quantity: number;
  transactionType: 'entrada' | 'salida' | 'ajuste';
  reason: string;
}

/**
 * Retrieve user active company ID.
 */
async function getUserCompanyId(): Promise<string> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('No active user session');
  }

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (profileErr || !profile || !profile.company_id) {
    throw new Error('User company not found');
  }

  return profile.company_id;
}

/**
 * Search and filter inventory items.
 */
export async function getInventoryItems(options?: {
  searchQuery?: string;
  filterLowStock?: boolean;
  categoryId?: string;
  tag?: string;
}): Promise<InventoryItemRow[]> {
  let query = supabase.from('inventory_items').select('*');

  if (options?.searchQuery) {
    query = query.or(`name.ilike.%${options.searchQuery}%,sku.ilike.%${options.searchQuery}%`);
  }
  if (options?.categoryId && options.categoryId !== 'todos') {
    query = query.eq('category_id', options.categoryId);
  }
  if (options?.tag && options.tag !== 'todos') {
    query = query.contains('tags', [options.tag]);
  }

  const { data, error } = await query.order('name', { ascending: true });
  if (error) {
    console.error('Error fetching inventory items:', error);
    throw new Error(error.message);
  }

  if (options?.filterLowStock) {
    return (data || []).filter(item => item.stock <= item.min_stock);
  }

  return data || [];
}

/**
 * Create a new inventory item.
 */
export async function createInventoryItem(itemData: {
  category_id?: string | null;
  name: string;
  sku: string;
  description?: string | null;
  image_url?: string | null;
  image_urls?: string[];
  providers: string[];
  tags: string[];
  cost: number;
  unit: string;
  packaging?: string | null;
  length?: number | null;
  weight?: number | null;
  stock?: number;
  min_stock?: number;
}): Promise<InventoryItemRow> {
  const companyId = await getUserCompanyId();
  const firstImage = itemData.image_urls?.[0] || itemData.image_url || null;
  const { data, error } = await supabase
    .from('inventory_items')
    .insert({
      company_id: companyId,
      category_id: itemData.category_id || null,
      name: itemData.name,
      sku: itemData.sku,
      description: itemData.description || null,
      image_url: firstImage,
      image_urls: itemData.image_urls || [],
      providers: itemData.providers || [],
      tags: itemData.tags || [],
      cost: itemData.cost || 0,
      unit: itemData.unit || 'unidades',
      packaging: itemData.packaging || null,
      length: itemData.length || null,
      weight: itemData.weight || null,
      stock: itemData.stock || 0,
      min_stock: itemData.min_stock || 0,
      usage_count: 0
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating inventory item:', error);
    throw new Error(error.message);
  }

  // Record initial transaction log if stock > 0
  if (itemData.stock && itemData.stock > 0) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('inventory_transactions').insert({
      company_id: companyId,
      item_id: data.id,
      quantity: itemData.stock,
      transaction_type: 'entrada',
      reason: 'Ingreso de stock inicial',
      created_by: user?.id || null
    });
  }

  return data;
}

/**
 * Update an existing inventory item.
 */
export async function updateInventoryItem(
  id: string,
  updates: Partial<Omit<InventoryItemRow, 'id' | 'company_id' | 'created_at' | 'usage_count'>>
): Promise<InventoryItemRow> {
  if (updates.image_urls !== undefined) {
    updates.image_url = updates.image_urls?.[0] || null;
  }
  // 1. If stock is being updated, fetch the current item to calculate the delta and log a transaction
  let stockDelta = 0;
  let originalItem: InventoryItemRow | null = null;
  
  if (updates.stock !== undefined) {
    const { data: item } = await supabase
      .from('inventory_items')
      .select('stock, company_id')
      .eq('id', id)
      .single();
    if (item) {
      stockDelta = updates.stock - item.stock;
      originalItem = item as any;
    }
  }

  // 2. Perform the update
  const { data, error } = await supabase
    .from('inventory_items')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating inventory item:', error);
    throw new Error(error.message);
  }

  // 3. Insert transaction log if stock changed
  if (stockDelta !== 0 && originalItem) {
    const { data: { user } } = await supabase.auth.getUser();
    const type = stockDelta > 0 ? 'entrada' : 'salida';
    await supabase.from('inventory_transactions').insert({
      company_id: originalItem.company_id,
      item_id: id,
      quantity: stockDelta,
      transaction_type: type,
      reason: `Corrección manual de stock (de ${originalItem.stock} a ${updates.stock})`,
      created_by: user?.id || null
    });
  }

  return data;
}

/**
 * Fetch the latest transaction for all items, returned as a map of itemId -> InventoryTransactionRow.
 */
export async function getLatestTransactionsMap(): Promise<{ [itemId: string]: InventoryTransactionRow }> {
  const companyId = await getUserCompanyId();
  const { data, error } = await supabase
    .from('inventory_transactions')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching latest transactions map:', error);
    throw new Error(error.message);
  }

  const map: { [itemId: string]: InventoryTransactionRow } = {};
  if (data) {
    for (const tx of data) {
      if (!map[tx.item_id]) {
        map[tx.item_id] = tx;
      }
    }
  }
  return map;
}

/**
 * Delete an inventory item.
 */
export async function deleteInventoryItem(id: string): Promise<void> {
  const { error } = await supabase.from('inventory_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Fetch all categories.
 */
export async function getCategories(): Promise<InventoryCategoryRow[]> {
  const { data, error } = await supabase.from('inventory_categories').select('*').order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Create a new category.
 */
export async function createCategory(name: string): Promise<InventoryCategoryRow> {
  const companyId = await getUserCompanyId();
  const { data, error } = await supabase
    .from('inventory_categories')
    .insert({ company_id: companyId, name })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Delete a category.
 */
export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('inventory_categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Fetch all tags.
 */
export async function getTags(): Promise<InventoryTagRow[]> {
  const { data, error } = await supabase.from('inventory_tags').select('*').order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Create a new tag.
 */
export async function createTag(name: string): Promise<InventoryTagRow> {
  const companyId = await getUserCompanyId();
  const { data, error } = await supabase
    .from('inventory_tags')
    .insert({ company_id: companyId, name })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Delete a tag.
 */
export async function deleteTag(id: string): Promise<void> {
  const { error } = await supabase.from('inventory_tags').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Perform atomic bulk stock adjustments (invokes process_inventory_transactions stored procedure).
 */
export async function processBulkStockAdjustments(adjustments: BulkAdjustment[]): Promise<void> {
  const formatted = adjustments.map(adj => ({
    item_id: adj.itemId,
    quantity: adj.quantity,
    transaction_type: adj.transactionType,
    reason: adj.reason
  }));

  const { error } = await supabase.rpc('process_inventory_transactions', {
    adjustments: formatted
  });

  if (error) {
    console.error('Error in bulk adjustments:', error);
    throw new Error(error.message);
  }
}

/**
 * Dispatch material units directly to a project (invokes dispatch_material_to_project stored procedure).
 */
export async function dispatchMaterialToProject(params: {
  projectId: string;
  itemId: string;
  quantity: number;
  reason: string;
}): Promise<void> {
  const { error } = await supabase.rpc('dispatch_material_to_project', {
    proj_id: params.projectId,
    it_id: params.itemId,
    qty: params.quantity,
    reason: params.reason
  });

  if (error) {
    console.error('Error dispatching material to project:', error);
    throw new Error(error.message);
  }
}

/**
 * Add inline project material requirement to BOM list.
 */
export async function addProjectMaterialRequirement(
  projectId: string,
  itemId: string,
  requiredQuantity: number
): Promise<ProjectMaterialRow> {
  const companyId = await getUserCompanyId();
  
  // Check if requirement already exists
  const { data: existing } = await supabase
    .from('project_materials')
    .select('*')
    .eq('project_id', projectId)
    .eq('item_id', itemId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('project_materials')
      .update({
        required_quantity: existing.required_quantity + requiredQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating project material requirement:', error);
      throw new Error(error.message);
    }
    return data;
  } else {
    const { data, error } = await supabase
      .from('project_materials')
      .insert({
        company_id: companyId,
        project_id: projectId,
        item_id: itemId,
        quantity: 0,
        required_quantity: requiredQuantity
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting project material requirement:', error);
      throw new Error(error.message);
    }
    return data;
  }
}

/**
 * Retrieve project materials (BOM).
 */
export async function getProjectMaterials(projectId: string): Promise<ProjectMaterialWithItem[]> {
  const { data, error } = await supabase
    .from('project_materials')
    .select(`
      *,
      inventory_items (
        name,
        sku,
        unit,
        cost,
        image_url
      )
    `)
    .eq('project_id', projectId);

  if (error) {
    console.error('Error fetching project materials:', error);
    throw new Error(error.message);
  }

  return (data as any[] || []).map(row => ({
    ...row,
    inventory_items: row.inventory_items || null
  }));
}

/**
 * Retrieve transactions audit log for a specific item.
 */
export async function getInventoryTransactions(itemId: string): Promise<InventoryTransactionWithUser[]> {
  const { data, error } = await supabase
    .from('inventory_transactions')
    .select(`
      *,
      profiles:created_by (
        full_name
      )
    `)
    .eq('item_id', itemId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching inventory transactions:', error);
    throw new Error(error.message);
  }

  return (data as any[] || []).map(row => ({
    ...row,
    profiles: row.profiles || null
  }));
}

/**
 * Fetch and calculate inventory WMS analytics indicators.
 */
export async function getInventoryAnalytics(): Promise<InventoryAnalytics> {
  const companyId = await getUserCompanyId();

  // 1. Fetch total unique items count
  const { count: totalItems, error: errTotal } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId);
  if (errTotal) throw new Error(errTotal.message);

  // 2. Fetch key metrics data for computation
  const { data: allItems, error: errItems } = await supabase
    .from('inventory_items')
    .select('id, name, sku, stock, min_stock, usage_count, cost')
    .eq('company_id', companyId);
  if (errItems) throw new Error(errItems.message);

  const lowStockCount = (allItems || []).filter(item => item.stock <= item.min_stock).length;

  // Compute estimated financial inventory valuation: SUM(stock * cost)
  const estimatedValue = (allItems || []).reduce((acc, item) => acc + (item.stock * (item.cost || 0)), 0);

  // 3. Compute top used / least used items lists
  const sortedItems = [...(allItems || [])].sort((a, b) => b.usage_count - a.usage_count);
  const topUsed = sortedItems.slice(0, 5);
  const leastUsed = [...allItems].sort((a, b) => a.usage_count - b.usage_count).slice(0, 5);

  return {
    totalItems: totalItems || 0,
    lowStockCount,
    topUsed: topUsed.map(x => ({ id: x.id, name: x.name, sku: x.sku, usage_count: x.usage_count })),
    leastUsed: leastUsed.map(x => ({ id: x.id, name: x.name, sku: x.sku, usage_count: x.usage_count })),
    estimatedValue
  };
}

/**
 * Upload image physical file to local storage bucket.
 */
export async function uploadInventoryItemImage(file: File, targetName?: string): Promise<string> {
  const fileExt = file.name.split('.').pop() || 'png';
  let prefix = 'item';
  if (targetName) {
    prefix = targetName
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents/tildes
      .replace(/[^a-z0-9\-_]/g, '_')  // replace non-safe chars with underscore
      .replace(/__+/g, '_')           // collapse multiple underscores
      .replace(/^_+|_+$/g, '');       // trim leading/trailing underscores
    if (!prefix) prefix = 'item';
  }
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const fileName = `${prefix}_${randomSuffix}.${fileExt}`;
  const filePath = `items/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('inventory-images')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading inventory image:', uploadError);
    throw new Error('No se pudo subir la imagen al Storage. Asegúrate de que el Bucket "inventory-images" existe.');
  }

  const { data: publicUrlData } = supabase.storage
    .from('inventory-images')
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

/**
 * Update an existing category name.
 */
export async function updateCategory(id: string, name: string): Promise<InventoryCategoryRow> {
  const { data, error } = await supabase
    .from('inventory_categories')
    .update({ name })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Update an existing tag name.
 */
export async function updateTag(id: string, name: string): Promise<InventoryTagRow> {
  const { data, error } = await supabase
    .from('inventory_tags')
    .update({ name })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Rename a provider globally across all items.
 */
export async function renameProviderGlobally(oldName: string, newName: string): Promise<void> {
  const { data: items, error: fetchErr } = await supabase
    .from('inventory_items')
    .select('id, providers');
    
  if (fetchErr) throw new Error(fetchErr.message);
  if (!items) return;

  for (const item of items) {
    if (item.providers && item.providers.includes(oldName)) {
      const updated = item.providers.map(p => p === oldName ? newName : p);
      const { error: updateErr } = await supabase
        .from('inventory_items')
        .update({ providers: updated })
        .eq('id', item.id);
      if (updateErr) {
        console.error(`Error renaming provider for item ${item.id}:`, updateErr);
      }
    }
  }
}

/**
 * Remove a provider globally from all items.
 */
export async function removeProviderGlobally(providerName: string): Promise<void> {
  const { data: items, error: fetchErr } = await supabase
    .from('inventory_items')
    .select('id, providers');

  if (fetchErr) throw new Error(fetchErr.message);
  if (!items) return;

  for (const item of items) {
    if (item.providers && item.providers.includes(providerName)) {
      const updated = item.providers.filter(p => p !== providerName);
      const { error: updateErr } = await supabase
        .from('inventory_items')
        .update({ providers: updated })
        .eq('id', item.id);
      if (updateErr) {
        console.error(`Error removing provider from item ${item.id}:`, updateErr);
      }
    }
  }
}

export interface ProjectDispatchTransaction extends InventoryTransactionRow {
  inventory_items: {
    name: string;
    sku: string;
    unit: string;
    image_url: string | null;
  } | null;
  profiles: {
    full_name: string | null;
  } | null;
}

/**
 * Retrieve transactions audit log for a specific project.
 */
export async function getProjectDispatchHistory(projectId: string): Promise<ProjectDispatchTransaction[]> {
  const { data, error } = await supabase
    .from('inventory_transactions')
    .select(`
      *,
      inventory_items (
        name,
        sku,
        unit,
        image_url
      ),
      profiles:created_by (
        full_name
      )
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching project dispatch history:', error);
    throw new Error(error.message);
  }

  return (data as any[] || []).map(row => ({
    ...row,
    inventory_items: row.inventory_items || null,
    profiles: row.profiles || null
  }));
}
