'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Calendar, User, Tag, Clock, ClipboardList, AlertCircle, Plus, 
  Trash2, Upload, FileText, Check, MessageSquare, Briefcase, 
  RefreshCw, CheckSquare, Square, ChevronRight, Activity, Paperclip, Send,
  Loader2, FolderKanban, Folder, Flag, Search, ChevronsUp, ChevronDown, Equal
} from 'lucide-react';
import { updateTask, auditTaskStatus, uploadTaskEvidence, deleteTask, TaskRow } from '@/core/services/tasks';
import { Button } from '@/core/components/ui/button';
import { supabase } from '@/core/database/supabase';
import { useAuth } from '@/core/auth/AuthContext';
import { getApiUrl } from '@/core/utils/api';
import { useRouter } from 'next/navigation';

interface TaskDetailDrawerProps {
  task: TaskRow | null;
  isOpen: boolean;
  onClose: () => void;
  employees: any[];
  user?: any;
  projects?: any[];
  onTaskUpdated: () => void;
  initialEditMode?: boolean; // Kept for backwards compatibility but unused
}

export default function TaskDetailDrawer({
  task,
  isOpen,
  onClose,
  employees,
  user,
  projects = [],
  onTaskUpdated
}: TaskDetailDrawerProps) {
  const { roles } = useAuth();
  const router = useRouter();

  // General States
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [documentMap, setDocumentMap] = useState<Record<string, { name: string; mime_type: string }>>({});

  // Editable Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToIds, setAssignedToIds] = useState<string[]>([]);
  const [projectId, setProjectId] = useState('');
  const [taskType, setTaskType] = useState('check');
  const [area, setArea] = useState('general');
  const [priority, setPriority] = useState('baja');
  const [dueDate, setDueDate] = useState('');
  const [requiresAudit, setRequiresAudit] = useState(false);
  const [tags, setTags] = useState<string[]>([]);

  // Popover controls
  const [activePopover, setActivePopover] = useState<'assignee' | 'project' | 'area' | 'priority' | 'due_date' | 'tags' | 'add_checklist' | null>(null);
  const [empSearch, setEmpSearch] = useState('');
  const [projSearch, setProjSearch] = useState('');
  const [tagInput, setTagInput] = useState('');

  // Checklist controls
  const [checklistActive, setChecklistActive] = useState(false);
  const [checklistTitle, setChecklistTitle] = useState('Checklist');
  const [addingChecklistItem, setAddingChecklistItem] = useState(false);
  const [newChecklistItemTitle, setNewChecklistItemTitle] = useState('');
  const [localSubtasks, setLocalSubtasks] = useState<any[]>([]);

  // Chat Feed Controls
  const [chatCommentText, setChatCommentText] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showActivityDetails, setShowActivityDetails] = useState(true);

  // Sync token
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token || null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch document metadata
  useEffect(() => {
    if (task && isOpen) {
      supabase
        .from('documents')
        .select('id, name, mime_type')
        .eq('task_id', task.id)
        .then(({ data, error }) => {
          if (!error && data) {
            const map: Record<string, { name: string; mime_type: string }> = {};
            data.forEach(d => {
              map[d.id] = { name: d.name, mime_type: d.mime_type || '' };
            });
            setDocumentMap(map);
          }
        });
    }
  }, [task, isOpen]);

  // Sync state with task data
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setAssignedToIds((task as any).assigned_to_ids || (task.assigned_to ? [task.assigned_to] : []));
      setProjectId(task.project_id || '');
      setTaskType(task.task_type);
      setArea(task.area || 'general');
      setPriority((task as any).priority || 'baja');
      setDueDate((task as any).due_date ? new Date((task as any).due_date).toISOString().split('T')[0] : '');
      setRequiresAudit((task as any).requires_audit || false);
      setTags((task as any).tags || []);
      
      const sub = (task as any).subtasks;
      const hasSub = Array.isArray(sub);
      setChecklistActive(hasSub);
      setLocalSubtasks(hasSub ? sub : []);
      
      // Load checklist title from localstorage
      if (typeof window !== 'undefined') {
        const storedTitle = localStorage.getItem(`checklist_title_${task.id}`);
        setChecklistTitle(storedTitle || 'Checklist');
      }
    }
  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  const getDownloadUrl = (url: string) => {
    if (url.startsWith('/api/storage/file/')) {
      const urlWithToken = token ? `${url}${url.includes('?') ? '&' : '?'}token=${token}` : url;
      return getApiUrl(urlWithToken);
    }
    return url;
  };

  // Helper to log activities
  const logActivity = (actionText: string, detailsText: string, updatedActivities: any[] = []) => {
    const list = updatedActivities.length > 0 ? updatedActivities : ((task as any).task_activities || []);
    const newAct = {
      id: Math.random().toString(36).substring(2),
      profile_id: user?.id || 'unknown',
      user_name: user?.full_name || user?.email || 'Usuario',
      action: actionText,
      details: detailsText,
      created_at: new Date().toISOString()
    };
    return [newAct, ...list];
  };

  // Main saving function
  const handleQuickSave = async (fieldsToUpdate: any) => {
    try {
      await updateTask(task.id, fieldsToUpdate);
      onTaskUpdated();
    } catch (err: any) {
      console.error('Error saving task attributes:', err.message);
    }
  };

  // Input blurs
  const handleTitleBlur = async () => {
    if (title.trim() && title !== task.title) {
      const logList = logActivity('Título Modificado', `Cambió el título de "${task.title}" a "${title}"`);
      await handleQuickSave({ title, task_activities: logList });
    }
  };

  const handleDescriptionBlur = async () => {
    if (description !== (task.description || '')) {
      const logList = logActivity('Descripción Modificada', 'Actualizó la descripción de la tarea');
      await handleQuickSave({ description, task_activities: logList });
    }
  };

  // Selectors handlers
  const handlePrioritySelect = async (nextPriority: string) => {
    setPriority(nextPriority);
    setActivePopover(null);
    const logList = logActivity('Prioridad Modificada', `Estableció prioridad en "${nextPriority}"`);
    await handleQuickSave({ priority: nextPriority, task_activities: logList });
  };

  const handleAreaSelect = async (nextArea: string) => {
    setArea(nextArea);
    setActivePopover(null);
    const logList = logActivity('Área Modificada', `Cambió el departamento a "${nextArea}"`);
    await handleQuickSave({ area: nextArea, task_activities: logList });
  };

  const handleProjectSelect = async (nextProjId: string) => {
    setProjectId(nextProjId);
    setActivePopover(null);
    const name = projects.find(p => p.id === nextProjId)?.name || 'Sin vincular';
    const logList = logActivity('Proyecto Modificado', `Vinculó la tarea al proyecto "${name}"`);
    await handleQuickSave({ project_id: nextProjId || null, task_activities: logList });
  };

  const handleDateSelect = async (nextDate: string) => {
    setDueDate(nextDate);
    setActivePopover(null);
    const logList = logActivity('Fecha Modificada', `Estableció fecha de vencimiento al ${nextDate}`);
    await handleQuickSave({ due_date: nextDate || null, task_activities: logList });
  };

  const handleMemberToggle = async (empId: string) => {
    let nextIds = [...assignedToIds];
    const isChecked = nextIds.includes(empId);
    if (isChecked) {
      nextIds = nextIds.filter(id => id !== empId);
    } else {
      nextIds = [...nextIds, empId];
    }
    setAssignedToIds(nextIds);
    const empName = employees.find(e => e.id === empId)?.full_name || 'Miembro';
    const logList = logActivity('Miembros Modificados', `${isChecked ? 'Quitó a' : 'Asignó a'} ${empName}`);
    await handleQuickSave({ 
      assigned_to: nextIds[0] || '', 
      assigned_to_ids: nextIds, 
      task_activities: logList 
    });
  };

  const handleTaskTypeChange = async (nextType: string) => {
    setTaskType(nextType);
    setActivePopover(null);
    const logList = logActivity('Tipo Modificado', `Cambió el tipo a "${nextType}"`);
    const updates: any = { task_type: nextType, task_activities: logList };
    if (nextType === 'check' && !checklistActive) {
      updates.subtasks = [];
      setChecklistActive(true);
    }
    await handleQuickSave(updates);
  };

  const handleRequiresAuditToggle = async (checked: boolean) => {
    setRequiresAudit(checked);
    const logList = logActivity('Auditoría Modificada', `${checked ? 'Exigió' : 'Desactivó la exigencia de'} auditoría de líder`);
    await handleQuickSave({ requires_audit: checked, task_activities: logList });
  };

  // Tag actions
  const handleAddTag = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        const next = [...tags, tagInput.trim()];
        setTags(next);
        const logList = logActivity('Etiqueta Añadida', `Añadió etiqueta "${tagInput.trim()}"`);
        await handleQuickSave({ tags: next, task_activities: logList });
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = async (t: string) => {
    const next = tags.filter(tag => tag !== t);
    setTags(next);
    const logList = logActivity('Etiqueta Eliminada', `Eliminó etiqueta "${t}"`);
    await handleQuickSave({ tags: next, task_activities: logList });
  };

  // Checklist Actions
  const handleAddChecklist = async () => {
    setChecklistActive(true);
    setChecklistTitle('Checklist');
    setActivePopover(null);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`checklist_title_${task.id}`, 'Checklist');
    }
    const logList = logActivity('Checklist Añadido', 'Añadió una lista de verificación a esta tarjeta');
    await handleQuickSave({ subtasks: [], task_activities: logList });
  };

  const handleDeleteChecklist = async () => {
    if (!window.confirm('¿Deseas eliminar la lista de verificación?')) return;
    setChecklistActive(false);
    setLocalSubtasks([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`checklist_title_${task.id}`);
    }
    const logList = logActivity('Checklist Eliminado', 'Eliminó la lista de verificación');
    await handleQuickSave({ subtasks: null, task_activities: logList });
  };

  const handleSaveChecklistTitle = (title: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`checklist_title_${task.id}`, title);
    }
    setChecklistTitle(title);
  };

  const handleConfirmAddChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistItemTitle.trim()) return;
    const current = localSubtasks;
    const newItem = {
      id: Math.random().toString(36).substring(2),
      title: newChecklistItemTitle.trim(),
      completed: false
    };
    const next = [...current, newItem];
    setLocalSubtasks(next);
    setNewChecklistItemTitle('');
    setAddingChecklistItem(false);
    const logList = logActivity('Elemento Checklist Añadido', `Añadió el elemento "${newItem.title}"`);
    await handleQuickSave({ subtasks: next, task_activities: logList });
  };

  const handleToggleSubtaskItem = async (itemId: string) => {
    const next = localSubtasks.map(item => {
      if (item.id === itemId) return { ...item, completed: !item.completed };
      return item;
    });
    setLocalSubtasks(next);
    const item = localSubtasks.find(s => s.id === itemId);
    const logList = logActivity(
      'Checklist Modificado', 
      `${item.completed ? 'Desmarcó' : 'Marcó'} como completada la subtarea "${item.title}"`
    );
    await handleQuickSave({ subtasks: next, task_activities: logList });
  };

  const handleDeleteSubtaskItem = async (itemId: string) => {
    const item = localSubtasks.find(s => s.id === itemId);
    const next = localSubtasks.filter(s => s.id !== itemId);
    setLocalSubtasks(next);
    const logList = logActivity('Elemento Checklist Eliminado', `Eliminó el elemento "${item?.title}"`);
    await handleQuickSave({ subtasks: next, task_activities: logList });
  };

  const handleSaveSubtasks = async (nextList: any[]) => {
    await handleQuickSave({ subtasks: nextList });
  };

  // Upload Evidence from Toolbar
  const handleUploadToolbarEvidence = async (files: FileList | null) => {
    if (!files || files.length === 0 || !task) return;
    setUploadingFile(true);
    try {
      const file = files[0];
      const currentUrls = task.evidence_urls || [];
      await uploadTaskEvidence(
        task.id,
        file,
        currentUrls,
        task.project_id || undefined,
        task.area || undefined
      );
      const logList = logActivity('Archivo Subido', `Cargó el archivo adjunto: ${file.name}`);
      await updateTask(task.id, { task_activities: logList });
      onTaskUpdated();
    } catch (err: any) {
      alert('Error al subir archivo: ' + err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  // Chat comments/evidence upload
  const handleConfirmAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatCommentText.trim()) return;
    const current = (task as any).task_comments || [];
    const nextComment = {
      id: Math.random().toString(36).substring(2),
      profile_id: user?.id,
      user_name: user?.full_name || user?.email || 'Usuario',
      text: chatCommentText.trim(),
      created_at: new Date().toISOString()
    };
    const next = [nextComment, ...current];
    setChatCommentText('');
    const logList = logActivity('Comentario Añadido', 'Escribió un comentario');
    await handleQuickSave({ task_comments: next, task_activities: logList });
  };

  const handleUploadFileFromChat = async (files: FileList | null) => {
    if (!files || files.length === 0 || !task) return;
    setUploadingFile(true);
    try {
      const file = files[0];
      const currentUrls = task.evidence_urls || [];
      const updatedTask = await uploadTaskEvidence(
        task.id,
        file,
        currentUrls,
        task.project_id || undefined,
        task.area || undefined
      );
      const newUrl = updatedTask.evidence_urls ? updatedTask.evidence_urls[updatedTask.evidence_urls.length - 1] : '';
      
      const currentComments = (task as any).task_comments || [];
      const nextComment = {
        id: Math.random().toString(36).substring(2),
        profile_id: user?.id,
        user_name: user?.full_name || user?.email || 'Usuario',
        text: `He adjuntado el archivo: ${file.name}`,
        created_at: new Date().toISOString(),
        attachment_url: newUrl
      };
      const nextComments = [nextComment, ...currentComments];
      const logList = logActivity('Archivo Adjunto', `Adjuntó el archivo: ${file.name}`);

      await updateTask(task.id, { 
        task_comments: nextComments, 
        task_activities: logList 
      });
      onTaskUpdated();
    } catch (err: any) {
      alert('Error al subir archivo desde el chat: ' + err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteAttachment = async (url: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este adjunto?')) return;
    const nextUrls = (task.evidence_urls || []).filter(u => u !== url);
    const nextComments = ((task as any).task_comments || []).filter((c: any) => c.attachment_url !== url);
    
    // Find name
    let filename = 'archivo';
    try {
      const nameParam = new URL(url, 'http://localhost').searchParams.get('name');
      if (nameParam) filename = nameParam;
    } catch (e) {}

    const logList = logActivity('Adjunto Eliminado', `Eliminó el archivo adjunto: ${filename}`);
    await handleQuickSave({
      evidence_urls: nextUrls,
      task_comments: nextComments,
      task_activities: logList
    });
  };

  const handleDeleteCommentAttachment = async (commentId: string, url: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este adjunto?')) return;
    const nextUrls = (task.evidence_urls || []).filter(u => u !== url);
    const nextComments = ((task as any).task_comments || []).map((c: any) => 
      c.id === commentId ? { ...c, attachment_url: null, text: '(Archivo adjunto eliminado)' } : c
    );
    const logList = logActivity('Adjunto Chat Eliminado', 'Eliminó un archivo adjunto del chat');
    await handleQuickSave({
      evidence_urls: nextUrls,
      task_comments: nextComments,
      task_activities: logList
    });
  };

  const handleDeleteTaskAction = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta tarea permanentemente?')) return;
    setLoading(true);
    try {
      await deleteTask(task.id);
      onClose();
      onTaskUpdated();
    } catch (err: any) {
      alert('Error al eliminar tarea: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Mixed Feed (Comments + Activities)
  const commentsList = ((task as any).task_comments || []).map((c: any) => ({ ...c, type: 'comment' as const }));
  const activitiesList = ((task as any).task_activities || []).map((a: any) => ({ ...a, type: 'activity' as const }));
  const mixedFeed = [...commentsList, ...activitiesList].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const filteredFeed = showActivityDetails ? mixedFeed : mixedFeed.filter(item => item.type === 'comment');

  // Filter lists
  const filteredEmployees = employees.filter(emp => 
    emp.full_name.toLowerCase().includes(empSearch.toLowerCase())
  );
  const filteredProjects = projects.filter(proj => 
    proj.name.toLowerCase().includes(projSearch.toLowerCase())
  );

  // Subtask metrics
  const totalSubtasks = localSubtasks.length;
  const completedSubtasks = localSubtasks.filter(s => s.completed).length;
  const checklistProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <>
      {/* Background overlay */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-black/80 backdrop-blur-xs z-40 transition-opacity duration-300"
      />

      {/* Popovers click-away backdrop */}
      {activePopover && (
        <div 
          className="fixed inset-0 z-45 bg-transparent cursor-default" 
          onClick={() => setActivePopover(null)} 
        />
      )}

      {/* Main sheet container - max-w-5xl */}
      <div className="fixed inset-y-0 right-0 w-full max-w-5xl bg-[#1e1e24] border-l border-[#2c2d34]/60 shadow-2xl flex flex-col z-50 transform transition-transform duration-300 ease-in-out translate-x-0">
        
        {/* Panel Header */}
        <div className="p-4 border-b border-[#2c2d34]/60 flex justify-between items-center bg-zinc-900/10 shrink-0">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-emerald-400" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">Detalles de Tarea</span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              type="button" 
              onClick={handleDeleteTaskAction}
              disabled={loading}
              className="bg-rose-650/10 hover:bg-rose-600 border border-rose-500/20 text-rose-400 hover:text-white font-bold h-8 text-xs px-3 rounded-lg flex items-center gap-1 transition-all"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              <span>Eliminar Tarjeta</span>
            </Button>
            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-[#121315] rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Unified View/Edit Body Split - 2 Columns */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 divide-y md:divide-y-0 md:divide-x divide-[#2c2d34]/60">
          
          {/* Left Column: Details, description, checklist & attachments */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            
            {/* Title Input (Editable) */}
            <div className="space-y-1 text-left">
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                className="w-full bg-transparent border-none text-xl font-bold text-white outline-none focus:bg-[#16161c] px-3 py-1.5 rounded-xl transition-all font-sans"
                placeholder="Título de la tarea"
              />
            </div>

            {/* Display active attributes */}
            <div className="flex flex-wrap gap-5 text-left">
              {assignedToIds.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Miembros</span>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {assignedToIds.map(id => {
                      const emp = employees.find(e => e.id === id);
                      if (!emp) return null;
                      return (
                        <div 
                          key={emp.id} 
                          className="h-7 w-7 rounded-full bg-emerald-600 border border-emerald-505/20 flex items-center justify-center text-[10px] font-bold text-white uppercase cursor-default"
                          title={`${emp.full_name} (${emp.roleName})`}
                        >
                          {emp.full_name?.charAt(0).toUpperCase()}
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setActivePopover('assignee')}
                      className="h-7 w-7 rounded-full bg-[#2c2d34] hover:bg-[#3c3d47] border border-[#3e3f4a] flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {dueDate && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Vencimiento</span>
                  <div className="flex items-center gap-2 bg-[#2c2d34] border border-[#3e3f4a] rounded-lg px-2.5 py-1 text-xs font-bold text-zinc-300 mt-1">
                    <Calendar className="h-3.5 w-3.5 text-amber-500" />
                    <span>{new Date(dueDate).toLocaleDateString([], { day: 'numeric', month: 'short' })}</span>
                    <button 
                      type="button" 
                      onClick={async () => {
                        setDueDate('');
                        await handleQuickSave({ due_date: null });
                      }}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-400 ml-1.5"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              {projectId && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Proyecto / Obra</span>
                  <div className="flex items-center gap-2 bg-[#2c2d34] border border-[#3e3f4a] rounded-lg px-2.5 py-1 text-xs font-bold text-zinc-300 mt-1">
                    <FolderKanban className="h-3.5 w-3.5 text-blue-500" />
                    <span className="truncate max-w-[150px]">{projects.find(p => p.id === projectId)?.name || 'Obra'}</span>
                    <button 
                      type="button" 
                      onClick={async () => {
                        setProjectId('');
                        await handleQuickSave({ project_id: null });
                      }}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-400 ml-1.5"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              {area && area !== 'general' && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Departamento</span>
                  <div className="flex items-center gap-2 bg-[#2c2d34] border border-[#3e3f4a] rounded-lg px-2.5 py-1 text-xs font-bold text-zinc-300 mt-1 uppercase font-mono">
                    <Briefcase className="h-3.5 w-3.5 text-indigo-500" />
                    <span>{area}</span>
                  </div>
                </div>
              )}

              {priority && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Prioridad</span>
                  <div className={`flex items-center gap-2 bg-[#2c2d34] border border-[#3e3f4a] rounded-lg px-2.5 py-1 text-xs font-bold mt-1 uppercase ${
                    priority === 'alta' ? 'text-rose-400' : priority === 'media' ? 'text-yellow-400' : 'text-zinc-400'
                  }`}>
                    {priority === 'alta' ? (
                      <ChevronsUp className="h-3.5 w-3.5 text-rose-500" />
                    ) : priority === 'media' ? (
                      <Equal className="h-3.5 w-3.5 text-amber-500 rotate-90" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-blue-500" />
                    )}
                    <span>{priority}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Compact Actions Toolbar (Trello style) */}
            <div className="space-y-2 pt-2 text-left">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono block">Barra de Herramientas</span>
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. Miembros popover */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActivePopover('assignee')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2c2d34] border border-[#3e3f4a] hover:bg-[#383948] text-[11px] font-bold text-zinc-300 hover:text-white rounded-lg transition-all"
                  >
                    <User className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Miembros</span>
                  </button>

                  {activePopover === 'assignee' && (
                    <div className="absolute left-0 mt-1.5 w-64 bg-[#25262c] border border-[#3c3d47] rounded-xl p-3 shadow-2xl z-50 flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 bg-[#16161c] border border-[#2c2d34]/60 px-2 py-1 rounded-lg">
                        <Search className="h-3.5 w-3.5 text-zinc-500" />
                        <input
                          type="text"
                          placeholder="Buscar miembro..."
                          value={empSearch}
                          onChange={e => setEmpSearch(e.target.value)}
                          className="bg-transparent border-none text-[11px] text-white focus:outline-none focus:ring-0 w-full"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
                        {filteredEmployees.map(emp => {
                          const isChecked = assignedToIds.includes(emp.id);
                          return (
                            <button
                              key={emp.id}
                              type="button"
                              onClick={() => handleMemberToggle(emp.id)}
                              className={`w-full text-left text-[11px] font-semibold p-2 hover:bg-[#2c2d34] rounded-lg flex items-center justify-between ${
                                isChecked ? 'bg-[#2c2d34] text-emerald-400 font-bold' : 'text-zinc-300'
                              }`}
                            >
                              <span>{emp.full_name}</span>
                              {isChecked && <Check className="h-3 w-3 text-emerald-400" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Obra / Proyecto popover */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActivePopover('project')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2c2d34] border border-[#3e3f4a] hover:bg-[#383948] text-[11px] font-bold text-zinc-300 hover:text-white rounded-lg transition-all"
                  >
                    <Folder className="h-3.5 w-3.5 text-blue-500" />
                    <span>Obra / Proyecto</span>
                  </button>

                  {activePopover === 'project' && (
                    <div className="absolute left-0 mt-1.5 w-64 bg-[#25262c] border border-[#3c3d47] rounded-xl p-3 shadow-2xl z-50 flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 bg-[#16161c] border border-[#2c2d34]/60 px-2 py-1 rounded-lg">
                        <Search className="h-3.5 w-3.5 text-zinc-500" />
                        <input
                          type="text"
                          placeholder="Buscar obra..."
                          value={projSearch}
                          onChange={e => setProjSearch(e.target.value)}
                          className="bg-transparent border-none text-[11px] text-white focus:outline-none focus:ring-0 w-full"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
                        <button
                          type="button"
                          onClick={() => handleProjectSelect('')}
                          className={`w-full text-left text-[11px] font-semibold p-2 hover:bg-[#2c2d34] rounded-lg ${
                            !projectId ? 'bg-[#2c2d34] text-emerald-450 font-bold' : 'text-zinc-400'
                          }`}
                        >
                          Sin vincular
                        </button>
                        {filteredProjects.map(proj => (
                          <button
                            key={proj.id}
                            type="button"
                            onClick={() => handleProjectSelect(proj.id)}
                            className={`w-full text-left text-[11px] font-semibold p-2 hover:bg-[#2c2d34] rounded-lg ${
                              projectId === proj.id ? 'bg-[#2c2d34] text-emerald-450 font-bold' : 'text-zinc-300'
                            }`}
                          >
                            {proj.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Departamento popover */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActivePopover('area')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2c2d34] border border-[#3e3f4a] hover:bg-[#383948] text-[11px] font-bold text-zinc-300 hover:text-white rounded-lg transition-all"
                  >
                    <Briefcase className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Departamento</span>
                  </button>

                  {activePopover === 'area' && (
                    <div className="absolute left-0 mt-1.5 w-48 bg-[#25262c] border border-[#3c3d47] rounded-xl p-2 shadow-2xl z-50 flex flex-col gap-1">
                      {[
                        { key: 'general', label: 'General' },
                        { key: 'operaciones', label: 'Operaciones' },
                        { key: 'almacen', label: 'Almacén' },
                        { key: 'administracion', label: 'Administración' },
                        { key: 'legal', label: 'Legal' }
                      ].map(item => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => handleAreaSelect(item.key)}
                          className={`w-full text-left text-[11px] font-semibold p-2 hover:bg-[#2c2d34] rounded-lg ${
                            area === item.key ? 'bg-[#2c2d34] text-emerald-450 font-bold' : 'text-zinc-300'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Prioridad popover */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActivePopover('priority')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2c2d34] border border-[#3e3f4a] hover:bg-[#383948] text-[11px] font-bold text-zinc-300 hover:text-white rounded-lg transition-all"
                  >
                    <Flag className="h-3.5 w-3.5 text-rose-500" />
                    <span>Prioridad</span>
                  </button>

                  {activePopover === 'priority' && (
                    <div className="absolute left-0 mt-1.5 w-40 bg-[#25262c] border border-[#3c3d47] rounded-xl p-2 shadow-2xl z-50 flex flex-col gap-1">
                      {[
                        { key: 'baja', label: 'Baja' },
                        { key: 'media', label: 'Media' },
                        { key: 'alta', label: 'Alta' }
                      ].map(item => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => handlePrioritySelect(item.key)}
                          className={`w-full text-left text-[11px] font-semibold p-2 hover:bg-[#2c2d34] rounded-lg flex items-center justify-between ${
                            priority === item.key ? 'bg-[#2c2d34] text-emerald-450 font-bold' : 'text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {item.key === 'alta' ? (
                              <ChevronsUp className="h-3.5 w-3.5 text-rose-500" />
                            ) : item.key === 'media' ? (
                              <Equal className="h-3.5 w-3.5 text-amber-500 rotate-90" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-blue-500" />
                            )}
                            <span>{item.label}</span>
                          </div>
                          {priority === item.key && <span className="h-1.5 w-1.5 rounded-full bg-emerald-450" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 5. Fechas popover (floating upwards to prevent boundary clipping) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActivePopover('due_date')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2c2d34] border border-[#3e3f4a] hover:bg-[#383948] text-[11px] font-bold text-zinc-300 hover:text-white rounded-lg transition-all"
                  >
                    <Calendar className="h-3.5 w-3.5 text-amber-500" />
                    <span>Fechas</span>
                  </button>

                  {activePopover === 'due_date' && (
                    <div className="absolute left-0 bottom-full mb-1.5 w-56 bg-[#25262c] border border-[#3c3d47] rounded-xl p-3 shadow-2xl z-50 flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Vencimiento</label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={e => handleDateSelect(e.target.value)}
                        className="bg-[#16161c] border border-[#2c2d34]/60 text-xs text-white rounded-lg p-2 focus:outline-none focus:border-emerald-500 w-full"
                      />
                      <div className="flex justify-between items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={async () => {
                            setDueDate('');
                            setActivePopover(null);
                            await handleQuickSave({ due_date: null });
                          }}
                          className="text-[9.5px] font-bold text-rose-500 hover:underline"
                        >
                          Limpiar
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivePopover(null)}
                          className="text-[9.5px] font-bold text-emerald-450 hover:underline"
                        >
                          Confirmar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. Checklist button */}
                <button
                  type="button"
                  onClick={handleAddChecklist}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2c2d34] border border-[#3e3f4a] hover:bg-[#383948] text-[11px] font-bold text-zinc-300 hover:text-white rounded-lg transition-all"
                >
                  <CheckSquare className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Checklist</span>
                </button>

                {/* 7. Adjunto button */}
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2c2d34] border border-[#3e3f4a] hover:bg-[#383948] text-[11px] font-bold text-zinc-300 hover:text-white rounded-lg transition-all cursor-pointer">
                  {uploadingFile ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                  ) : (
                    <Paperclip className="h-3.5 w-3.5 text-amber-500" />
                  )}
                  <span>Adjunto</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={e => handleUploadToolbarEvidence(e.target.files)}
                  />
                </label>

                {/* 8. Tipo & Auditoria Settings */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActivePopover('tags')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2c2d34] border border-[#3e3f4a] hover:bg-[#383948] text-[11px] font-bold text-[#10b981] hover:text-[#34d399] rounded-lg transition-all"
                  >
                    <Tag className="h-3.5 w-3.5" />
                    <span>Tipo y Auditoría</span>
                  </button>

                  {activePopover === 'tags' && (
                    <div className="absolute right-0 bottom-full mb-1.5 w-60 bg-[#25262c] border border-[#3c3d47] rounded-xl p-3.5 shadow-2xl z-50 flex flex-col gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase font-mono block">Tipo de Tarea</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleTaskTypeChange('check')}
                            className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                              taskType === 'check' 
                                ? 'bg-[#16161c] border-emerald-600 text-emerald-450 font-bold' 
                                : 'bg-[#16161c] border-[#2c2d34]/60 text-zinc-400 hover:border-[#3c3d47] text-xs'
                            }`}
                          >
                            <CheckSquare className="h-4 w-4 mb-1" />
                            <span className="text-[9.5px]">Check Rápido</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTaskTypeChange('entregable')}
                            className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                              taskType === 'entregable' 
                                ? 'bg-[#16161c] border-emerald-600 text-emerald-450 font-bold' 
                                : 'bg-[#16161c] border-[#2c2d34]/60 text-zinc-400 hover:border-[#3c3d47] text-xs'
                            }`}
                          >
                            <FileText className="h-4 w-4 mb-1" />
                            <span className="text-[9.5px]">Entregable</span>
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#2c2d34]/60 flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="drawer-requires-audit-checkbox"
                          checked={requiresAudit}
                          onChange={e => handleRequiresAuditToggle(e.target.checked)}
                          className="rounded border-[#2c2d34]/60 bg-[#16161c] text-emerald-600 focus:ring-emerald-500/20 h-4 w-4 cursor-pointer"
                        />
                        <label 
                          htmlFor="drawer-requires-audit-checkbox" 
                          className="text-[10px] font-bold text-zinc-400 cursor-pointer select-none leading-tight"
                        >
                          Exigir Auditoría de Líder
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description Textarea (Editable with blur autosave) */}
            <div className="space-y-1.5 text-left pt-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono block">Descripción</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                className="w-full bg-[#16161c] border border-[#2c2d34]/60 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 focus:bg-[#121217] placeholder-zinc-650 h-28 resize-none transition-all leading-relaxed"
                placeholder="Añadir una descripción más detallada sobre la ejecución de esta tarea..."
              />
            </div>

            {/* Checklist Section (Dynamic) */}
            {checklistActive && (
              <div className="space-y-3 pt-4 border-t border-[#2c2d34]/60 text-left">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-emerald-450">
                    <CheckSquare className="h-4.5 w-4.5" />
                    <input
                      type="text"
                      value={checklistTitle}
                      onChange={e => handleSaveChecklistTitle(e.target.value)}
                      className="bg-transparent border-none text-xs font-bold text-zinc-200 focus:bg-[#16161c] focus:outline-none px-2 py-0.5 rounded-lg w-64"
                      placeholder="Título de Checklist"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteChecklist}
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-400 hover:underline"
                  >
                    Eliminar
                  </button>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-zinc-400 font-bold w-6 text-right">{checklistProgress}%</span>
                  <div className="flex-1 h-1.5 bg-[#16161c] rounded-full overflow-hidden border border-[#2c2d34]/60">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-300" 
                      style={{ width: `${checklistProgress}%` }}
                    />
                  </div>
                </div>

                {/* Checklist Items list */}
                <div className="space-y-1">
                  {localSubtasks.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between group py-0.5">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={sub.completed}
                          onChange={() => handleToggleSubtaskItem(sub.id)}
                          className="rounded border-[#2c2d34]/60 bg-[#16161c] text-emerald-600 focus:ring-emerald-500/20 h-4 w-4 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={sub.title}
                          onChange={e => {
                            const next = localSubtasks.map(s => s.id === sub.id ? { ...s, title: e.target.value } : s);
                            setLocalSubtasks(next);
                          }}
                          onBlur={() => handleSaveSubtasks(localSubtasks)}
                          className={`bg-transparent border-none text-xs text-zinc-300 focus:bg-[#16161c] focus:outline-none px-2 py-0.5 rounded-lg flex-1 min-w-0 ${
                            sub.completed ? 'line-through text-zinc-500' : ''
                          }`}
                        />
                      </div>
                      <button 
                        type="button"
                        onClick={() => handleDeleteSubtaskItem(sub.id)}
                        className="p-1 text-zinc-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add item interface */}
                {addingChecklistItem ? (
                  <form onSubmit={handleConfirmAddChecklistItem} className="space-y-2 pl-6">
                    <input
                      type="text"
                      value={newChecklistItemTitle}
                      onChange={e => setNewChecklistItemTitle(e.target.value)}
                      placeholder="Añadir un elemento..."
                      className="w-full bg-[#16161c] border border-[#2c2d34]/60 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-8 text-xs px-3 rounded-lg">
                        Añadir
                      </Button>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => {
                          setAddingChecklistItem(false);
                          setNewChecklistItemTitle('');
                        }}
                        className="text-zinc-500 h-8 text-xs px-3 rounded-lg"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="pl-6">
                    <button
                      type="button"
                      onClick={() => setAddingChecklistItem(true)}
                      className="text-xs font-bold text-zinc-400 hover:text-white bg-[#2c2d34] border border-[#3e3f4a] hover:bg-[#383948] px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Añadir un elemento
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Attachments Section */}
            {task.evidence_urls && task.evidence_urls.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-[#2c2d34]/60 text-left">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Paperclip className="h-4.5 w-4.5" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Adjuntos</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {task.evidence_urls.map((url, i) => {
                    let filename = `Archivo_${i + 1}`;
                    let extension = '';
                    let mimeType = '';
                    
                    const match = url.match(/\/api\/storage\/file\/([a-f0-9-]+)/i);
                    const fileId = match ? match[1] : null;
                    const docInfo = fileId ? documentMap[fileId] : null;
                    
                    if (docInfo) {
                      filename = docInfo.name;
                      mimeType = docInfo.mime_type;
                    } else {
                      try {
                        if (url.startsWith('/api/storage/file/')) {
                          const urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
                          const nameParam = urlObj.searchParams.get('name');
                          if (nameParam) filename = nameParam;
                        } else {
                          filename = url.split('/').pop() || filename;
                        }
                      } catch (e) {
                        filename = url.split('/').pop() || filename;
                      }
                    }
                    
                    extension = filename.split('.').pop()?.toLowerCase() || '';
                    const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(extension) || mimeType.startsWith('image/');

                    return (
                      <div key={i} className="flex gap-2.5 bg-[#16161c] border border-[#2c2d34]/60 p-3 rounded-xl relative group">
                        {isImage ? (
                          <div className="h-14 w-20 rounded bg-[#25262c] overflow-hidden shrink-0 border border-[#2c2d34]/60">
                            <img src={getDownloadUrl(url)} alt={filename} className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="h-14 w-20 rounded bg-[#25262c] flex items-center justify-center text-xs text-zinc-400 font-bold shrink-0 border border-[#2c2d34]/60">
                            {extension.toUpperCase() || 'DOC'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0 text-left flex flex-col justify-center">
                          <a 
                            href={getDownloadUrl(url)} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="font-bold text-xs text-zinc-300 hover:text-emerald-450 hover:underline truncate block"
                          >
                            {filename}
                          </a>
                          <span className="text-[9px] text-zinc-550 font-mono mt-0.5">Adjuntado</span>
                          {isImage && (
                            <button
                              type="button"
                              onClick={() => {
                                const isCurrentCover = localStorage.getItem(`task-cover-${task.id}`) === url;
                                if (isCurrentCover) {
                                  localStorage.removeItem(`task-cover-${task.id}`);
                                } else {
                                  localStorage.setItem(`task-cover-${task.id}`, url);
                                }
                                onTaskUpdated();
                              }}
                              className={`text-[9px] font-bold mt-1.5 w-fit px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                                (localStorage.getItem(`task-cover-${task.id}`) === url || 
                                 (!localStorage.getItem(`task-cover-${task.id}`) && task.evidence_urls?.[0] === url))
                                  ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
                                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white hover:bg-zinc-750'
                              }`}
                            >
                              {(localStorage.getItem(`task-cover-${task.id}`) === url || 
                                (!localStorage.getItem(`task-cover-${task.id}`) && task.evidence_urls?.[0] === url))
                                  ? 'Portada Activa'
                                  : 'Hacer Portada'}
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachment(url)}
                          className="p-1 text-zinc-500 hover:text-rose-500 transition-colors absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tags section */}
            <div className="space-y-2 pt-2 text-left">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono block">Etiquetas</span>
              <input 
                type="text" 
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Presiona Enter para agregar..."
                className="w-full bg-[#16161c] border border-[#2c2d34]/60 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 focus:bg-[#121217]" 
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((t, idx) => (
                  <span key={idx} className="bg-[#2c2d34] border border-[#3e3f4a] text-zinc-300 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-semibold">
                    {t}
                    <X className="h-3 w-3 text-zinc-500 hover:text-white cursor-pointer" onClick={() => handleRemoveTag(t)} />
                  </span>
                ))}
              </div>
            </div>

            {/* Auditoria Section */}
            {task.requires_audit && (
              <div className="bg-[#16161c] border border-[#2c2d34]/60 rounded-2xl p-5 space-y-4 text-left">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-400" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Auditoría del Líder</span>
                  </div>
                  <span className={`text-[10px] font-bold uppercase border px-2.5 py-0.5 rounded-full ${
                    task.audit_status === 'aceptado' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800' :
                    task.audit_status === 'denegado' ? 'bg-rose-950/40 text-rose-400 border-rose-800' :
                    task.audit_status === 'requiere_revision' ? 'bg-amber-950/40 text-amber-400 border-amber-800' :
                    'bg-[#2c2d34] text-zinc-400 border-[#3e3f4a]'
                  }`}>
                    {task.audit_status === 'pendiente' ? 'Pendiente' : 
                     task.audit_status === 'aceptado' ? 'Aprobado' : 
                     task.audit_status === 'denegado' ? 'Rechazado' : 
                     task.audit_status === 'requiere_revision' ? 'Cambios Solicitados' : task.audit_status}
                  </span>
                </div>
                {task.audit_comments && (
                  <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl space-y-1">
                    <span className="text-[9px] font-bold text-amber-400 font-mono uppercase">Instrucciones:</span>
                    <p className="text-zinc-350 text-xs leading-relaxed">{task.audit_comments}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Unified Comments & Activities Chat */}
          <div className="w-full md:w-96 flex flex-col min-h-0 bg-[#17171d]/20 border-l border-zinc-200 dark:border-[#2c2d34]/60">
            <div className="p-4 border-b border-[#2c2d34]/60 flex items-center justify-between bg-zinc-900/10 shrink-0">
              <div className="flex items-center gap-2 text-zinc-350">
                <MessageSquare className="h-4.5 w-4.5 text-emerald-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider">Comentarios y Actividad</span>
              </div>
              <button 
                type="button" 
                onClick={() => setShowActivityDetails(!showActivityDetails)}
                className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-widest font-mono transition-colors"
              >
                {showActivityDetails ? 'Ocultar detalles' : 'Mostrar detalles'}
              </button>
            </div>

            {/* Chat list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {filteredFeed.length === 0 ? (
                <div className="py-12 text-center text-zinc-600 flex flex-col items-center gap-2">
                  <MessageSquare className="h-8 w-8 opacity-20" />
                  <span className="text-xs">No hay actividad o comentarios en esta tarea.</span>
                </div>
              ) : (
                filteredFeed.map((item: any) => {
                  if (item.type === 'comment') {
                    return (
                      <div key={item.id} className="flex gap-3 bg-[#1e1e24] border border-[#2c2d34]/60 p-3 rounded-xl relative group">
                        <div className="h-7 w-7 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                          {item.user_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex justify-between items-baseline">
                            <span className="text-xs font-bold text-zinc-200">{item.user_name}</span>
                            <span className="text-[9px] text-zinc-550 font-mono">
                              {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{item.text}</p>
                          
                          {item.attachment_url && (
                            <div className="mt-2 flex items-center gap-2 bg-[#16161c] border border-[#2c2d34]/60 p-2 rounded-lg relative group/file">
                              <FileText className="h-4 w-4 text-emerald-400 shrink-0" />
                              <span className="text-[10px] text-zinc-350 truncate flex-1 select-all">{item.attachment_url.split('name=').pop() || 'archivo'}</span>
                              <button 
                                type="button" 
                                onClick={() => handleDeleteCommentAttachment(item.id, item.attachment_url)}
                                className="p-1 text-zinc-500 hover:text-rose-500 transition-colors absolute top-1 right-1 opacity-0 group-hover/file:opacity-100"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  } else {
                    // System activity row
                    return (
                      <div key={item.id} className="flex gap-3 px-2 text-left">
                        <div className="h-6 w-6 rounded-full bg-[#2c2d34] border border-[#3c3d47] flex items-center justify-center text-[8.5px] font-bold text-zinc-400 shrink-0">
                          {item.user_name?.charAt(0).toUpperCase() || 'S'}
                        </div>
                        <div className="flex-1 min-w-0 text-[10px] text-zinc-450 leading-relaxed">
                          <span className="font-bold text-zinc-300">{item.user_name} </span>
                          <span>{item.action.toLowerCase()}: </span>
                          <span className="text-zinc-400 italic">{item.details}</span>
                          <span className="text-[9px] text-zinc-550 font-mono block mt-0.5">
                            {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                      </div>
                    );
                  }
                })
              )}
            </div>

            {/* Chat comment/file input */}
            <form onSubmit={handleConfirmAddComment} className="p-3 border-t border-[#2c2d34]/60 bg-zinc-900/10 shrink-0 flex items-center gap-2">
              <label className="p-2 bg-[#2c2d34] border border-[#3e3f4a] text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer shrink-0" title="Subir archivo al chat">
                {uploadingFile ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-emerald-450" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
                <input 
                  type="file" 
                  className="hidden" 
                  disabled={uploadingFile}
                  onChange={e => handleUploadFileFromChat(e.target.files)} 
                />
              </label>
              <input
                type="text"
                value={chatCommentText}
                onChange={e => setChatCommentText(e.target.value)}
                placeholder="Escribe un comentario..."
                className="flex-1 bg-[#16161c] border border-[#2c2d34]/60 rounded-lg text-xs text-white px-3 py-2 focus:outline-none focus:border-emerald-500 focus:bg-[#121217] transition-all"
              />
              <button 
                type="submit" 
                disabled={!chatCommentText.trim()}
                className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold transition-all shrink-0 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>

      </div>
    </>
  );
}
