import { supabase } from '@/core/database/supabase';
import { Database } from '@/core/database/types';

export type TaskRow = Database['public']['Tables']['global_tasks']['Row'];
export type TaskInsert = Database['public']['Tables']['global_tasks']['Insert'];
export type TaskUpdate = Database['public']['Tables']['global_tasks']['Update'];

export interface TaskFilters {
  assignedTo?: string;
  projectId?: string;
  origin?: 'proyecto' | 'administracion' | 'consulta' | 'almacen';
  status?: 'pendiente' | 'en_progreso' | 'completada';
}

/**
 * Fetch all tasks scoped to the company via RLS.
 * Filter by assignment, project, origin, or status.
 */
export async function getTasks(filters?: TaskFilters): Promise<TaskRow[]> {
  let query = supabase.from('global_tasks').select('*');

  if (filters?.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo);
  }
  if (filters?.projectId) {
    query = query.eq('project_id', filters.projectId);
  }
  if (filters?.origin) {
    query = query.eq('origin', filters.origin);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  // Order by newest first
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching global tasks:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Create a new task. Injects company_id and created_by from active session.
 */
export async function createTask(taskData: {
  title: string;
  description?: string | null;
  origin: 'proyecto' | 'administracion' | 'consulta' | 'almacen';
  task_type: 'check' | 'entregable';
  assigned_to: string;
  project_id?: string | null;
}): Promise<TaskRow> {
  // Get active session user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('No active user session');
  }

  // Fetch company ID of current user from profiles
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (profileErr || !profile || !profile.company_id) {
    throw new Error('User company not found');
  }

  const newTask: TaskInsert = {
    company_id: profile.company_id,
    created_by: user.id,
    title: taskData.title,
    description: taskData.description || null,
    origin: taskData.origin,
    task_type: taskData.task_type,
    assigned_to: taskData.assigned_to,
    project_id: taskData.project_id || null,
    status: 'pendiente',
  };

  const { data, error } = await supabase
    .from('global_tasks')
    .insert(newTask)
    .select()
    .single();

  if (error) {
    console.error('Error creating task:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Update status of an existing task.
 */
export async function updateTaskStatus(
  taskId: string,
  status: 'pendiente' | 'en_progreso' | 'completada'
): Promise<TaskRow> {
  const { data, error } = await supabase
    .from('global_tasks')
    .update({ status } as TaskUpdate)
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('Error updating task status:', error);
    throw new Error(error.message);
  }

  return data;
}
