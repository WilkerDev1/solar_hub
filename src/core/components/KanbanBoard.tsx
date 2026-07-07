'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import KanbanCard from '@/core/components/KanbanCard';
import { TaskRow } from '@/core/services/tasks';
import { Plus, X, SlidersHorizontal } from 'lucide-react';

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

  // Column settings / filters state
  const [colSearch, setColSearch] = useState<Record<string, string>>({});
  const [colColors, setColColors] = useState<Record<string, string>>({});
  const [activeMenuCol, setActiveMenuCol] = useState<string | null>(null);

  const columns = [
    { id: 'backlog', label: 'Backlog', defaultColor: '#15803d' }, // Dark green / emerald-700 by default
    { id: 'pendiente', label: 'Por Hacer', defaultColor: '#6366f1' },
    { id: 'en_progreso', label: 'En Progreso', defaultColor: '#a855f7' },
    { id: 'bloqueada', label: 'Bloqueada', defaultColor: '#f43f5e' },
    { id: 'completada', label: 'Hecha', defaultColor: '#3b82f6' }
  ] as const;

  // Load custom colors from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('solar_hub_kanban_col_colors');
    if (saved) {
      try {
        setColColors(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading Kanban column colors:', e);
      }
    }
  }, []);

  const saveColor = (colId: string, color: string | null) => {
    const updated = { ...colColors };
    if (color) {
      updated[colId] = color;
    } else {
      delete updated[colId];
    }
    setColColors(updated);
    localStorage.setItem('solar_hub_kanban_col_colors', JSON.stringify(updated));
  };

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

  const getFilteredTasks = (colId: 'backlog' | 'pendiente' | 'en_progreso' | 'bloqueada' | 'completada') => {
    let tasks = getColumnTasks(colId);
    const search = colSearch[colId];
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      tasks = tasks.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.description?.toLowerCase().includes(q)
      );
    }
    return tasks;
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      {/* Backdrop overlay to close menu when clicking outside */}
      {activeMenuCol && (
        <div 
          className="fixed inset-0 z-40 bg-transparent cursor-default" 
          onClick={() => setActiveMenuCol(null)} 
        />
      )}

      <div className="flex gap-4 overflow-x-auto pb-4 h-full w-full scrollbar-thin scrollbar-thumb-zinc-800 items-stretch select-none">
        {columns.map(col => {
          const colTasks = getFilteredTasks(col.id);
          const currentColor = colColors[col.id] || col.defaultColor;

          return (
            <div 
              key={col.id} 
              className="bg-[#1e1e24] border border-zinc-700 rounded-none flex flex-col min-h-0 h-full p-3.5 border-t-2 w-[280px] md:w-[320px] shrink-0"
              style={{ borderTopColor: currentColor }}
            >
              {/* Column Header */}
              <div className="flex justify-between items-center mb-3 shrink-0 px-1 relative">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
                  {col.label}
                </span>

                <div className="flex items-center gap-1.5 z-10">
                  <span className="bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded text-[10px] font-bold font-mono border border-zinc-700">
                    {colTasks.length}
                  </span>

                  {/* Settings / Filters Button */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenuCol(activeMenuCol === col.id ? null : col.id)}
                      className={`p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer ${
                        colSearch[col.id] || colColors[col.id]
                          ? 'text-emerald-500 bg-emerald-500/10'
                          : 'text-zinc-550 hover:text-zinc-300'
                      }`}
                      title="Filtros y Ajustes de columna"
                    >
                      <SlidersHorizontal className="h-3 w-3" />
                    </button>

                    {/* Dropdown Menu */}
                    {activeMenuCol === col.id && (
                      <div className="absolute top-7 right-0 z-50 w-60 bg-zinc-900 border border-zinc-800 p-4 space-y-4 rounded-xl shadow-2xl text-zinc-300">
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                          <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-zinc-450">Filtros y Ajustes</span>
                          <button 
                            type="button"
                            onClick={() => setActiveMenuCol(null)} 
                            className="text-zinc-550 hover:text-white"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Keyword Search */}
                        <div className="space-y-1.5 text-left">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 font-mono">Buscar en columna</label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Buscar tarjetas..."
                              value={colSearch[col.id] || ''}
                              onChange={(e) => setColSearch({ ...colSearch, [col.id]: e.target.value })}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-700"
                            />
                            {colSearch[col.id] && (
                              <button
                                type="button"
                                onClick={() => setColSearch({ ...colSearch, [col.id]: '' })}
                                className="absolute right-2 top-2 text-zinc-500 hover:text-white"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Color Selector */}
                        <div className="space-y-1.5 text-left">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 font-mono">Color de columna</label>
                          <div className="grid grid-cols-6 gap-1.5">
                            {[
                              { hex: '#15803d', name: 'Verde' },
                              { hex: '#eab308', name: 'Oro' },
                              { hex: '#f97316', name: 'Naranja' },
                              { hex: '#ef4444', name: 'Rojo' },
                              { hex: '#a855f7', name: 'Púrpura' },
                              { hex: '#3b82f6', name: 'Azul' },
                              { hex: '#14b8a6', name: 'Teal' },
                              { hex: '#84cc16', name: 'Lima' },
                              { hex: '#ec4899', name: 'Rosa' },
                              { hex: '#71717a', name: 'Gris' }
                            ].map(color => (
                              <button
                                key={color.hex}
                                type="button"
                                onClick={() => saveColor(col.id, color.hex)}
                                className="h-6 w-6 rounded-full border border-zinc-750 cursor-pointer hover:scale-110 active:scale-95 transition-all relative flex items-center justify-center shrink-0"
                                style={{ backgroundColor: color.hex }}
                                title={color.name}
                              >
                                {currentColor === color.hex && (
                                  <span className="h-1.5 w-1.5 bg-white rounded-full animate-none" />
                                )}
                              </button>
                            ))}

                            {/* Custom Color Color Picker */}
                            <div className="relative h-6 w-6 rounded-full overflow-hidden border border-zinc-750 hover:scale-110 active:scale-95 transition-all flex items-center justify-center bg-gradient-to-tr from-rose-500 via-emerald-500 to-blue-500 cursor-pointer shrink-0">
                              <input
                                type="color"
                                value={colColors[col.id] || col.defaultColor}
                                onChange={(e) => saveColor(col.id, e.target.value)}
                                className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                                title="Color personalizado"
                              />
                              {/* Custom check indicator */}
                              {colColors[col.id] && ![ '#15803d', '#eab308', '#f97316', '#ef4444', '#a855f7', '#3b82f6', '#14b8a6', '#84cc16', '#ec4899', '#71717a' ].includes(colColors[col.id]) && (
                                <span className="h-1.5 w-1.5 bg-white rounded-full z-10" />
                              )}
                            </div>
                          </div>
                        </div>

                        {colColors[col.id] && (
                          <button
                            type="button"
                            onClick={() => saveColor(col.id, null)}
                            className="w-full text-center py-1.5 border border-zinc-800 hover:bg-zinc-850 text-[9px] font-bold uppercase tracking-wider font-mono rounded cursor-pointer transition-colors"
                          >
                            Quitar color
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex-1 min-h-0 flex flex-col justify-between">
                <Droppable droppableId={col.id}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex-1 overflow-y-auto space-y-3 pb-2 min-h-[150px] scrollbar-thin scrollbar-thumb-zinc-800 pr-1 text-left"
                    >
                      {colTasks.map((task, index) => (
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

                      {colTasks.length === 0 && colSearch[col.id] && (
                        <div className="py-6 text-center text-zinc-600 text-[10px] font-mono italic">
                          No se encontraron tarjetas
                        </div>
                      )}
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
          );
        })}
      </div>
    </DragDropContext>
  );
}
