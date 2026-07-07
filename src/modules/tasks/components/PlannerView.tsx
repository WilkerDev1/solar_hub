'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import KanbanCard from '@/core/components/KanbanCard';
import { TaskRow, createTask } from '@/core/services/tasks';
import { 
  SlidersHorizontal, Plus, X, Edit2, Trash2, Calendar, Clock, 
  Inbox, CheckSquare, Sparkles, AlertCircle 
} from 'lucide-react';

interface PlannerViewProps {
  filteredTasks: TaskRow[];
  employees: any[];
  projects: any[];
  documentMap: Record<string, { name: string; mime_type: string }>;
  handleOpenTask: (task: TaskRow) => void;
  handleToggleCheck: (e: React.MouseEvent, task: TaskRow) => void;
  loadTasks: () => void;
  handleEditTask: (task: TaskRow) => void;
  handleDeleteTask: (task: TaskRow) => void;
  user: any;
  taskMapping: Record<string, string>;
  saveTaskMapping: (mapping: Record<string, string>) => void;
}

interface PlannerColumn {
  id: string;
  title: string;
  isCustom?: boolean;
}

export default function PlannerView({
  filteredTasks,
  employees,
  projects,
  documentMap,
  handleOpenTask,
  handleToggleCheck,
  loadTasks,
  handleEditTask,
  handleDeleteTask,
  user,
  taskMapping,
  saveTaskMapping
}: PlannerViewProps) {
  // 1. Planner columns state (loaded from localstorage)
  const [columns, setColumns] = useState<PlannerColumn[]>([
    { id: 'inbox', title: 'Bandeja de entrada' },
    { id: 'today', title: 'Hoy' },
    { id: 'this_week', title: 'Esta semana' },
    { id: 'later', title: 'Más tarde' }
  ]);

  // Creator state for new columns
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');

  // Column renaming state
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editingColTitle, setEditingColTitle] = useState('');

  // Quick card creator state per column
  const [activeCreatorCol, setActiveCreatorCol] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');

  // Inbox specific filters state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [inboxFilters, setInboxFilters] = useState({
    keyword: '',
    createdDate: 'all', // 'all' | 'week' | 'two_weeks' | 'month'
    completed: 'all', // 'all' | 'completed' | 'pending'
    dueStatus: {
      noDue: false,
      overdue: false,
      tomorrow: false,
      nextWeek: false,
      nextMonth: false
    }
  });

  const filterRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load custom columns from localStorage on mount
  useEffect(() => {
    const savedCustomCols = localStorage.getItem('solar_hub_planner_custom_columns');
    if (savedCustomCols) {
      try {
        const parsed = JSON.parse(savedCustomCols) as PlannerColumn[];
        setColumns([
          { id: 'inbox', title: 'Bandeja de entrada' },
          { id: 'today', title: 'Hoy' },
          { id: 'this_week', title: 'Esta semana' },
          { id: 'later', title: 'Más tarde' },
          ...parsed
        ]);
      } catch (e) {
        console.error('Error loading custom planner columns:', e);
      }
    }
  }, []);

  // Helper to save custom columns
  const saveCustomColumns = (newCols: PlannerColumn[]) => {
    const customOnly = newCols.filter(col => col.isCustom);
    localStorage.setItem('solar_hub_planner_custom_columns', JSON.stringify(customOnly));
  };

  // Create new custom column list
  const handleAddListSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;

    const newColId = `col_${Date.now()}`;
    const updated = [
      ...columns,
      { id: newColId, title: newListTitle.trim(), isCustom: true }
    ];
    setColumns(updated);
    saveCustomColumns(updated);
    setNewListTitle('');
    setIsAddingList(false);
  };

  // Rename custom column
  const handleRenameCol = (colId: string) => {
    if (!editingColTitle.trim()) return;
    const updated = columns.map(col => 
      col.id === colId ? { ...col, title: editingColTitle.trim() } : col
    );
    setColumns(updated);
    saveCustomColumns(updated);
    setEditingColId(null);
    setEditingColTitle('');
  };

  // Delete custom column
  const handleDeleteCol = (colId: string) => {
    if (!confirm('¿Está seguro que desea eliminar esta lista de planificación? Las tareas de esta lista volverán a la Bandeja de entrada.')) return;
    
    // Remove column
    const updatedCols = columns.filter(col => col.id !== colId);
    setColumns(updatedCols);
    saveCustomColumns(updatedCols);

    // Revert tasks mapped to this column back to inbox
    const updatedMapping = { ...taskMapping };
    Object.keys(updatedMapping).forEach(taskId => {
      if (updatedMapping[taskId] === colId) {
        delete updatedMapping[taskId]; // fallback to inbox
      }
    });
    saveTaskMapping(updatedMapping);
  };

  // Quick createTask within a column
  const handleQuickCreateSubmit = async (colId: string) => {
    if (!newCardTitle.trim()) return;
    try {
      const created = await createTask({
        title: newCardTitle.trim(),
        origin: 'proyecto',
        task_type: 'check',
        assigned_to: user?.id || '',
        priority: 'media',
        area: 'general'
      });

      // Update mapping
      const updatedMapping = { ...taskMapping };
      if (colId !== 'inbox') {
        updatedMapping[created.id] = colId;
      }
      saveTaskMapping(updatedMapping);

      setNewCardTitle('');
      setActiveCreatorCol(null);
      loadTasks();
    } catch (e: any) {
      alert('Error creando tarea rápida: ' + e.message);
    }
  };

  // Filter tasks belonging to a column
  const getColTasks = (colId: string) => {
    const tasksInCol = filteredTasks.filter(task => {
      const mappedCol = taskMapping[task.id] || 'inbox';
      return mappedCol === colId;
    });

    // If it's the Inbox, apply inbox specific filters
    if (colId === 'inbox') {
      return tasksInCol.filter(task => {
        // Keyword Search
        if (inboxFilters.keyword) {
          const kw = inboxFilters.keyword.toLowerCase();
          const matchTitle = task.title.toLowerCase().includes(kw);
          const matchDesc = task.description?.toLowerCase().includes(kw) || false;
          if (!matchTitle && !matchDesc) return false;
        }

        // Created Date Filter
        if (inboxFilters.createdDate !== 'all') {
          const now = Date.now();
          const taskCreated = new Date(task.created_at).getTime();
          let limit = 7 * 24 * 60 * 60 * 1000; // default week
          if (inboxFilters.createdDate === 'two_weeks') limit = 14 * 24 * 60 * 60 * 1000;
          if (inboxFilters.createdDate === 'month') limit = 30 * 24 * 60 * 60 * 1000;
          if (now - taskCreated > limit) return false;
        }

        // Card Status Filter
        if (inboxFilters.completed !== 'all') {
          const isCompleted = task.status === 'completada';
          if (inboxFilters.completed === 'completed' && !isCompleted) return false;
          if (inboxFilters.completed === 'pending' && isCompleted) return false;
        }

        // Due Date filter checks
        const { noDue, overdue, tomorrow, nextWeek, nextMonth } = inboxFilters.dueStatus;
        const hasDueFilterActive = noDue || overdue || tomorrow || nextWeek || nextMonth;
        
        if (hasDueFilterActive) {
          const dueDate = (task as any).due_date;
          if (!dueDate) {
            return noDue; // task has no due date
          }

          const todayStr = new Date().toISOString().split('T')[0];
          const today = new Date(todayStr);
          const taskDate = new Date(dueDate);

          // Overdue Check
          if (overdue && taskDate < today && task.status !== 'completada') {
            return true;
          }

          // Tomorrow Check
          const tomorrowTime = today.getTime() + 24 * 60 * 60 * 1000;
          const tomorrowStr = new Date(tomorrowTime).toISOString().split('T')[0];
          if (tomorrow && dueDate === tomorrowStr) {
            return true;
          }

          // Next Week Check (within next 7 days, excluding tomorrow)
          const nextWeekLimit = today.getTime() + 7 * 24 * 60 * 60 * 1000;
          if (nextWeek && taskDate > new Date(tomorrowTime) && taskDate <= new Date(nextWeekLimit)) {
            return true;
          }

          // Next Month Check (within next 30 days, excluding next week)
          const nextMonthLimit = today.getTime() + 30 * 24 * 60 * 60 * 1000;
          if (nextMonth && taskDate > new Date(nextWeekLimit) && taskDate <= new Date(nextMonthLimit)) {
            return true;
          }

          return false;
        }

        return true;
      });
    }

    return tasksInCol;
  };

  // Drag and Drop End handler
  const onDragEndLocal = (result: any) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const updatedMapping = { ...taskMapping };
    const destColId = destination.droppableId;

    if (destColId === 'inbox') {
      delete updatedMapping[draggableId];
    } else {
      updatedMapping[draggableId] = destColId;
    }

    saveTaskMapping(updatedMapping);
  };

  return (
    <div className="flex flex-col space-y-4 h-full min-h-0">
      <DragDropContext onDragEnd={onDragEndLocal}>
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4 items-stretch select-none">
          {columns.map(col => {
            const colTasks = getColTasks(col.id);
            return (
              <div key={col.id} className="bg-[#1e1e24] border border-zinc-700 rounded-2xl flex flex-col min-h-0 h-full p-4 border-t-2 border-t-zinc-600 w-[280px] md:w-[320px] shrink-0">
                
                {/* Column Header */}
                <div className="flex justify-between items-center mb-3.5 shrink-0 px-1 relative">
                  {editingColId === col.id ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <input
                        type="text"
                        value={editingColTitle}
                        onChange={(e) => setEditingColTitle(e.target.value)}
                        className="text-xs bg-zinc-950 border border-zinc-700 text-white rounded px-1.5 py-1 focus:outline-none w-full"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameCol(col.id);
                          if (e.key === 'Escape') setEditingColId(null);
                        }}
                      />
                      <button onClick={() => handleRenameCol(col.id)} className="text-emerald-500 hover:text-emerald-400 p-0.5">
                        <CheckSquare className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditingColId(null)} className="text-zinc-400 hover:text-white p-0.5">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 min-w-0">
                        {col.id === 'inbox' && <Inbox className="h-3.5 w-3.5 text-zinc-400" />}
                        <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-widest font-mono truncate max-w-[130px] md:max-w-[170px]" title={col.title}>
                          {col.title}
                        </span>
                        
                        {/* Inbox filters icon */}
                        {col.id === 'inbox' && (
                          <div className="relative" ref={filterRef}>
                            <button
                              onClick={() => setIsFilterOpen(!isFilterOpen)}
                              className={`p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer ${
                                inboxFilters.keyword || inboxFilters.createdDate !== 'all' || inboxFilters.completed !== 'all' || Object.values(inboxFilters.dueStatus).some(Boolean)
                                  ? 'text-emerald-500 bg-emerald-500/10'
                                  : 'text-zinc-550'
                              }`}
                              title="Filtrar bandeja de entrada"
                            >
                              <SlidersHorizontal className="h-3 w-3" />
                            </button>

                            {/* Inbox specific filters dropdown */}
                            {isFilterOpen && (
                              <div className="absolute top-7 left-0 z-50 w-64 bg-zinc-900 border border-zinc-800 p-4 space-y-4 rounded-xl shadow-2xl text-zinc-300">
                                <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                                  <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-zinc-450">Filtrar</span>
                                  <button onClick={() => setIsFilterOpen(false)} className="text-zinc-500 hover:text-white">
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                {/* Palabra Clave */}
                                <div className="space-y-1.5 text-left">
                                  <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 font-mono">Palabra clave</label>
                                  <input
                                    type="text"
                                    placeholder="Introduce una palabra clave"
                                    value={inboxFilters.keyword}
                                    onChange={(e) => setInboxFilters({
                                      ...inboxFilters,
                                      keyword: e.target.value
                                    })}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-700"
                                  />
                                </div>

                                {/* Tarjeta Creada */}
                                <div className="space-y-1.5 text-left">
                                  <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 font-mono">Tarjeta creada</label>
                                  <div className="space-y-2">
                                    {[
                                      { id: 'week', label: 'Última semana' },
                                      { id: 'two_weeks', label: 'Últimas dos semanas' },
                                      { id: 'month', label: 'Último mes' }
                                    ].map(dateItem => (
                                      <label key={dateItem.id} className="flex items-center gap-2 text-[10px] text-zinc-450 hover:text-zinc-200 cursor-pointer">
                                        <input
                                          type="radio"
                                          name="inbox_created"
                                          checked={inboxFilters.createdDate === dateItem.id}
                                          onChange={() => setInboxFilters({
                                            ...inboxFilters,
                                            createdDate: inboxFilters.createdDate === dateItem.id ? 'all' : dateItem.id
                                          })}
                                          className="rounded border-zinc-800 bg-zinc-950 text-emerald-600 focus:ring-0 cursor-pointer"
                                        />
                                        <span>Creado durante la {dateItem.label.toLowerCase()}</span>
                                      </label>
                                    ))}
                                    {inboxFilters.createdDate !== 'all' && (
                                      <button 
                                        onClick={() => setInboxFilters({ ...inboxFilters, createdDate: 'all' })}
                                        className="text-[8.5px] font-bold text-zinc-500 hover:text-white uppercase font-mono tracking-wider"
                                      >
                                        Limpiar filtro de fecha
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Estado de la tarjeta */}
                                <div className="space-y-1.5 text-left">
                                  <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 font-mono">Estado de la tarjeta</label>
                                  <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-[10px] text-zinc-450 hover:text-zinc-200 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={inboxFilters.completed === 'completed'}
                                        onChange={() => setInboxFilters({
                                          ...inboxFilters,
                                          completed: inboxFilters.completed === 'completed' ? 'all' : 'completed'
                                        })}
                                        className="rounded border-zinc-800 bg-zinc-950 text-emerald-600 focus:ring-0 cursor-pointer"
                                      />
                                      <span>Marcar como completada</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-[10px] text-zinc-450 hover:text-zinc-200 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={inboxFilters.completed === 'pending'}
                                        onChange={() => setInboxFilters({
                                          ...inboxFilters,
                                          completed: inboxFilters.completed === 'pending' ? 'all' : 'pending'
                                        })}
                                        className="rounded border-zinc-800 bg-zinc-950 text-emerald-600 focus:ring-0 cursor-pointer"
                                      />
                                      <span>No marcada como completa</span>
                                    </label>
                                  </div>
                                </div>

                                {/* Vencimiento */}
                                <div className="space-y-1.5 text-left">
                                  <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 font-mono">Vencimiento</label>
                                  <div className="space-y-2">
                                    {[
                                      { key: 'noDue', label: 'Sin fecha de vencimiento', icon: Calendar, color: 'text-zinc-550' },
                                      { key: 'overdue', label: 'Plazo vencido', icon: Clock, color: 'text-rose-500' },
                                      { key: 'tomorrow', label: 'Vence el día siguiente', icon: Clock, color: 'text-amber-500' },
                                      { key: 'nextWeek', label: 'Vence la semana siguiente', icon: Clock, color: 'text-zinc-400' },
                                      { key: 'nextMonth', label: 'Vence el mes siguiente', icon: Clock, color: 'text-zinc-400' }
                                    ].map(dueItem => {
                                      const Icon = dueItem.icon;
                                      return (
                                        <label key={dueItem.key} className="flex items-center gap-2 text-[10px] text-zinc-450 hover:text-zinc-200 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={(inboxFilters.dueStatus as any)[dueItem.key]}
                                            onChange={() => setInboxFilters({
                                              ...inboxFilters,
                                              dueStatus: {
                                                ...inboxFilters.dueStatus,
                                                [dueItem.key]: !(inboxFilters.dueStatus as any)[dueItem.key]
                                              }
                                            })}
                                            className="rounded border-zinc-800 bg-zinc-950 text-emerald-600 focus:ring-0 cursor-pointer"
                                          />
                                          <Icon className={`h-3 w-3 shrink-0 ${dueItem.color}`} />
                                          <span>{dueItem.label}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Clean all button */}
                                <button
                                  onClick={() => setInboxFilters({
                                    keyword: '',
                                    createdDate: 'all',
                                    completed: 'all',
                                    dueStatus: { noDue: false, overdue: false, tomorrow: false, nextWeek: false, nextMonth: false }
                                  })}
                                  className="w-full text-center py-1.5 border border-zinc-800 hover:bg-zinc-800 text-[9px] font-bold uppercase tracking-wider font-mono rounded cursor-pointer transition-colors"
                                >
                                  Limpiar todos los filtros
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded text-[10px] font-bold font-mono border border-zinc-700">
                          {colTasks.length}
                        </span>
                        {col.isCustom && (
                          <div className="flex items-center ml-1">
                            <button
                              onClick={() => {
                                setEditingColId(col.id);
                                setEditingColTitle(col.title);
                              }}
                              className="p-1 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                              title="Renombrar lista"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteCol(col.id)}
                              className="p-1 text-zinc-500 hover:text-rose-500 transition-colors cursor-pointer"
                              title="Eliminar lista"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Column Body list */}
                <div className="flex-1 min-h-0 flex flex-col justify-between">
                  <Droppable droppableId={col.id}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex-1 overflow-y-auto space-y-3 pb-2 min-h-[150px] scrollbar-thin scrollbar-thumb-zinc-850 pr-1 text-left"
                      >
                        {colTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(draggableProvided, snapshot) => (
                              <div
                                ref={draggableProvided.innerRef}
                                {...draggableProvided.draggableProps}
                                {...draggableProvided.dragHandleProps}
                                className={`rounded transition-transform select-none ${
                                  snapshot.isDragging ? 'shadow-2xl scale-[1.02] border-emerald-500' : ''
                                }`}
                              >
                                <KanbanCard
                                  task={task}
                                  index={index}
                                  onClick={() => handleOpenTask(task)}
                                  handleToggleCheck={handleToggleCheck}
                                  employees={employees}
                                  projects={projects}
                                  showProjectBadge={true}
                                  showStatus={true}
                                  onUploadSuccess={loadTasks}
                                  documentMap={documentMap}
                                  onEditClick={handleEditTask}
                                  onDeleteClick={handleDeleteTask}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        
                        {colTasks.length === 0 && (
                          <div className="py-8 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl">
                            <span className="text-zinc-650 text-[10px] italic font-mono font-bold">Columna vacía</span>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>

                  {/* Inline quick creator at the bottom of the column */}
                  <div className="mt-2 pt-2 border-t border-zinc-800/60 shrink-0">
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
                            className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-[9px] px-2.5 py-1.5 uppercase transition-all tracking-wider font-mono cursor-pointer rounded"
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
                        className="w-full flex items-center justify-between text-[10px] font-bold text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 p-2 transition-all group font-mono uppercase tracking-wider rounded"
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
                </div>

              </div>
            );
          })}

          {/* Column creator: "Agregar nueva lista" */}
          <div className="w-[280px] md:w-[320px] shrink-0">
            {isAddingList ? (
              <form 
                onSubmit={handleAddListSubmit}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3 text-left"
              >
                <input
                  type="text"
                  placeholder="Introduce el título de la lista..."
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white rounded p-2 focus:outline-none focus:border-zinc-700"
                  autoFocus
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-[10px] px-3.5 py-2 uppercase tracking-wider font-mono rounded cursor-pointer transition-all"
                  >
                    Añadir lista
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingList(false);
                      setNewListTitle('');
                    }}
                    className="text-zinc-500 hover:text-white p-1.5 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingList(true)}
                className="w-full flex items-center justify-center gap-2 bg-[#1e1e24]/40 hover:bg-[#1e1e24]/75 border border-dashed border-zinc-850 hover:border-zinc-750 text-[10px] font-bold text-zinc-450 hover:text-white py-4 px-6 rounded-2xl transition-all font-mono uppercase tracking-wider shrink-0 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Agregar nueva lista
              </button>
            )}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
