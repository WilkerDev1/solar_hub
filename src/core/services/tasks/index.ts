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
  assigned_to_ids?: string[] | null;
  project_id?: string | null;
  area?: 'legal' | 'almacen' | 'operaciones' | 'administracion' | 'general';
  priority?: 'baja' | 'media' | 'alta';
  due_date?: string | null;
  tags?: string[] | null;
  subtasks?: any[] | null;
  task_materials?: any[] | null;
  task_comments?: any[] | null;
  task_activities?: any[] | null;
  delivery_date?: string | null;
  requires_audit?: boolean;
  audit_comments?: string | null;
}): Promise<TaskRow> {
  // Get active session user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('No active user session');
  }

  // Fetch company ID of current user from profiles
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('company_id, full_name, email')
    .eq('id', user.id)
    .single();

  if (profileErr || !profile || !profile.company_id) {
    throw new Error('User company not found');
  }

  const assignedIds = taskData.assigned_to_ids && taskData.assigned_to_ids.length > 0 
    ? taskData.assigned_to_ids 
    : [taskData.assigned_to];

  const creatorName = profile.full_name || profile.email || 'Usuario';
  const creationActivity = {
    id: Math.random().toString(36).substring(2),
    profile_id: user.id,
    user_name: creatorName,
    action: 'Creación de Tarea',
    details: `Creó la tarea "${taskData.title}"`,
    created_at: new Date().toISOString()
  };

  const initialActivities = [creationActivity, ...(taskData.task_activities || [])];

  const newTask: TaskInsert = {
    company_id: profile.company_id,
    created_by: user.id,
    title: taskData.title,
    description: taskData.description || null,
    origin: taskData.origin,
    task_type: taskData.task_type,
    assigned_to: assignedIds[0] || taskData.assigned_to,
    assigned_to_ids: assignedIds,
    project_id: taskData.project_id || null,
    area: taskData.area || 'general',
    status: 'pendiente',
    audit_status: 'pendiente',
    audit_comments: taskData.audit_comments || null,
    requires_audit: taskData.requires_audit || false,
    priority: taskData.priority || 'baja',
    due_date: taskData.due_date || null,
    tags: taskData.tags || [],
    subtasks: taskData.subtasks || [],
    task_materials: taskData.task_materials || [],
    task_comments: taskData.task_comments || [],
    task_activities: initialActivities,
    delivery_date: taskData.delivery_date || null,
  } as any;

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
  const { data: { user } } = await supabase.auth.getUser();
  
  let userProfileName = 'Usuario';
  let userId = 'unknown';
  if (user) {
    userId = user.id;
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();
    userProfileName = profile?.full_name || profile?.email || 'Usuario';
  }

  const { data: currentTask } = await supabase
    .from('global_tasks')
    .select('task_activities, status, title')
    .eq('id', taskId)
    .single();

  let nextActivities: any[] = Array.isArray(currentTask?.task_activities) ? (currentTask.task_activities as any[]) : [];
  const statusLabels: Record<string, string> = {
    'pendiente': 'To Do (Pendiente)',
    'en_progreso': 'In Progress (En Curso)',
    'completada': 'Review / Done (Completada)'
  };
  
  const oldLabel = currentTask ? (statusLabels[currentTask.status] || currentTask.status) : 'desconocido';
  const newLabel = statusLabels[status] || status;

  nextActivities = [
    {
      id: Math.random().toString(36).substring(2),
      profile_id: userId,
      user_name: userProfileName,
      action: 'Cambio de Estado',
      details: `Cambió el estado de "${oldLabel}" a "${newLabel}"`,
      created_at: new Date().toISOString()
    },
    ...nextActivities
  ];

  const { data, error } = await supabase
    .from('global_tasks')
    .update({ 
      status,
      task_activities: nextActivities
    } as TaskUpdate)
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
  audit_status: 'pendiente' | 'aceptado' | 'denegado' | 'requiere_revision',
  audit_comments?: string | null
): Promise<TaskRow> {
  const { data: { user } } = await supabase.auth.getUser();
  let userProfileName = 'Auditor';
  let userId = 'unknown';
  if (user) {
    userId = user.id;
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();
    userProfileName = profile?.full_name || profile?.email || 'Auditor';
  }

  const { data: currentTask } = await supabase
    .from('global_tasks')
    .select('task_activities, title')
    .eq('id', taskId)
    .single();

  let nextActivities: any[] = Array.isArray(currentTask?.task_activities) ? (currentTask.task_activities as any[]) : [];
  
  const auditStatusLabels: Record<string, string> = {
    'pendiente': 'Pendiente de Auditoría',
    'aceptado': 'Aceptado (Aprobado)',
    'denegado': 'Rechazado',
    'requiere_revision': 'Requiere Revisión'
  };

  const statusLabel = auditStatusLabels[audit_status] || audit_status;
  const commentDetail = audit_comments ? ` - Detalle: "${audit_comments}"` : '';

  nextActivities = [
    {
      id: Math.random().toString(36).substring(2),
      profile_id: userId,
      user_name: userProfileName,
      action: 'Auditoría',
      details: `Marcó auditoría como "${statusLabel}"${commentDetail}`,
      created_at: new Date().toISOString()
    },
    ...nextActivities
  ];

  let nextStatus: string | undefined = undefined;
  if (audit_status === 'requiere_revision') {
    nextStatus = 'pendiente';
  } else if (audit_status === 'denegado') {
    nextStatus = 'pendiente';
  } else if (audit_status === 'aceptado') {
    nextStatus = 'completada';
  }

  const updates: TaskUpdate = {
    audit_status,
    audit_comments: audit_comments || null,
    task_activities: nextActivities
  };

  if (nextStatus) {
    updates.status = nextStatus;
  }

  const { data, error } = await supabase
    .from('global_tasks')
    .update(updates)
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
 * Update any allowed fields of an existing task.
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Omit<TaskUpdate, 'id' | 'company_id' | 'created_at' | 'created_by'>>
): Promise<TaskRow> {
  if (updates.assigned_to_ids && Array.isArray(updates.assigned_to_ids) && updates.assigned_to_ids.length > 0) {
    updates.assigned_to = updates.assigned_to_ids[0];
  }

  const { data: { user } } = await supabase.auth.getUser();
  let userProfileName = 'Usuario';
  let userId = 'unknown';
  if (user) {
    userId = user.id;
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();
    userProfileName = profile?.full_name || profile?.email || 'Usuario';
  }

  const { data: currentTask } = await supabase
    .from('global_tasks')
    .select('task_activities, status, title')
    .eq('id', taskId)
    .single();

  let nextActivities: any[] = Array.isArray(updates.task_activities || currentTask?.task_activities)
    ? (updates.task_activities || currentTask?.task_activities) as any[]
    : [];

  if (updates.status && currentTask && currentTask.status !== updates.status && !updates.task_activities) {
    const statusLabels: Record<string, string> = {
      'pendiente': 'To Do (Pendiente)',
      'en_progreso': 'In Progress (En Curso)',
      'completada': 'Review / Done (Completada)'
    };
    const oldLabel = statusLabels[currentTask.status] || currentTask.status;
    const newLabel = statusLabels[updates.status] || updates.status;
    nextActivities = [
      {
        id: Math.random().toString(36).substring(2),
        profile_id: userId,
        user_name: userProfileName,
        action: 'Cambio de Estado',
        details: `Cambió el estado de "${oldLabel}" a "${newLabel}"`,
        created_at: new Date().toISOString()
      },
      ...nextActivities
    ];
    updates.task_activities = nextActivities;
  }

  const { data, error } = await supabase
    .from('global_tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('Error updating task:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Delete an existing task.
 */
export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase
    .from('global_tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('Error deleting task:', error);
    throw new Error(error.message);
  }
}

/**
 * Upload task evidence to Naski storage and append to task.
 */
export async function uploadTaskEvidence(
  taskId: string,
  file: File,
  currentUrls: string[] = [],
  projectId?: string,
  department?: string
): Promise<TaskRow> {
  // Get active session token
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error('No hay sesión de usuario activa.');
  }

  // Create form data
  const formData = new FormData();
  formData.append('file', file);
  formData.append('taskId', taskId);
  if (projectId) formData.append('projectId', projectId);
  if (department) formData.append('department', department || 'general');

  // Call Next.js storage proxy API route
  const response = await fetch('/api/storage/upload', {
    method: 'POST',
    headers: {
      'x-user-jwt': token
    },
    body: formData
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({ error: 'Error desconocido al subir archivo' }));
    throw new Error(errData.error || `Error ${response.status}`);
  }

  const resData = await response.json();
  const newDocument = resData.document;
  const newUrl = `/api/storage/file/${newDocument.id}?name=${encodeURIComponent(newDocument.name)}`;

  const updatedUrls = [...currentUrls, newUrl];

  // Update task record
  const { data, error } = await supabase
    .from('global_tasks')
    .update({ evidence_urls: updatedUrls } as any)
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('Error linking evidence to task:', error);
    throw new Error(error.message);
  }

  return data;
}
