'use client';

import React, { useState, useEffect } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { 
  AlertCircle, Edit, Trash2, CheckSquare, Square, Clock, X, MessageSquare, Paperclip,
  Shield, Package, Cpu, Database, Tag, ShieldAlert, ShieldCheck, ChevronsUp, ChevronDown, Equal
} from 'lucide-react';
import { TaskRow } from '@/core/services/tasks';
import { supabase } from '@/core/database/supabase';
import { getApiUrl } from '@/core/utils/api';

interface KanbanCardProps {
  task: TaskRow;
  index: number;
  onClick: () => void;
  handleToggleCheck: (e: React.MouseEvent, task: TaskRow) => void;
  employees: any[];
  projects?: any[];
  showProjectBadge?: boolean;
  showStatus?: boolean;
  onUploadSuccess?: () => void;
  documentMap?: Record<string, { name: string; mime_type: string }>;
  onEditClick?: (task: TaskRow) => void;
  onDeleteClick?: (task: TaskRow) => void;
}

export default function KanbanCard({
  task,
  index,
  onClick,
  handleToggleCheck,
  employees,
  projects = [],
  showProjectBadge = false,
  showStatus = false,
  onUploadSuccess,
  documentMap = {},
  onEditClick,
  onDeleteClick
}: KanbanCardProps) {
  const isCompleted = task.status === 'completada';
  const [token, setToken] = useState<string | null>(null);
  const [showLocalChecklist, setShowLocalChecklist] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token || null);
    });
  }, []);

  const taskProject = projects.find(p => p.id === task.project_id);

  // Cover image determination
  const getCoverUrl = () => {
    const urls = task.evidence_urls || [];
    if (urls.length === 0) return null;
    
    // Check if there is an explicit cover set in localStorage
    const localCover = typeof window !== 'undefined' ? localStorage.getItem(`task-cover-${task.id}`) : null;
    if (localCover && urls.includes(localCover)) {
      return localCover;
    }
    
    // Otherwise, find the first image in urls
    const imageExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
    const firstImage = urls.find(url => {
      let filename = '';
      try {
        if (url.startsWith('/api/storage/file/')) {
          const urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
          const nameParam = urlObj.searchParams.get('name');
          if (nameParam) filename = nameParam;
        } else {
          filename = url.split('/').pop() || '';
        }
      } catch (e) {
        filename = url.split('/').pop() || '';
      }
      const ext = filename.split('.').pop()?.toLowerCase() || '';
      return imageExtensions.includes(ext);
    });
    return firstImage || null;
  };
  
  const coverUrl = getCoverUrl();

  // Status Color mapping for Trello label style pills
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'backlog': return 'bg-indigo-600/40 text-indigo-400 border border-indigo-500/25';
      case 'pendiente': return 'bg-indigo-500/20 text-indigo-350 border border-indigo-500/20';
      case 'en_progreso': return 'bg-amber-500/20 text-amber-350 border border-amber-500/25';
      case 'bloqueada': return 'bg-rose-500/20 text-rose-350 border border-rose-500/25 animate-pulse';
      case 'completada': return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/25';
      default: return 'bg-zinc-800 text-zinc-400 border border-zinc-700';
    }
  };

  // Department icon mapping
  const getDepartmentIcon = (a: string) => {
    switch (a) {
      case 'legal': 
        return { icon: Shield, color: 'text-purple-400 hover:text-purple-300' };
      case 'almacen': 
        return { icon: Package, color: 'text-blue-400 hover:text-blue-300' };
      case 'operaciones': 
        return { icon: Cpu, color: 'text-cyan-400 hover:text-cyan-300' };
      case 'administracion': 
        return { icon: Database, color: 'text-amber-400 hover:text-amber-300' };
      case 'general':
      default:
        return { icon: Tag, color: 'text-emerald-400 hover:text-emerald-300' };
    }
  };

  const handleToggleSubtaskLocal = async (e: React.MouseEvent, itemId: string, completed: boolean) => {
    e.stopPropagation();
    const updatedSubtasks = ((task.subtasks || []) as any[]).map((s: any) => 
      s.id === itemId ? { ...s, completed } : s
    );
    
    const { error } = await supabase
      .from('global_tasks')
      .update({ subtasks: updatedSubtasks } as any)
      .eq('id', task.id);
    
    if (error) {
      alert('Error al guardar checklist: ' + error.message);
    } else {
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    }
  };

  const commentsCount = task.task_comments ? (task.task_comments as any[]).length : 0;
  const filesCount = task.evidence_urls ? task.evidence_urls.length : 0;
  const subtasksCount = task.subtasks ? (task.subtasks as any[]).length : 0;
  const completedSubtasksCount = task.subtasks ? (task.subtasks as any[]).filter((s: any) => s.completed).length : 0;

  const cardInner = (
    <>
      {/* Hover Action Buttons (Edit / Delete) */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEditClick?.(task);
          }}
          className="h-7 w-7 rounded-full bg-zinc-950/75 border border-zinc-700/50 hover:bg-zinc-800 hover:text-zinc-200 text-zinc-400 flex items-center justify-center transition-all shadow-lg cursor-pointer"
          title="Editar Tarea"
        >
          <Edit className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteClick?.(task);
          }}
          className="h-7 w-7 rounded-full bg-zinc-950/75 border border-zinc-700/50 hover:bg-zinc-800 hover:text-rose-455 text-zinc-455 flex items-center justify-center transition-all shadow-lg cursor-pointer"
          title="Eliminar Tarea"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Cover Image flush at the top */}
      {coverUrl && (
        <div className="w-full h-32 overflow-hidden bg-zinc-950/20 border-b border-zinc-800 shrink-0">
          <img 
            src={coverUrl.startsWith('/api/storage/file/') ? getApiUrl(`${coverUrl}${coverUrl.includes('?') ? '&' : '?'}token=${token || ''}`) : coverUrl} 
            alt="Task Cover" 
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content wrapper with padding */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          {/* Audit Status Alert Banner (Shown only inside the card body when in blocked status to highlight it) */}
          {task.requires_audit && task.status === 'bloqueada' && task.audit_status === 'pendiente' && (
            <div className="mb-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2.5 py-1.5 rounded-lg text-[9px] font-bold flex items-center gap-1.5 animate-pulse">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span>Auditoría Pendiente (Revisar)</span>
            </div>
          )}
          {/* Badges row: Thin colored pills at the top */}
          <div className="flex justify-between items-center gap-2">
            <div className="flex gap-1.5 flex-wrap">
              {showStatus && (
                <span className={`text-[8.5px] font-bold uppercase px-2 py-0.5 rounded ${getStatusColor(task.status)}`} title={`Estado: ${task.status}`}>
                  {task.status === 'pendiente' ? 'por hacer' : task.status === 'en_progreso' ? 'en progreso' : task.status === 'completada' ? 'hecha' : task.status}
                </span>
              )}
              {showProjectBadge && taskProject && (
                <span className="text-[8.5px] font-bold uppercase px-2 py-0.5 rounded bg-teal-500/20 text-teal-350 border border-teal-500/25" title={`Obra: ${taskProject.name}`}>
                  {taskProject.name.toLowerCase()}
                </span>
              )}
            </div>
          </div>

          {/* Task Title & Hover Checkbox */}
          <div className="flex items-start">
            {!isCompleted ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleCheck(e, task);
                }}
                className="mt-0.5 w-0 opacity-0 scale-0 group-hover:w-4 group-hover:mr-2 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 ease-in-out shrink-0 h-4 rounded-full border border-zinc-500 hover:border-emerald-500 hover:bg-emerald-500/10 flex items-center justify-center cursor-pointer"
                title="Marcar como completada"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-transparent" />
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleCheck(e, task);
                }}
                className="mt-0.5 shrink-0 h-4 w-4 mr-2 rounded-full border border-emerald-500 bg-emerald-500/20 flex items-center justify-center cursor-pointer"
                title="Marcar como pendiente"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </button>
            )}
            <span className={`font-bold text-xs text-white leading-snug text-left ${isCompleted ? 'line-through text-zinc-500' : ''}`}>
              {task.title}
            </span>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-[10px] text-zinc-450 line-clamp-2 text-left leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Expanding checklist items inside the card */}
          {showLocalChecklist && subtasksCount > 0 && (
            <div className="mt-3 pt-3 border-t border-zinc-800/85 space-y-2.5 text-left" onClick={(e) => e.stopPropagation()}>
              {((task.subtasks || []) as any[]).map((subItem) => (
                <div key={subItem.id} className="flex items-center gap-2.5 text-xs">
                  <input
                    type="checkbox"
                    checked={subItem.completed}
                    onChange={(e) => handleToggleSubtaskLocal(e as any, subItem.id, e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-900 text-emerald-600 focus:ring-emerald-500/20 h-4 w-4 cursor-pointer"
                  />
                  <span className={`text-[11px] text-zinc-300 font-medium ${subItem.completed ? 'line-through text-zinc-500' : ''}`}>
                    {subItem.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer of Card: bottom row of dynamic indicators & assignee avatar */}
        <div className="mt-3 pt-3 border-t border-zinc-800/80 flex flex-col gap-2.5 shrink-0">
          {/* Dynamic indicators with counters */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[9px] font-mono text-zinc-500 font-bold">
            {(task as any).due_date && (
              <span className="flex items-center gap-1 text-[#f59e0b] bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold">
                <Clock className="h-3 w-3 shrink-0" />
                {new Date((task as any).due_date).toLocaleDateString([], { day: '2-digit', month: 'short' })}
              </span>
            )}
            {/* Audit Status Icon: displayed on the card to indicate need of leader approval */}
            {task.requires_audit && (
              <span 
                className="flex items-center"
                title={
                  task.audit_status === 'aceptado' ? 'Auditoría Aprobada' :
                  task.audit_status === 'denegado' ? 'Auditoría Rechazada' :
                  'Requiere Auditoría de Líder'
                }
              >
                {task.audit_status === 'aceptado' ? (
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-rose-500 animate-pulse" />
                )}
              </span>
            )}
            {commentsCount > 0 && (
              <span className="flex items-center gap-1 text-zinc-400" title="Comentarios">
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="font-semibold text-[10px]">{commentsCount}</span>
              </span>
            )}
            {filesCount > 0 && (
              <span className="flex items-center gap-1 text-zinc-400" title="Adjuntos">
                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                <span className="font-semibold text-[10px]">{filesCount}</span>
              </span>
            )}
            {(task as any).priority && (
              <span 
                className="flex items-center" 
                title={`Prioridad: ${(task as any).priority}`}
              >
                {(task as any).priority === 'alta' ? (
                  <ChevronsUp className="h-4 w-4 text-rose-500 shrink-0" />
                ) : (task as any).priority === 'media' ? (
                  <Equal className="h-4 w-4 text-amber-500 rotate-90 shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-blue-500 shrink-0" />
                )}
              </span>
            )}
            {subtasksCount > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLocalChecklist(!showLocalChecklist);
                }}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                  showLocalChecklist 
                    ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30' 
                    : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                }`}
                title="Expandir Checklist"
              >
                <CheckSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="font-semibold text-[10px]">{completedSubtasksCount}/{subtasksCount}</span>
              </button>
            )}
          </div>

          {/* Right side: Department Icon & Assignees circle avatar stack (always a separate row) */}
          <div className="flex items-center gap-2 shrink-0 justify-end w-full pt-2 border-t border-zinc-800/30">
            {/* Department Icon */}
            {(() => {
              const dept = getDepartmentIcon(task.area || 'general');
              const DeptIcon = dept.icon;
              return (
                <span title={`Departamento: ${task.area || 'General'}`}>
                  <DeptIcon className={`h-3.5 w-3.5 shrink-0 ${dept.color}`} />
                </span>
              );
            })()}

            <div className="flex -space-x-1.5 overflow-hidden">
              {((task as any).assigned_to_ids && (task as any).assigned_to_ids.length > 0
                ? (task as any).assigned_to_ids
                : (task.assigned_to ? [task.assigned_to] : [])
              ).slice(0, 3).map((id: string, i: number) => {
                const emp = employees.find(e => e.id === id);
                if (!emp) return null;
                return (
                  <div
                    key={i}
                    className="h-5.5 w-5.5 rounded-full bg-zinc-900 border border-zinc-950 flex items-center justify-center text-[8px] font-bold text-zinc-300 ring-1 ring-zinc-800"
                    title={emp.full_name}
                  >
                    {emp.full_name?.charAt(0).toUpperCase()}
                  </div>
                );
              })}
              {((task as any).assigned_to_ids?.length || 0) > 3 && (
                <div className="h-5.5 w-5.5 rounded-full bg-zinc-900 border border-zinc-950 flex items-center justify-center text-[7px] font-bold text-zinc-500 ring-1 ring-zinc-800">
                  +{((task as any).assigned_to_ids?.length || 0) - 3}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  if (index === -1) {
    return (
      <div
        onClick={onClick}
        className={`bg-[#27272f] border-t border-t-zinc-800 border-l border-r border-b border-zinc-800 p-0 rounded-none flex flex-col justify-between hover:border-zinc-500 transition-all select-none relative group ${isCompleted ? 'opacity-65' : ''}`}
      >
        {cardInner}
      </div>
    );
  }

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`bg-[#27272f] border-t border-t-zinc-800 border-l border-r border-b border-zinc-800 p-0 rounded-none flex flex-col justify-between hover:border-zinc-500 transition-all select-none relative group ${
            snapshot.isDragging ? 'shadow-2xl border-emerald-500 bg-zinc-800 scale-[1.02]' : ''
          } ${isCompleted ? 'opacity-65' : ''}`}
        >
          {cardInner}
        </div>
      )}
    </Draggable>
  );
}
