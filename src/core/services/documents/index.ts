import { supabase } from '@/core/database/supabase';
import { getApiUrl } from '@/core/utils/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FolderRow {
  id: string;
  company_id: string;
  parent_id: string | null;
  project_id: string | null;
  department_id: string | null;
  name: string;
  created_at: string;
  /** client-side computed fields */
  childCount?: number;
  docCount?: number;
}

export interface DocumentRow {
  id: string;
  company_id: string;
  folder_id: string | null;
  name: string;
  physical_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  task_id: string | null;
  created_at: string;
}

export interface FolderFilters {
  parentId?: string | null;
  projectId?: string | null;
  departmentId?: string | null;
  /** null = root folders (parent_id IS NULL) */
  isRoot?: boolean;
}

// ─── Folder Operations ────────────────────────────────────────────────────────

/**
 * Fetch folders matching the given filters.
 * Pass isRoot=true to get top-level folders (parent_id IS NULL).
 */
export async function getFolders(filters?: FolderFilters): Promise<FolderRow[]> {
  let query = supabase.from('folders').select('*').order('name', { ascending: true });

  if (filters?.isRoot) {
    query = query.is('parent_id', null);
  } else if (filters?.parentId !== undefined) {
    if (filters.parentId === null) {
      query = query.is('parent_id', null);
    } else {
      query = query.eq('parent_id', filters.parentId);
    }
  }

  if (filters?.projectId !== undefined) {
    if (filters.projectId === null) {
      query = query.is('project_id', null);
    } else {
      query = query.eq('project_id', filters.projectId);
    }
  }

  if (filters?.departmentId) {
    query = query.eq('department_id', filters.departmentId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Fetch ALL folders for the company to build the full tree client-side.
 */
export async function getAllFolders(projectId?: string | null): Promise<FolderRow[]> {
  let query = supabase.from('folders').select('*').order('name', { ascending: true });
  if (projectId !== undefined) {
    if (projectId === null) {
      query = query.is('project_id', null);
    } else {
      query = query.eq('project_id', projectId);
    }
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Create a new folder in Supabase (no physical directory on Naski — files are stored flat by UUID).
 */
export async function createFolder(params: {
  name: string;
  parentId?: string | null;
  projectId?: string | null;
  departmentId?: string | null;
}): Promise<FolderRow> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No active session');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (!profile?.company_id) throw new Error('Company not found');

  const { data, error } = await supabase
    .from('folders')
    .insert({
      name: params.name,
      company_id: profile.company_id,
      parent_id: params.parentId ?? null,
      project_id: params.projectId ?? null,
      department_id: params.departmentId ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Rename a folder.
 */
export async function renameFolder(id: string, name: string): Promise<FolderRow> {
  const { data, error } = await supabase
    .from('folders')
    .update({ name })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Delete a folder. Documents inside will have their folder_id set to null (or cascade depending on DB).
 * We manually delete child documents first via the API.
 */
export async function deleteFolder(id: string): Promise<void> {
  const { error } = await supabase.from('folders').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Document Operations ───────────────────────────────────────────────────────

/**
 * Fetch documents inside a folder (or root documents with no folder).
 */
export async function getDocuments(folderId?: string | null): Promise<DocumentRow[]> {
  let query = supabase.from('documents').select('*').order('name', { ascending: true });

  if (folderId === null) {
    query = query.is('folder_id', null);
  } else if (folderId) {
    query = query.eq('folder_id', folderId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Fetch all documents for a project (via task linkage or direct folder).
 */
export async function getDocumentsByProject(projectId: string): Promise<DocumentRow[]> {
  // Get all folder IDs for this project
  const { data: folders } = await supabase
    .from('folders')
    .select('id')
    .eq('project_id', projectId);

  if (!folders || folders.length === 0) return [];

  const folderIds = folders.map(f => f.id);
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .in('folder_id', folderIds)
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Upload a file to Naski via the Next.js proxy API and link it to a folder in Supabase.
 * Returns the created document record.
 */
export async function uploadDocument(
  file: File,
  folderId?: string | null,
  projectId?: string | null,
  department?: string
): Promise<DocumentRow> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('No active session');

  const formData = new FormData();
  formData.append('file', file);
  if (folderId) formData.append('folderId', folderId);
  if (projectId) formData.append('projectId', projectId);
  if (department) formData.append('department', department);

  const response = await fetch(getApiUrl('/api/storage/upload'), {
    method: 'POST',
    headers: { 'x-user-jwt': token },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Error al subir archivo' }));
    throw new Error(err.error || `Error ${response.status}`);
  }

  const resData = await response.json();
  return resData.document as DocumentRow;
}

/**
 * Rename a document (metadata only — physical file UUID name doesn't change).
 */
export async function renameDocument(id: string, name: string): Promise<DocumentRow> {
  const { data, error } = await supabase
    .from('documents')
    .update({ name })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Move a document to a different folder.
 */
export async function moveDocument(id: string, folderId: string | null): Promise<DocumentRow> {
  const { data, error } = await supabase
    .from('documents')
    .update({ folder_id: folderId } as any)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Delete a document: removes physical file via bridge + deletes Supabase record.
 */
export async function deleteDocument(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('No active session');

  const response = await fetch(getApiUrl(`/api/storage/file/${id}`), {
    method: 'DELETE',
    headers: { 'x-user-jwt': token },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Error al eliminar archivo' }));
    throw new Error(err.error || `Error ${response.status}`);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a tree structure from a flat list of folders.
 */
export interface FolderNode extends FolderRow {
  children: FolderNode[];
}

export function buildFolderTree(folders: FolderRow[], parentId: string | null = null): FolderNode[] {
  return folders
    .filter(f => f.parent_id === parentId)
    .map(f => ({
      ...f,
      children: buildFolderTree(folders, f.id),
    }));
}

/** Get breadcrumb path from root to a given folder */
export function getFolderPath(folders: FolderRow[], folderId: string): FolderRow[] {
  const path: FolderRow[] = [];
  let current = folders.find(f => f.id === folderId);
  while (current) {
    path.unshift(current);
    current = current.parent_id ? folders.find(f => f.id === current!.parent_id) : undefined;
  }
  return path;
}

/** Format file size in human-readable form */
export function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Determine if a mime type is an image */
export function isImageMime(mime: string | null): boolean {
  return !!mime && mime.startsWith('image/');
}

/** Determine if a mime type is a PDF */
export function isPdfMime(mime: string | null): boolean {
  return mime === 'application/pdf';
}

/** Get file extension from filename */
export function getExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() || '';
}
