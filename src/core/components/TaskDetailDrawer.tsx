'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, User, Tag, Clock, ClipboardList, AlertCircle, Plus, 
  Trash2, Edit, Upload, FileText, Check, MessageSquare, Briefcase, 
  RefreshCw, CheckSquare, Square, ChevronRight, Activity, Paperclip, Send,
  Loader2, FolderKanban
} from 'lucide-react';
import { updateTask, auditTaskStatus, uploadTaskEvidence, deleteTask, TaskRow } from '@/core/services/tasks';
import { Button } from '@/core/components/ui/button';
import { supabase } from '@/core/database/supabase';
import { useAuth } from '@/core/auth/AuthContext';

interface TaskDetailDrawerProps {
  task: TaskRow | null;
  isOpen: boolean;
  onClose: () => void;
  employees: any[];
  user: any;
  projects: any[];
  onTaskUpdated: () => void;
}

export default function TaskDetailDrawer({
  task,
  isOpen,
  onClose,
  employees,
  user,
  projects,
  onTaskUpdated
}: TaskDetailDrawerProps) {
  const { roles } = useAuth();
  // Tabs: 'requisitos' | 'entregables' | 'subtareas' | 'actividad' | 'comentarios'
  const [activeTab, setActiveTab] = useState<'requisitos' | 'entregables' | 'subtareas' | 'actividad' | 'comentarios'>('comentarios');
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form Edit State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [assignedToIds, setAssignedToIds] = useState<string[]>([]);
  const [projectId, setProjectId] = useState('');
  const [taskType, setTaskType] = useState('check');
  const [area, setArea] = useState('general');
  const [priority, setPriority] = useState('baja');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('pendiente');
  const [auditStatus, setAuditStatus] = useState('pendiente');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [requiresAudit, setRequiresAudit] = useState(false);
  const [auditComments, setAuditComments] = useState('');
  const [localAuditComments, setLocalAuditComments] = useState('');
  const [submittingAudit, setSubmittingAudit] = useState(false);
  const [showChangesForm, setShowChangesForm] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const getDownloadUrl = (url: string) => {
    if (url.startsWith('/api/storage/file/')) {
      return token ? `${url}?token=${token}` : url;
    }
    return url;
  };

  // Action Inputs
  const [newSubtask, setNewSubtask] = useState('');
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialQty, setNewMaterialQty] = useState(1);
  const [newComment, setNewComment] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  // Sync state with task when drawer opens or task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setAssignedTo(task.assigned_to);
      setAssignedToIds((task as any).assigned_to_ids || (task.assigned_to ? [task.assigned_to] : []));
      setProjectId(task.project_id || '');
      setTaskType(task.task_type);
      setArea(task.area || 'general');
      setPriority((task as any).priority || 'baja');
      setDueDate((task as any).due_date ? new Date((task as any).due_date).toISOString().split('T')[0] : '');
      setStatus(task.status);
      setAuditStatus(task.audit_status || 'pendiente');
      setTags((task as any).tags || []);
      setRequiresAudit((task as any).requires_audit || false);
      setAuditComments((task as any).audit_comments || '');
      setLocalAuditComments('');
      setShowChangesForm(false);
      setEditMode(false);
    }
  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  const assignee = employees.find(e => e.id === task.assigned_to);
  const taskProject = projects.find(p => p.id === task.project_id);

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

  // Save general updates
  const handleSaveDetails = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const updates: any = {
        title,
        description,
        assigned_to: assignedToIds[0] || '',
        assigned_to_ids: assignedToIds,
        project_id: projectId || null,
        task_type: taskType,
        area,
        priority,
        due_date: dueDate || null,
        status,
        audit_status: auditStatus,
        tags,
        requires_audit: requiresAudit
      };

      // Detect status changes for logs
      let logList = (task as any).task_activities || [];
      if (task.status !== status) {
        logList = logActivity('Cambio de Estado', `Cambió el estado de "${task.status}" a "${status}"`, logList);
        updates.task_activities = logList;
      }

      await updateTask(task.id, updates);
      setEditMode(false);
      onTaskUpdated();
    } catch (err: any) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const canAudit = roles.some(r => r.name === 'Administrador') || task.created_by === user?.id;
  const isAssignee = (task as any).assigned_to_ids?.includes(user?.id) || task.assigned_to === user?.id;

  const handleAuditAction = async (action: 'aceptado' | 'denegado' | 'requiere_revision') => {
    if (action === 'requiere_revision' && !localAuditComments.trim()) {
      alert('Por favor describe brevemente los cambios detallados requeridos.');
      return;
    }
    setSubmittingAudit(true);
    try {
      await auditTaskStatus(task.id, action, action === 'requiere_revision' ? localAuditComments : null);
      setLocalAuditComments('');
      setShowChangesForm(false);
      onTaskUpdated();
    } catch (err: any) {
      alert('Error en auditoría: ' + err.message);
    } finally {
      setSubmittingAudit(false);
    }
  };

  const handleMarkChangesDone = async () => {
    setSubmittingAudit(true);
    try {
      await auditTaskStatus(task.id, 'pendiente', 'Cambios realizados por el asignado.');
      onTaskUpdated();
    } catch (err: any) {
      alert('Error al marcar cambios realizados: ' + err.message);
    } finally {
      setSubmittingAudit(false);
    }
  };

  // Delete task
  const handleDeleteTask = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta tarea?')) return;
    setLoading(true);
    try {
      await deleteTask(id);
      onClose();
      onTaskUpdated();
    } catch (err: any) {
      alert('Error al eliminar tarea: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update specific JSON list properties
  const updateTaskListField = async (fieldName: string, nextList: any[], logMsg?: { action: string, details: string }) => {
    try {
      const updates: any = { [fieldName]: nextList };
      if (logMsg) {
        updates.task_activities = logActivity(logMsg.action, logMsg.details);
      }
      await updateTask(task.id, updates);
      onTaskUpdated();
    } catch (err: any) {
      alert('Error al actualizar: ' + err.message);
    }
  };

  // Subtasks actions
  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    const currentSubtasks = (task as any).subtasks || [];
    const updated = [...currentSubtasks, { id: Math.random().toString(36).substring(2), title: newSubtask, completed: false }];
    updateTaskListField('subtasks', updated, { action: 'Subtarea Creada', details: `Añadió la subtarea "${newSubtask}"` });
    setNewSubtask('');
  };

  const handleToggleSubtask = (subId: string) => {
    const currentSubtasks = (task as any).subtasks || [];
    const updated = currentSubtasks.map((s: any) => {
      if (s.id === subId) {
        const nextState = !s.completed;
        return { ...s, completed: nextState };
      }
      return s;
    });
    const item = currentSubtasks.find((s: any) => s.id === subId);
    updateTaskListField('subtasks', updated, { 
      action: 'Subtarea Modificada', 
      details: `${item.completed ? 'Desmarcó' : 'Marcó'} como completada la subtarea "${item.title}"` 
    });
  };

  const handleDeleteSubtask = (subId: string) => {
    const currentSubtasks = (task as any).subtasks || [];
    const item = currentSubtasks.find((s: any) => s.id === subId);
    const updated = currentSubtasks.filter((s: any) => s.id !== subId);
    updateTaskListField('subtasks', updated, { action: 'Subtarea Eliminada', details: `Eliminó la subtarea "${item.title}"` });
  };

  // Materials actions
  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterialName.trim()) return;
    const current = (task as any).task_materials || [];
    const updated = [...current, { 
      id: Math.random().toString(36).substring(2), 
      name: newMaterialName, 
      qty: newMaterialQty, 
      status: 'pendiente' 
    }];
    updateTaskListField('task_materials', updated, { action: 'Requisito Material', details: `Añadió material: ${newMaterialName} (x${newMaterialQty})` });
    setNewMaterialName('');
    setNewMaterialQty(1);
  };

  const handleAuditMaterial = (matId: string, approval: 'aprobado' | 'rechazado') => {
    const current = (task as any).task_materials || [];
    const updated = current.map((m: any) => {
      if (m.id === matId) return { ...m, status: approval };
      return m;
    });
    const item = current.find((m: any) => m.id === matId);
    updateTaskListField('task_materials', updated, { 
      action: 'Auditoría Material', 
      details: `${approval === 'aprobado' ? 'Aprobó' : 'Rechazó'} el requerimiento de "${item.name}" (x${item.qty})` 
    });
  };

  const handleDeleteMaterial = (matId: string) => {
    const current = (task as any).task_materials || [];
    const item = current.find((m: any) => m.id === matId);
    const updated = current.filter((m: any) => m.id !== matId);
    updateTaskListField('task_materials', updated, { action: 'Material Eliminado', details: `Eliminó el material "${item.name}"` });
  };

  // Comments actions
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const current = (task as any).task_comments || [];
    const updated = [{
      id: Math.random().toString(36).substring(2),
      profile_id: user?.id,
      user_name: user?.full_name || user?.email || 'Usuario',
      text: newComment,
      created_at: new Date().toISOString()
    }, ...current];
    updateTaskListField('task_comments', updated, { action: 'Comentario', details: 'Escribió un comentario en la tarea.' });
    setNewComment('');
  };

  // Deliverables Evidence upload
  const handleUploadDeliverable = async (files: FileList | null) => {
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

      // Log activity
      const logList = logActivity('Archivo Subido', `Entregó archivo: ${file.name}`);
      await updateTask(task.id, {
        task_activities: logList
      });

      alert('Archivo subido con éxito.');
      onTaskUpdated();
    } catch (err: any) {
      alert('Error al subir: ' + err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  // Quick state update (for badges dropdowns in view mode)
  const handleQuickStatusChange = async (nextStatus: string) => {
    try {
      let logList = (task as any).task_activities || [];
      logList = logActivity('Cambio de Estado', `Cambió el estado a "${nextStatus}"`, logList);
      await updateTask(task.id, {
        status: nextStatus,
        task_activities: logList
      });
      onTaskUpdated();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleQuickPriorityChange = async (nextPriority: string) => {
    try {
      let logList = (task as any).task_activities || [];
      logList = logActivity('Cambio de Prioridad', `Estableció prioridad en "${nextPriority}"`, logList);
      await updateTask(task.id, {
        priority: nextPriority,
        task_activities: logList
      });
      onTaskUpdated();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  // Tag management
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        const next = [...tags, tagInput.trim()];
        setTags(next);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (t: string) => {
    setTags(prev => prev.filter(tag => tag !== t));
  };

  // Filter activities to show "My Work" vs "All activities"
  const activities = (task as any).task_activities || [];
  const myWorkActivities = activities.filter((act: any) => act.profile_id === user?.id);

  return (
    <>
      {/* BACKGROUND BACKDROP LAYER */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity duration-300"
      />

      {/* SIDEBAR PANEL SLIDE-OVER */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-900 shadow-2xl flex flex-col z-50 transform transition-transform duration-300 ease-in-out translate-x-0">
        
        {/* PANEL HEADER */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-900 flex justify-between items-center bg-zinc-900/20 shrink-0">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-emerald-400" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500">Detalles de Tarea</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setEditMode(!editMode)} 
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border${
                editMode 
                  ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-550 dark:text-zinc-400 hover:text-white'
              }`}
            >
              {editMode ? 'Ver Modo Lectura' : 'Editar Tarea'}
            </button>
            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-zinc-150 dark:hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* CONTAINER SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-900">
          {editMode ? (
            /* EDIT FORM VIEW */
            <form onSubmit={handleSaveDetails} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase font-mono">Título</label>
                <input 
                  required 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:border-emerald-500 outline-none text-zinc-800 dark:text-white font-bold" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase font-mono">Descripción</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:border-emerald-500 outline-none h-24 resize-none text-zinc-650 dark:text-zinc-350" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase font-mono">Estado</label>
                  <select 
                    value={status} 
                    onChange={e => setStatus(e.target.value)} 
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:border-emerald-500 outline-none text-zinc-800 dark:text-zinc-200"
                  >
                    <option value="pendiente">To Do (Pendiente)</option>
                    <option value="en_progreso">In Progress (En Curso)</option>
                    <option value="completada">Review / Done (Completada)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase font-mono">Prioridad</label>
                  <select 
                    value={priority} 
                    onChange={e => setPriority(e.target.value)} 
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:border-emerald-500 outline-none text-zinc-800 dark:text-zinc-200"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase font-mono">Tipo</label>
                  <select 
                    value={taskType} 
                    onChange={e => setTaskType(e.target.value)} 
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:border-emerald-500 outline-none text-zinc-800 dark:text-zinc-200"
                  >
                    <option value="check">Check (Acción)</option>
                    <option value="entregable">Entregable</option>
                    <option value="reporte">Reporte</option>
                    <option value="evidencia">Evidencia</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase font-mono">Área</label>
                  <select 
                    value={area} 
                    onChange={e => setArea(e.target.value)} 
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:border-emerald-500 outline-none text-zinc-800 dark:text-zinc-200"
                  >
                    <option value="general">General</option>
                    <option value="legal">Legal</option>
                    <option value="almacen">Almacén</option>
                    <option value="operaciones">Operaciones</option>
                    <option value="administracion">Administración</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase font-mono">Fecha Vencimiento</label>
                  <input 
                    type="date" 
                    value={dueDate} 
                    onChange={e => setDueDate(e.target.value)} 
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:border-emerald-500 outline-none text-zinc-800 dark:text-zinc-200" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase font-mono">Proyecto Asociado</label>
                  <select 
                    value={projectId} 
                    onChange={e => setProjectId(e.target.value)} 
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:border-emerald-500 outline-none text-zinc-800 dark:text-zinc-200"
                  >
                    <option value="">Sin vincular a proyecto</option>
                    {projects.map(proj => (
                      <option key={proj.id} value={proj.id}>{proj.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2.5 py-2 text-left">
                <input
                  type="checkbox"
                  id="drawer-requires-audit-checkbox"
                  checked={requiresAudit}
                  onChange={e => setRequiresAudit(e.target.checked)}
                  className="rounded border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-emerald-600 focus:ring-emerald-500/20 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="drawer-requires-audit-checkbox" className="text-xs font-bold text-zinc-650 dark:text-zinc-350 cursor-pointer select-none">
                  Requiere Auditoría (Revisión de líder antes de marcarse como completa)
                </label>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-xs font-bold text-zinc-555 uppercase font-mono">Colaboradores Asignados</label>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 max-h-36 overflow-y-auto space-y-2.5">
                  {(() => {
                    const taskProject = projects.find(p => p.id === projectId);
                    const selectableEmployees = (taskProject && taskProject.member_ids && taskProject.member_ids.length > 0)
                      ? employees.filter(emp => taskProject.member_ids.includes(emp.id))
                      : employees;
                    
                    if (selectableEmployees.length === 0) {
                      return <p className="text-xs italic text-zinc-500">No hay integrantes asignados a este proyecto para asignar.</p>;
                    }
                    
                    return selectableEmployees.map(emp => {
                      const isChecked = assignedToIds.includes(emp.id);
                      return (
                        <label key={emp.id} className="flex items-center gap-2.5 text-xs text-zinc-700 dark:text-zinc-300 font-semibold cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setAssignedToIds(prev => prev.filter(id => id !== emp.id));
                              } else {
                                setAssignedToIds(prev => [...prev, emp.id]);
                              }
                            }}
                            className="rounded border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-emerald-600 focus:ring-emerald-500/20 h-4 w-4 cursor-pointer"
                          />
                          <span>{emp.full_name} ({emp.roleName})</span>
                        </label>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Tags Editor */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase font-mono">Etiquetas (Enter para agregar)</label>
                <input 
                  type="text" 
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Agregar etiqueta..."
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:border-emerald-500 outline-none text-zinc-800 dark:text-white" 
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map((t, idx) => (
                    <span key={idx} className="bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 text-zinc-700 dark:text-zinc-300 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-semibold">
                      {t}
                      <X className="h-3 w-3 text-zinc-500 hover:text-white cursor-pointer" onClick={() => handleRemoveTag(t)} />
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-between items-center gap-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => handleDeleteTask(task.id)} 
                  className="bg-rose-600/10 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/10 font-bold h-10 px-4 rounded-xl cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 mr-1.5" /> Eliminar Tarea
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setEditMode(false)} className="text-zinc-500 h-10 px-4 rounded-xl">Cancelar</Button>
                  <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 px-4 rounded-xl">
                    {loading ? <RefreshCw className="animate-spin h-4 w-4 mr-2" /> : null} Guardar
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            /* READ-ONLY INFORMATION PANEL */
            <div className="space-y-6">
              
              {/* Title & Description */}
              <div className="space-y-2 border-b border-zinc-200 dark:border-zinc-900 pb-5">
                <h2 className="text-xl font-bold text-zinc-800 dark:text-white tracking-tight">{task.title}</h2>
                <p className="text-xs text-zinc-550 font-mono flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Creado el {new Date(task.created_at).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                {task.description ? (
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm bg-zinc-50/50 dark:bg-zinc-900/30 p-4 rounded-xl border border-zinc-900/60 leading-relaxed mt-4">
                    {task.description}
                  </p>
                ) : (
                  <p className="text-zinc-650 italic text-xs pt-1">Sin descripción disponible.</p>
                )}
              </div>

              {/* AUDIT STATUS & LEAD CONTROLS PANEL */}
              {task.requires_audit && (
                <div className="bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 space-y-4 text-left backdrop-blur-md">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-400" />
                      <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono">Control de Auditoría</span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase border px-2.5 py-0.5 rounded-full${
                      task.audit_status === 'aceptado' ? 'bg-emerald-950/40 text-emerald-450 border-emerald-500/20' :
                      task.audit_status === 'denegado' ? 'bg-rose-950/40 text-rose-450 border-rose-500/20' :
                      task.audit_status === 'requiere_revision' ? 'bg-amber-950/40 text-amber-450 border-amber-500/20' :
                      'bg-white dark:bg-zinc-900 text-zinc-550 dark:text-zinc-450 border-zinc-200 dark:border-zinc-800'
                    }`}>
                      {task.audit_status === 'pendiente' ? 'Pendiente de Revisión' : 
                       task.audit_status === 'aceptado' ? 'Aceptado / Aprobado' : 
                       task.audit_status === 'denegado' ? 'Rechazado' : 
                       task.audit_status === 'requiere_revision' ? 'Cambios Solicitados' : task.audit_status}
                    </span>
                  </div>

                  {/* If needs changes, show the instruction */}
                  {task.audit_status === 'requiere_revision' && task.audit_comments && (
                    <div className="bg-amber-600/5 border border-amber-500/10 p-3 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-amber-400 font-mono uppercase">Instrucciones de cambio:</span>
                      <p className="text-zinc-650 dark:text-zinc-350 text-xs leading-relaxed">{task.audit_comments}</p>
                    </div>
                  )}

                  {/* Action Buttons for Assignee */}
                  {task.audit_status === 'requiere_revision' && isAssignee && (
                    <div className="pt-2">
                      <Button
                        disabled={submittingAudit}
                        onClick={handleMarkChangesDone}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-955 font-bold text-xs h-9 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {submittingAudit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4" />}
                        Marcar Cambios como Realizados
                      </Button>
                    </div>
                  )}

                  {/* Action controls for leader/auditor */}
                  {task.audit_status === 'pendiente' && (
                    <>
                      {canAudit ? (
                        <div className="space-y-3">
                          <p className="text-xs text-zinc-550 dark:text-zinc-450">Esta tarea requiere aprobación del líder. Elige una acción:</p>
                          
                          {!showChangesForm ? (
                            <div className="grid grid-cols-3 gap-2">
                              <Button
                                disabled={submittingAudit}
                                onClick={() => handleAuditAction('aceptado')}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 rounded-xl font-bold flex items-center justify-center gap-1 cursor-pointer"
                              >
                                Aceptar
                              </Button>
                              <Button
                                disabled={submittingAudit}
                                onClick={() => handleAuditAction('denegado')}
                                className="bg-rose-600 hover:bg-rose-500 text-white text-xs h-9 rounded-xl font-bold flex items-center justify-center gap-1 cursor-pointer"
                              >
                                Rechazar
                              </Button>
                              <Button
                                disabled={submittingAudit}
                                onClick={() => setShowChangesForm(true)}
                                className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs h-9 rounded-xl font-bold flex items-center justify-center gap-1 cursor-pointer"
                              >
                                Pedir Cambios
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2.5 pt-1">
                              <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono">Describir cambios detallados</label>
                              <textarea
                                value={localAuditComments}
                                onChange={e => setLocalAuditComments(e.target.value)}
                                placeholder="Indica detalladamente qué cambios debe realizar el colaborador..."
                                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl p-3 text-xs text-zinc-800 dark:text-white focus:border-amber-500 outline-none h-16 resize-none"
                              />
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="ghost"
                                  onClick={() => {
                                    setShowChangesForm(false);
                                    setLocalAuditComments('');
                                  }}
                                  className="text-zinc-500 text-xs h-8 px-3 rounded-lg cursor-pointer"
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  disabled={submittingAudit}
                                  onClick={() => handleAuditAction('requiere_revision')}
                                  className="bg-amber-650 hover:bg-amber-600 text-white text-xs h-8 px-3 rounded-lg font-bold cursor-pointer"
                                >
                                  Enviar Requerimiento
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-zinc-500 text-xs bg-zinc-50 dark:bg-zinc-950/40 p-3 rounded-xl border border-zinc-200 dark:border-zinc-900">
                          <Clock className="h-4 w-4 text-zinc-650 shrink-0" />
                          <span>Esperando que un líder o el creador de la tarea audite el entregable.</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Grid Metadata Parameters */}
              <div className="grid grid-cols-2 gap-6 bg-zinc-900/20 border border-zinc-200 dark:border-zinc-900 p-5 rounded-2xl">
                <div className="space-y-1 col-span-2">
                  <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider font-mono">Colaboradores Asignados</span>
                  <div className="flex flex-wrap gap-2.5 mt-1.5">
                    {((task as any).assigned_to_ids && (task as any).assigned_to_ids.length > 0
                      ? (task as any).assigned_to_ids
                      : (task.assigned_to ? [task.assigned_to] : [])
                    ).map((id: string) => {
                      const emp = employees.find(e => e.id === id);
                      if (!emp) return null;
                      return (
                        <div key={emp.id} className="flex items-center gap-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1 rounded-xl">
                          <div className="h-6 w-6 rounded-full bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                            {emp.full_name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-tight">{emp.full_name}</div>
                            <div className="text-[9px] text-zinc-500 leading-none mt-0.5">{emp.roleName}</div>
                          </div>
                        </div>
                      );
                    })}
                    {(!task.assigned_to && (!(task as any).assigned_to_ids || (task as any).assigned_to_ids.length === 0)) && (
                      <span className="text-xs italic text-zinc-650">Sin colaboradores asignados</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider font-mono">Proyecto / Obra</span>
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 flex items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">
                      <FolderKanban className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[180px]">
                      {taskProject ? taskProject.name : 'Tarea Administrativa'}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider font-mono">Estado Operativo</span>
                  <select 
                    value={status} 
                    onChange={e => handleQuickStatusChange(e.target.value)} 
                    className="bg-zinc-50/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:border-emerald-500 font-semibold"
                  >
                    <option value="pendiente">To Do</option>
                    <option value="en_progreso">In Progress</option>
                    <option value="completada">Review / Done</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider font-mono">Prioridad</span>
                  <select 
                    value={priority} 
                    onChange={e => handleQuickPriorityChange(e.target.value)} 
                    className="bg-zinc-50/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:border-emerald-500 font-semibold"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider font-mono">Fecha de Vencimiento</span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-650 dark:text-zinc-350">
                    <Calendar className="h-4 w-4 text-zinc-500" />
                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/D'}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider font-mono">Área Operativa</span>
                  <span className="inline-flex items-center rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 uppercase border border-zinc-200 dark:border-zinc-700">
                    {task.area || 'general'}
                  </span>
                </div>
              </div>

              {/* Tags list */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t, i) => (
                    <span key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 text-zinc-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* DETAILS SECTION INTERACTIVE TABS */}
        <div className="border-t border-zinc-200 dark:border-zinc-900 flex-1 flex flex-col min-h-[350px]">
          
          {/* Tab Selector */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/10 px-4 shrink-0 overflow-x-auto gap-2">
            {[
              { id: 'comentarios', label: 'Comentarios', icon: MessageSquare },
              { id: 'requisitos', label: 'Materiales (Requisitos)', icon: Briefcase },
              { id: 'entregables', label: 'Archivos Entregables', icon: Paperclip },
              { id: 'subtareas', label: 'Asignaciones (Subtareas)', icon: CheckSquare },
              { id: 'actividad', label: 'Actividad de la Tarea', icon: Activity }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 py-3 px-3 text-xs font-bold transition-all border-b-2 uppercase whitespace-nowrap${
                    activeTab === tab.id
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB CONTENTS VIEWPORT */}
          <div className="flex-1 p-6 overflow-y-auto bg-zinc-50 dark:bg-zinc-950/20">
            
            {/* Tab: Comentarios */}
            {activeTab === 'comentarios' && (
              <div className="space-y-4 h-full flex flex-col justify-between">
                
                {/* Form comments */}
                <form onSubmit={handleAddComment} className="flex gap-2 items-center bg-zinc-50/60 dark:bg-zinc-900/60 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <input
                    type="text"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Escribe un comentario o actualización..."
                    className="flex-1 bg-transparent text-sm focus:outline-none text-zinc-800 dark:text-zinc-200 px-2"
                  />
                  <button type="submit" className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors">
                    <Send className="h-4 w-4" />
                  </button>
                </form>

                {/* Comment Thread List */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 mt-3">
                  {((task as any).task_comments || []).length === 0 ? (
                    <div className="py-8 text-center text-zinc-650 flex flex-col items-center gap-1.5">
                      <MessageSquare className="h-6 w-6 opacity-30" />
                      <span className="text-xs">No hay comentarios en esta tarea.</span>
                    </div>
                  ) : (
                    ((task as any).task_comments || []).map((comm: any) => (
                      <div key={comm.id} className="flex gap-3 bg-zinc-900/20 border border-zinc-200 dark:border-zinc-900 p-3.5 rounded-xl">
                        <div className="h-7 w-7 rounded-full bg-zinc-855 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                          {comm.user_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 space-y-1 text-left">
                          <div className="flex justify-between items-baseline">
                            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{comm.user_name}</span>
                            <span className="text-[9px] text-zinc-550 font-mono">
                              {comm.created_at ? new Date(comm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">{comm.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab: Requisitos y Materiales */}
            {activeTab === 'requisitos' && (
              <div className="space-y-4">
                
                {/* Form to request material */}
                <form onSubmit={handleAddMaterial} className="flex flex-col sm:flex-row gap-3 items-end p-4 rounded-xl border border-zinc-200 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/30">
                  <div className="flex-1 w-full space-y-1 text-left">
                    <label className="text-[10px] font-bold text-zinc-550 uppercase font-mono">Nombre del Material o Archivo Requerido</label>
                    <input 
                      required
                      value={newMaterialName}
                      onChange={e => setNewMaterialName(e.target.value)}
                      placeholder="Ej. Conectores MC4 o Manual de Torque"
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-xs text-zinc-800 dark:text-white focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div className="w-full sm:w-24 space-y-1 text-left">
                    <label className="text-[10px] font-bold text-zinc-550 uppercase font-mono">Cantidad</label>
                    <input 
                      type="number"
                      min={1}
                      value={newMaterialQty}
                      onChange={e => setNewMaterialQty(parseInt(e.target.value) || 1)}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-xs text-zinc-800 dark:text-white focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <button type="submit" className="w-full sm:w-auto h-9 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-750 text-zinc-700 dark:text-zinc-300 font-bold px-4 py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5">
                    <Plus className="h-4 w-4" /> Agregar
                  </button>
                </form>

                {/* Materials List */}
                <div className="space-y-2">
                  {((task as any).task_materials || []).length === 0 ? (
                    <div className="py-8 text-center text-zinc-650 flex flex-col items-center gap-1.5">
                      <Briefcase className="h-6 w-6 opacity-30" />
                      <span className="text-xs">No hay materiales cargados a la tarea.</span>
                    </div>
                  ) : (
                    ((task as any).task_materials || []).map((mat: any) => (
                      <div key={mat.id} className="flex justify-between items-center bg-zinc-900/20 border border-zinc-200 dark:border-zinc-900 p-3 rounded-xl">
                        <div className="text-left">
                          <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">{mat.name}</span>
                          <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">Cantidad requerida: x{mat.qty}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold uppercase border px-2 py-0.5 rounded-full${
                            mat.status === 'aprobado' ? 'bg-emerald-950/40 text-emerald-450 border-emerald-500/20' :
                            mat.status === 'rechazado' ? 'bg-rose-950/40 text-rose-450 border-rose-500/20' :
                            'bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800'
                          }`}>
                            {mat.status}
                          </span>
                          
                          {/* Leader Audit Quick Buttons */}
                          {mat.status === 'pendiente' && (
                            <div className="flex gap-1">
                              <button onClick={() => handleAuditMaterial(mat.id, 'aprobado')} className="p-1 rounded bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 hover:bg-emerald-900/30 text-[9px] font-bold transition-colors px-1.5 cursor-pointer">
                                Aprob.
                              </button>
                              <button onClick={() => handleAuditMaterial(mat.id, 'rechazado')} className="p-1 rounded bg-rose-950/40 border border-rose-900/50 text-rose-400 hover:bg-rose-900/30 text-[9px] font-bold transition-colors px-1.5 cursor-pointer">
                                Rechaz.
                              </button>
                            </div>
                          )}

                          <button onClick={() => handleDeleteMaterial(mat.id)} className="p-1 text-zinc-550 hover:text-rose-400 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab: Archivos Entregables */}
            {activeTab === 'entregables' && (
              <div className="space-y-4">
                
                {/* Upload section */}
                <div className="border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 p-6 text-center rounded-xl flex flex-col items-center justify-center space-y-2">
                  {uploadingFile ? (
                    <>
                      <Loader2 className="animate-spin text-emerald-500 h-8 w-8" />
                      <span className="text-zinc-500 dark:text-zinc-400 text-xs">Subiendo archivo entregable...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="text-zinc-650 h-8 w-8" />
                      <h4 className="text-zinc-500 dark:text-zinc-400 text-xs font-bold">Entrega tus documentos aquí</h4>
                      <p className="text-zinc-500 text-[10px]">Formatos PDF, PNG, JPG, ZIP (máx. 10MB)</p>
                      <label className="mt-2 inline-flex items-center justify-center rounded-lg text-xs px-3 h-8 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold border border-zinc-200 dark:border-zinc-750 transition-colors cursor-pointer">
                        <Plus className="h-3.5 w-3.5 mr-1" /> Seleccionar Archivo
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => handleUploadDeliverable(e.target.files)}
                        />
                      </label>
                    </>
                  )}
                </div>

                {/* Evidence Lists */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Entregas y Evidencias subidas</h4>
                  {(task.evidence_urls || []).length === 0 ? (
                    <div className="py-4 text-center text-zinc-650 text-xs italic">
                      No se han subido archivos de evidencia para esta tarea.
                    </div>
                  ) : (
                    (task.evidence_urls || []).map((url, i) => (
                      <div key={i} className="flex justify-between items-center bg-zinc-900/20 border border-zinc-200 dark:border-zinc-900 p-3 rounded-xl">
                        <a 
                          href={getDownloadUrl(url)} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center gap-2 hover:text-emerald-400 transition-colors text-left"
                        >
                          <FileText className="h-4 w-4 text-zinc-500 shrink-0" />
                          <span className="font-bold text-xs text-zinc-650 dark:text-zinc-350 truncate max-w-sm">Evidencia de Entrega {i + 1}</span>
                        </a>
                        <span className="text-[9px] font-mono text-zinc-550">
                          {url.split('.').pop()?.toUpperCase()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab: Asignaciones (Subtareas) */}
            {activeTab === 'subtareas' && (
              <div className="space-y-4">
                
                {/* Form to add subtask */}
                <form onSubmit={handleAddSubtask} className="flex gap-2 items-center bg-zinc-50/60 dark:bg-zinc-900/60 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <input
                    type="text"
                    value={newSubtask}
                    onChange={e => setNewSubtask(e.target.value)}
                    placeholder="Agregar una nueva asignación o subtarea..."
                    className="flex-1 bg-transparent text-xs focus:outline-none text-zinc-800 dark:text-zinc-200 px-2"
                  />
                  <button type="submit" className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold transition-colors">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </form>

                {/* Subtask list */}
                <div className="space-y-2">
                  {((task as any).subtasks || []).length === 0 ? (
                    <div className="py-8 text-center text-zinc-650 flex flex-col items-center gap-1.5">
                      <CheckSquare className="h-6 w-6 opacity-30" />
                      <span className="text-xs">No hay asignaciones/subtareas registradas.</span>
                    </div>
                  ) : (
                    ((task as any).subtasks || []).map((sub: any) => (
                      <div key={sub.id} className="flex items-center justify-between bg-zinc-900/20 border border-zinc-200 dark:border-zinc-900 p-3 rounded-xl">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleSubtask(sub.id)}
                            className="text-zinc-500 hover:text-emerald-400 transition-colors cursor-pointer shrink-0"
                          >
                            {sub.completed ? (
                              <CheckSquare className="h-4.5 w-4.5 text-emerald-400" />
                            ) : (
                              <Square className="h-4.5 w-4.5" />
                            )}
                          </button>
                          <span className={`text-xs${sub.completed ? 'line-through text-zinc-500' : 'text-zinc-700 dark:text-zinc-300'}`}>
                            {sub.title}
                          </span>
                        </div>
                        <button onClick={() => handleDeleteSubtask(sub.id)} className="p-1 text-zinc-550 hover:text-rose-450 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab: Actividad (Auditoría & Mi Trabajo) */}
            {activeTab === 'actividad' && (
              <div className="space-y-4">
                
                {/* User Info Stats Summary */}
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-900 bg-zinc-900/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-left">
                  <div className="text-left">
                    <h5 className="font-bold text-xs text-zinc-800 dark:text-white">Historial de Actividad de la Tarea</h5>
                    <p className="text-[10px] text-zinc-550">Resumen de todas las acciones registradas en la tarea.</p>
                  </div>
                  <div className="bg-emerald-600/10 text-emerald-400 font-bold border border-emerald-500/20 px-3 py-1 rounded-lg text-xs font-mono">
                    {activities.length} acciones totales
                  </div>
                </div>

                {/* Combined activity feed log */}
                <div className="relative border-l border-zinc-200 dark:border-zinc-900 pl-4 space-y-5 py-2">
                  {activities.length === 0 ? (
                    <div className="text-zinc-650 text-xs italic pl-2 py-4">
                      No hay registros de actividad en esta tarea.
                    </div>
                  ) : (
                    activities.map((act: any) => {
                      const isCurrentUser = act.profile_id === user?.id;
                      return (
                        <div key={act.id} className="relative group text-left">
                          {/* Timeline dot */}
                          <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border${
                            isCurrentUser 
                              ? 'bg-emerald-400 border-emerald-500/20' 
                              : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                          }`} />
                          
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                {isCurrentUser ? 'Tú' : act.user_name}
                              </span>
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-sm bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 font-mono">
                                {act.action}
                              </span>
                              <span className="text-[9px] text-zinc-550 font-mono">
                                {act.created_at ? new Date(act.created_at).toLocaleString() : ''}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500">{act.details}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </>
  );
}
