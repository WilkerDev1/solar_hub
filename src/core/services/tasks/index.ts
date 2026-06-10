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
  area?: 'legal' | 'almacen' | 'operaciones' | 'administracion' | 'general';
}

/**
 * Fetch all tasks scoped to the company via RLS.
 * Filter by assignment, project, origin, status, or area.
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
  if (filters?.area) {
    query = query.eq('area', filters.area);
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
  task_type: 'check' | 'entregable' | 'reporte' | 'evidencia';
  assigned_to: string;
  project_id?: string | null;
  area?: 'legal' | 'almacen' | 'operaciones' | 'administracion' | 'general';
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
    area: taskData.area || 'general',
    status: 'pendiente',
    audit_status: 'pendiente',
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

/**
 * Audit a task (Admin/Leader only).
 */
export async function auditTaskStatus(
  taskId: string,
  audit_status: 'pendiente' | 'aceptado' | 'denegado' | 'requiere_revision'
): Promise<TaskRow> {
  const { data, error } = await supabase
    .from('global_tasks')
    .update({ audit_status } as TaskUpdate)
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('Error auditing task status:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Upload task evidence to Supabase Storage and append to task.
 */
export async function uploadTaskEvidence(
  taskId: string,
  file: File,
  currentUrls: string[] = []
): Promise<TaskRow> {
  // 1. Upload to storage bucket "task_evidence"
  const fileExt = file.name.split('.').pop();
  const fileName = `${taskId}_${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${taskId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('task_evidence')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading evidence to bucket:', uploadError);
    throw new Error('No se pudo subir la evidencia. Asegúrate de que el Bucket "task_evidence" existe en Supabase.');
  }

  const { data: publicUrlData } = supabase.storage
    .from('task_evidence')
    .getPublicUrl(filePath);

  const newUrls = [...currentUrls, publicUrlData.publicUrl];

  // 2. Update task record
  const { data, error } = await supabase
    .from('global_tasks')
    .update({ evidence_urls: newUrls } as TaskUpdate)
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('Error linking evidence to task:', error);
    throw new Error(error.message);
  }

  return data;
}
