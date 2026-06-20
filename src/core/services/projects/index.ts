import { supabase } from '@/core/database/supabase';

export interface ProjectFilters {
  status?: string;
  phase?: string;
  search?: string;
}

export const getProjects = async (filters?: ProjectFilters) => {
  let query = supabase.from('projects').select('*, clients(name)').order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'todos') {
    query = query.eq('status', filters.status);
  }
  
  if (filters?.phase && filters.phase !== 'todas') {
    query = query.eq('phase', filters.phase);
  }
  
  if (filters?.search) {
    // Busca tanto en el nombre del proyecto como en el del cliente si es necesario
    // Para simplificar, buscamos en el nombre del proyecto
    query = query.ilike('name', `%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const createProject = async (data: { client_id: string; name: string; phase: string; capacity?: string; location?: string; status?: string }) => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Usuario no autenticado");
  
  const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.user.id).single();
  if (!profile) throw new Error("Perfil de usuario no encontrado");
  if (!profile.company_id) throw new Error("El usuario no tiene una compañía activa asignada");

  const { data: newProj, error } = await supabase.from('projects').insert([{
    company_id: profile.company_id as string,
    ...data
  }]).select().single();

  if (error) throw error;
  return newProj;
};

export const deleteProject = async (projectId: string) => {
  // Las llaves foráneas ON DELETE CASCADE limpiarán las global_tasks y project_messages asociadas.
  const { error } = await supabase.from('projects').delete().eq('id', projectId);
  if (error) throw error;
};

export const archiveProject = async (projectId: string) => {
  const { error } = await supabase.from('projects').update({ status: 'archivado' }).eq('id', projectId);
  if (error) throw error;
};

export const updateProject = async (
  projectId: string,
  data: {
    name?: string;
    client_id?: string;
    phase?: string;
    capacity?: string | null;
    location?: string | null;
    gps_coordinates?: string | null;
    status?: string;
    description?: string | null;
    banner_url?: string | null;
    member_ids?: string[] | null;
  }
) => {
  const { data: updatedProj, error } = await supabase
    .from('projects')
    .update(data)
    .eq('id', projectId)
    .select()
    .single();

  if (error) throw error;
  return updatedProj;
};
