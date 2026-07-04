'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText, Loader2, Upload, X, Clock,
  AlertCircle, Trash2, CheckSquare, Square, Edit
} from 'lucide-react';
import { supabase } from '@/core/database/supabase';
import { uploadTaskEvidence, TaskRow } from '@/core/services/tasks';
import { getApiUrl } from '@/core/utils/api';
import { Draggable } from '@hello-pangea/dnd';

interface KanbanCardProps {
  task: TaskRow;
  index: number;
  onClick: () => void;
  handleToggleCheck: (e: React.MouseEvent, task: TaskRow) => void;
  employees: any[];
  onUploadSuccess?: () => void;
  documentMap?: Record<string, { name: string; mime_type: string }>;
  onEditClick?: (task: TaskRow) => void;
  onDeleteClick?: (task: TaskRow) => void;
}

export default function KanbanCard({ task, index, onClick, handleToggleCheck, employees, onUploadSuccess, documentMap = {}, onEditClick, onDeleteClick }: KanbanCardProps) {
  const isCompleted = task.status === 'completada';
  const isDeliverable = ['entregable', 'reporte', 'evidencia'].includes(task.task_type);
  const [uploading, setUploading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token || null);
    });
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
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
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err: any) {
      alert('Error al subir entregable: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const getSubtaskProgress = (subtasks: any) => {
    if (!subtasks || !Array.isArray(subtasks) || subtasks.length === 0) return null;
    const completed = subtasks.filter((s: any) => s.completed).length;
    return `${completed}/${subtasks.length}`;
  };

  const subProgress = getSubtaskProgress(task.subtasks);

  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const [zoomName, setZoomName] = useState<string>('');

  const borderAccentColor =
    task.area === 'legal' ? 'border-t-purple-500' :
    task.area === 'almacen' ? 'border-t-blue-500' :
    task.area === 'operaciones' ? 'border-t-cyan-500' :
    task.area === 'administracion' ? 'border-t-amber-500' :
    'border-t-emerald-500'; // general

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`bg-zinc-850 border-t-4 ${borderAccentColor} border-l border-r border-b border-zinc-800 p-4 rounded-none flex flex-col justify-between hover:border-zinc-500 transition-all select-none relative ${
            snapshot.isDragging ? 'shadow-2xl border-emerald-500 bg-zinc-800 scale-[1.02]' : ''
          } ${isCompleted ? 'opacity-65' : ''}`}
        >
          <div className="space-y-3">
            {/* Audit Status Alert Banner (Requires Audit & Pending) */}
            {task.requires_audit && task.audit_status === 'pendiente' && (
              <div className="mb-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2.5 py-1.5 rounded-none text-[9px] font-bold flex items-center gap-1.5 animate-pulse">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span>Auditoría Pendiente (Revisar)</span>
              </div>
            )}

            {/* Badges bar */}
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex gap-1.5 flex-wrap">
                <span className="bg-zinc-900 border border-zinc-700 text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-none text-zinc-300">
                  {task.area || 'general'}
                </span>

                <span className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-none ${
                  (task as any).priority === 'alta' ? 'bg-rose-500/20 text-rose-350 border border-rose-500/30' :
                  (task as any).priority === 'media' ? 'bg-amber-500/20 text-amber-350 border border-amber-500/30' :
                  'bg-zinc-900 text-zinc-400 border border-zinc-700'
                }`}>
                  {(task as any).priority || 'baja'}
                </span>

                {task.requires_audit && task.audit_status !== 'pendiente' && (
                  <span className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-none border ${
                    task.audit_status === 'aceptado' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' :
                    task.audit_status === 'denegado' ? 'bg-rose-500/15 text-rose-400 border-rose-500/25' :
                    'bg-amber-500/15 text-amber-405 border-amber-500/25' // requiere_revision
                  }`}>
                    {task.audit_status === 'aceptado' ? 'Aprobado' :
                     task.audit_status === 'denegado' ? 'Rechazado' : 'Cambios'}
                  </span>
                )}
              </div>

              {/* Task Actions (Edit/Delete) & Type Icon */}
              <div className="flex items-center gap-1.5 shrink-0 text-zinc-500">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditClick?.(task);
                  }}
                  className="p-1 rounded-none hover:bg-zinc-800 hover:text-zinc-355 transition-colors"
                  title="Editar Tarea"
                >
                  <Edit className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteClick?.(task);
                  }}
                  className="p-1 rounded-none hover:bg-zinc-800 hover:text-rose-455 transition-colors"
                  title="Eliminar Tarea"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
                {task.task_type === 'evidencia' && <FileText className="h-3 w-3 text-purple-400 shrink-0" />}
                {task.task_type === 'reporte' && <FileText className="h-3 w-3 text-blue-400 shrink-0" />}
                {task.task_type === 'entregable' && <FileText className="h-3 w-3 text-yellow-400 shrink-0" />}
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              {!isDeliverable ? (
                <button
                  onClick={(e) => handleToggleCheck(e, task)}
                  className="mt-0.5 text-zinc-500 hover:text-emerald-400 transition-colors shrink-0"
                >
                  {isCompleted ? (
                    <CheckSquare className="h-4.5 w-4.5 text-emerald-400" />
                  ) : (
                    <Square className="h-4.5 w-4.5" />
                  )}
                </button>
              ) : null}
              <span className={`font-bold text-xs text-white leading-snug text-left ${isCompleted ? 'line-through text-zinc-500' : ''}`}>
                {task.title}
              </span>
            </div>

            {task.description && (
              <p className="text-[10px] text-zinc-450 line-clamp-2 text-left leading-relaxed">
                {task.description}
              </p>
            )}

            {/* Highlighted Assignees Pills */}
            <div className="flex flex-wrap gap-1 mt-1">
              {((task as any).assigned_to_ids && (task as any).assigned_to_ids.length > 0
                ? (task as any).assigned_to_ids
                : (task.assigned_to ? [task.assigned_to] : [])
              ).map((id: string, i: number) => {
                const emp = employees.find(e => e.id === id);
                if (!emp) return null;
                return (
                  <span key={i} className="inline-flex items-center bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-none text-[10px] font-bold transition-colors">
                    {emp.full_name?.split(' ')[0].toLowerCase() || emp.email.split('@')[0]}
                  </span>
                );
              })}
            </div>

            {isDeliverable && (
              <div className="pt-1 flex flex-col gap-2">
                {uploading ? (
                  <span className="flex items-center gap-1.5 text-[9px] text-zinc-400 font-medium">
                    <Loader2 className="animate-spin text-emerald-500 h-3 w-3" />
                    Subiendo entregable...
                  </span>
                ) : (
                  <label
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-[9px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold border border-zinc-700 hover:border-zinc-500 px-2 py-1 rounded-none cursor-pointer transition-colors w-fit"
                  >
                    <Upload className="h-2.5 w-2.5 text-zinc-450" />
                    <span>Subir Entregable</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => handleFileSelect(e)}
                    />
                  </label>
                )}
              </div>
            )}

            {task.evidence_urls && task.evidence_urls.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-zinc-700/80 space-y-1.5 text-left">
                <span className="text-[8px] font-mono font-bold text-zinc-550 uppercase tracking-wider block">Entregables:</span>
                <div className="flex flex-wrap gap-2">
                  {task.evidence_urls.map((url, idx) => {
                    let filename = `Archivo_${idx + 1}`;
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
                    const isImg = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(extension) || mimeType.startsWith('image/');

                    const fullUrl = url.startsWith('/api/storage/file/') ? getApiUrl(`${url}${url.includes('?') ? '&' : '?'}token=${token || ''}`) : url;

                    return (
                      <div key={idx} className="flex flex-col gap-1 max-w-[120px] bg-zinc-900/30 border border-zinc-700 p-1.5 rounded-none">
                        <div className="flex items-center gap-1 text-[8px] text-zinc-400">
                          <FileText className="h-2.5 w-2.5 text-zinc-500 shrink-0" />
                          <span className="truncate" title={filename}>{filename}</span>
                        </div>
                        {isImg && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomUrl(fullUrl);
                              setZoomName(filename);
                            }}
                            className="h-14 w-24 border border-zinc-700 rounded-none overflow-hidden bg-zinc-950 cursor-zoom-in hover:border-emerald-500/50 transition-colors"
                          >
                            <img
                              src={fullUrl}
                              alt={filename}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-700/80 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-550 font-bold">
              {subProgress && (
                <span className="flex items-center gap-1 bg-zinc-900/60 border border-zinc-700 px-1.5 py-0.5 rounded-none text-zinc-400">
                  <CheckSquare className="h-3 w-3 text-emerald-450 shrink-0" />
                  {subProgress}
                </span>
              )}
              {(task as any).due_date && (
                <span className="flex items-center gap-0.5 text-zinc-400">
                  <Clock className="h-3 w-3 shrink-0" />
                  {new Date((task as any).due_date).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                </span>
              )}
            </div>

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
                    className="h-5.5 w-5.5 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[8px] font-bold text-zinc-350 ring-1 ring-zinc-700"
                    title={emp.full_name}
                  >
                    {emp.full_name?.charAt(0).toUpperCase()}
                  </div>
                );
              })}
              {((task as any).assigned_to_ids?.length || 0) > 3 && (
                <div className="h-5.5 w-5.5 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[7px] font-bold text-zinc-500 ring-1 ring-zinc-700">
                  +{((task as any).assigned_to_ids?.length || 0) - 3}
                </div>
              )}
            </div>
          </div>

          {/* Lightweight zoom view portal */}
          {zoomUrl && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setZoomUrl(null);
              }}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 cursor-zoom-out"
            >
              <div className="relative max-w-4xl max-h-[90vh] flex flex-col justify-center items-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomUrl(null);
                  }}
                  className="absolute -top-12 right-0 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-white rounded-none p-2 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
                <img
                  src={zoomUrl}
                  alt={zoomName}
                  className="max-w-full max-h-[80vh] object-contain rounded-none shadow-2xl border border-zinc-700"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="mt-3 text-zinc-300 text-xs font-mono bg-zinc-900/90 border border-zinc-700 px-3 py-1.5 rounded-none truncate max-w-md">
                  {zoomName}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
