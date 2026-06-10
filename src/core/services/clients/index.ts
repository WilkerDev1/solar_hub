import { supabase } from '@/core/database/supabase';
import { Database } from '@/core/database/types';

export type ClientRow = Database['public']['Tables']['clients']['Row'];
export type ClientInsert = Database['public']['Tables']['clients']['Insert'];
export type ClientUpdate = Database['public']['Tables']['clients']['Update'];
export type ProjectRow = Database['public']['Tables']['projects']['Row'];
export type ProjectInsert = Database['public']['Tables']['projects']['Insert'];

export interface ClientFilters {
  status?: string;
  search?: string;
  category?: string;
}

/**
 * Fetch all clients belonging to the authenticated user's tenant (handled by RLS).
 * Optionally filter by status, category, or search query (matching name or document_id).
 */
export async function getClients(filters?: ClientFilters): Promise<ClientRow[]> {
  let query = supabase.from('clients').select('*');

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters?.category && filters.category !== 'all') {
    query = query.eq('category', filters.category);
  }

  if (filters?.search) {
    const searchTerm = `%${filters.search}%`;
    query = query.or(`name.ilike.${searchTerm},document_id.ilike.${searchTerm}`);
  }

  // Order by newest first
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching clients:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Quick-create a new client. Only `name` is required.
 * RLS ensures the record is associated with the user's active company.
 */
export async function createClient(
  clientData: { name: string } & Partial<Omit<ClientInsert, 'id' | 'company_id' | 'created_at' | 'created_by' | 'name'>>
): Promise<ClientRow> {
  // Get active session user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('No active user session');
  }

  // Fetch the company ID of the current user from profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || !profile.company_id) {
    throw new Error('User does not have an active company profile');
  }

  const newClient: ClientInsert = {
    name: clientData.name,
    company_id: profile.company_id,
    created_by: user.id,
    status: clientData.status || 'prospecto',
    ...(clientData.document_id && { document_id: clientData.document_id }),
    ...(clientData.phone && { phone: clientData.phone }),
    ...(clientData.address && { address: clientData.address }),
    ...(clientData.category && { category: clientData.category }),
    ...(clientData.avg_kwh_consumption !== undefined && { avg_kwh_consumption: clientData.avg_kwh_consumption }),
  };

  const { data, error } = await supabase
    .from('clients')
    .insert(newClient)
    .select()
    .single();

  if (error) {
    console.error('Error creating client:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Update the status of a client.
 */
export async function updateClientStatus(
  clientId: string,
  status: 'activo' | 'inactivo' | 'prospecto'
): Promise<ClientRow> {
  const { data, error } = await supabase
    .from('clients')
    .update({ status } as ClientUpdate)
    .eq('id', clientId)
    .select()
    .single();

  if (error) {
    console.error('Error updating client status:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Update client details (for the editable profile form).
 */
export async function updateClient(
  clientId: string,
  clientData: Partial<Omit<ClientInsert, 'id' | 'company_id' | 'created_at' | 'created_by'>>
): Promise<ClientRow> {
  const { data, error } = await supabase
    .from('clients')
    .update(clientData as ClientUpdate)
    .eq('id', clientId)
    .select()
    .single();

  if (error) {
    console.error('Error updating client:', error);
    throw new Error(error.message);
  }

  return data;
}

export interface ClientProfile extends ClientRow {
  projects: ProjectRow[];
}

/**
 * Fetch client details by ID, including all related projects.
 */
export async function getClientProfile(clientId: string): Promise<ClientProfile> {
  // 1. Fetch client
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();

  if (clientError || !client) {
    console.error('Error fetching client profile:', clientError);
    throw new Error(clientError?.message || 'Client not found');
  }

  // 2. Fetch projects associated with client (now includes gps_coordinates)
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (projectsError) {
    console.error('Error fetching client projects:', projectsError);
    throw new Error(projectsError.message);
  }

  return {
    ...client,
    projects: projects || [],
  };
}

/**
 * Create a new project linked to a specific client.
 * Automatically injects company_id and created_by from the active session.
 */
export async function createProject(
  projectData: {
    client_id: string;
    name: string;
    location?: string;
    gps_coordinates?: string;
    capacity?: string;
    phase?: 'Diseno' | 'Permisos' | 'Construccion' | 'Operacion';
    status?: 'completado' | 'en_progreso' | 'demorado';
  }
): Promise<ProjectRow> {
  // Get active session user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('No active user session');
  }

  // Fetch the company ID of the current user
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || !profile.company_id) {
    throw new Error('User does not have an active company profile');
  }

  const newProject: ProjectInsert = {
    client_id: projectData.client_id,
    company_id: profile.company_id,
    created_by: user.id,
    name: projectData.name,
    location: projectData.location || null,
    gps_coordinates: projectData.gps_coordinates || null,
    capacity: projectData.capacity || null,
    phase: projectData.phase || 'Diseno',
    status: projectData.status || 'en_progreso',
  };

  const { data, error } = await supabase
    .from('projects')
    .insert(newProject)
    .select()
    .single();

  if (error) {
    console.error('Error creating project:', error);
    throw new Error(error.message);
  }

  return data;
}
