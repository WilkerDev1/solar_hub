'use client';

import React, { useState } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import KanbanCard from '@/core/components/KanbanCard';
import { TaskRow } from '@/core/services/tasks';
import { Plus, X } from 'lucide-react';

export interface KanbanBoardProps {
  getColumnTasks: (status: 'backlog' | 'pendiente' | 'en_progreso' | 'bloqueada' | 'completada') => TaskRow[];
  onDragEnd: (result: any) => void;
  handleOpenTask: (task: TaskRow) => void;
  handleToggleCheck: (e: React.MouseEvent, task: TaskRow) => void;
  employees: any[];
  projects?: any[];
  loadTasks: () => void;
  documentMap?: Record<string, { name: string; mime_type: string }>;
  handleEditTask: (task: TaskRow) => void;
  handleDeleteTask: (task: TaskRow) => void;
  showProjectBadge?: boolean;
  onQuickCreate?: (status: 'backlog' | 'pendiente' | 'en_progreso' | 'bloqueada' | 'completada', title: string) => Promise<void>;
}

export default function KanbanBoard({
  getColumnTasks,
  onDragEnd,
  handleOpenTask,
  handleToggleCheck,
  employees,
  projects = [],
  loadTasks,
  documentMap = {},
  handleEditTask,
  handleDeleteTask,
  showProjectBadge = false,
  onQuickCreate
}: KanbanBoardProps) {
  const [activeCreatorCol, setActiveCreatorCol] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');

  const columns = [
    { id: 'backlog', label: 'Backlog', borderClass: 'border-t-zinc-600' },
    { id: 'pendiente', label: 'Por Hacer', borderClass: 'border-t-indigo-500' },
    { id: 'en_progreso', label: 'En Progreso', borderClass: 'border-t-purple-500' },
    { id: 'bloqueada', label: 'Bloqueada', borderClass: 'border-t-rose-500' },
    { id: 'completada', label: 'Hecha', borderClass: 'border-t-blue-500' }
  ] as const;

  const handleQuickCreateSubmit = async (status: 'backlog' | 'pendiente' | 'en_progreso' | 'bloqueada' | 'completada') => {
    if (!newCardTitle.trim() || !onQuickCreate) return;
    try {
      await onQuickCreate(status, newCardTitle.trim());
      setNewCardTitle('');
      setActiveCreatorCol(null);
    } catch (e) {
      console.error('Error in handleQuickCreateSubmit:', e);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 h-full w-full scrollbar-thin scrollbar-thumb-zinc-800 items-stretch select-none">
        {columns.map(col => (
          <div key={col.id} className={`bg-[#1e1e24] border border-zinc-700 rounded-none flex flex-col min-h-0 h-full p-3.5 border-t-2 ${col.borderClass} w-[280px] md:w-[320px] shrink-0`}>
            <div className="flex justify-between items-center mb-3 shrink-0 px-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">{col.label}</span>
              <span className="bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded text-[10px] font-bold font-mono border border-zinc-700">
                {getColumnTasks(col.id).length}
              </span>
            </div>
            
            <div className="flex-1 min-h-0 flex flex-col justify-between">
              <Droppable droppableId={col.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex-1 overflow-y-auto space-y-3 pb-2 min-h-[150px] scrollbar-thin scrollbar-thumb-zinc-800 pr-1"
                  >
                    {getColumnTasks(col.id).map((task, index) => (
                      <KanbanCard 
                        key={task.id} 
                        task={task} 
                        index={index} 
                        onClick={() => handleOpenTask(task)} 
                        handleToggleCheck={handleToggleCheck} 
                        employees={employees} 
                        projects={projects}
                        showProjectBadge={showProjectBadge}
                        showStatus={false}
                        onUploadSuccess={loadTasks} 
                        documentMap={documentMap} 
                        onEditClick={handleEditTask} 
                        onDeleteClick={handleDeleteTask} 
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              {/* Inline quick creator at the bottom of the column */}
              {onQuickCreate && (
                <div className="mt-1 pt-1.5 border-t border-zinc-800/40 shrink-0">
                  {activeCreatorCol === col.id ? (
                    <div className="bg-zinc-900/80 border border-zinc-700/80 p-2 space-y-2 rounded">
                      <textarea
                        value={newCardTitle}
                        onChange={(e) => setNewCardTitle(e.target.value)}
                        placeholder="Introduce un título para esta tarjeta..."
                        className="w-full text-[11px] bg-zinc-950 border border-zinc-850 text-zinc-200 rounded p-1.5 focus:outline-none focus:border-zinc-650 min-h-[50px] resize-none leading-normal font-sans"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleQuickCreateSubmit(col.id);
                          }
                          if (e.key === 'Escape') {
                            setActiveCreatorCol(null);
                            setNewCardTitle('');
                          }
                        }}
                      />
                      <div className="flex items-center gap-1.5 justify-start">
                        <button
                          type="button"
                          onClick={() => handleQuickCreateSubmit(col.id)}
                          className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-[9px] px-2.5 py-1.5 uppercase transition-all tracking-wider font-mono cursor-pointer rounded animate-none"
                        >
                          Añadir tarjeta
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveCreatorCol(null);
                            setNewCardTitle('');
                          }}
                          className="text-zinc-500 hover:text-white p-1 cursor-pointer transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCreatorCol(col.id);
                        setNewCardTitle('');
                      }}
                      className="w-full flex items-center justify-between text-[10px] font-bold text-zinc-550 hover:text-zinc-350 hover:bg-zinc-800/40 p-1.5 transition-all group font-mono uppercase tracking-wider rounded-none"
                    >
                      <span className="flex items-center gap-1">
                        <Plus className="h-3.5 w-3.5" />
                        Añade una tarjeta
                      </span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="h-3 w-3 text-zinc-500" />
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
