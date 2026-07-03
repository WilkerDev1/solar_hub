'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/core/auth/AuthContext';
import { 
  getTasks, 
  createTask, 
  updateTaskStatus, 
  updateTask,
  uploadTaskEvidence,
  deleteTask,
  TaskRow 
} from '@/core/services/tasks';
import { 
  ClipboardList, CheckSquare, Square, ExternalLink, Loader2, AlertCircle,
  FolderKanban, Building, Package, Database, Calendar, Plus, List, LayoutGrid,
  Filter, SlidersHorizontal, ChevronLeft, ChevronRight, User, Tag, Clock, ArrowRight, X,
  FileText, Upload, Edit, Trash2
} from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { supabase } from '@/core/database/supabase';
import TaskDetailDrawer from '@/core/components/TaskDetailDrawer';
import { getApiUrl } from '@/core/utils/api';

// Drag & Drop Imports
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

type ViewMode = 'kanban' | 'list' | 'calendar';

export default function TasksModule() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Tasks list state
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentMap, setDocumentMap] = useState<Record<string, { name: string; mime_type: string }>>({});
  
  // Auxiliary lists
  const [employees, setEmployees] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  // Navigation / View state
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [activeTab, setActiveTab] = useState<'todos' | 'proyecto' | 'almacen' | 'administracion'>('todos');

  // Filter values
  const [filterProject, setFilterProject] = useState('todos');
  const [filterArea, setFilterArea] = useState('todos');
  const [filterPriority, setFilterPriority] = useState('todos');
  const [onlyMyTasks, setOnlyMyTasks] = useState(true);

  // Selected task for drawer
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerEditMode, setDrawerEditMode] = useState(false);

  // Create Task form state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    origin: 'proyecto' as any,
    task_type: 'check' as any,
    assigned_to: '',
    project_id: '',
    area: 'general' as any,
    priority: 'media' as any,
    due_date: '',
    requires_audit: false
  });

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());

  // Prevent DND hydration issues
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch all profiles & projects for filters/drawer
  const loadAuxiliaryData = async () => {
    try {
      const [profilesRes, projectsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            email,
            user_roles (
              roles (
                name
              )
            )
          `),
        supabase.from('projects').select('id, name, member_ids')
      ]);

      if (profilesRes.data) {
        const formatted = profilesRes.data.map((p: any) => ({
          id: p.id,
          full_name: p.full_name || p.email || 'Desconocido',
          roleName: p.user_roles?.[0]?.roles?.name || 'Colaborador'
        }));
        setEmployees(formatted);
      }

      if (projectsRes.data) {
        setProjects(projectsRes.data);
      }
    } catch (e) {
      console.error('Error loading auxiliary data:', e);
    }
  };

  const loadTasks = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      // Get all tasks (RLS filters company)
      const data = await getTasks();
      setTasks(data);

      // Fetch metadata of documents for these tasks
      const taskIds = data.map(t => t.id);
      if (taskIds.length > 0) {
        const { data: docs, error: docsErr } = await supabase
          .from('documents')
          .select('id, name, mime_type')
          .in('task_id', taskIds);
        
        if (!docsErr && docs) {
          const map: Record<string, { name: string; mime_type: string }> = {};
          docs.forEach(d => {
            map[d.id] = { name: d.name, mime_type: d.mime_type || '' };
          });
          setDocumentMap(map);
        }
      }
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
      setError(err.message || 'Error al cargar las tareas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuxiliaryData();
    loadTasks();
  }, [user]);

  // Open task drawer
  const handleOpenTask = (task: TaskRow) => {
    setSelectedTask(task);
    setDrawerEditMode(false);
    setIsDrawerOpen(true);
  };

  const handleEditTask = (task: TaskRow) => {
    setSelectedTask(task);
    setDrawerEditMode(true);
    setIsDrawerOpen(true);
  };

  const handleDeleteTask = async (task: TaskRow) => {
    if (!confirm(`¿Está seguro que desea eliminar la tarea "${task.title}"?`)) return;
    try {
      await deleteTask(task.id);
      alert('Tarea eliminada con éxito.');
      loadTasks();
    } catch (err: any) {
      alert('Error al eliminar tarea: ' + err.message);
    }
  };

  // Close drawer and reload
  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    setSelectedTask(null);
    setDrawerEditMode(false);
  };

  // Toggle checkbox status for 'check' tasks
  const handleToggleCheck = async (e: React.MouseEvent, task: TaskRow) => {
    e.stopPropagation(); // Avoid opening drawer
    const nextStatus = task.status === 'completada' ? 'pendiente' : 'completada';
    
    // Optimistic Update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));

    try {
      await updateTaskStatus(task.id, nextStatus);
      loadTasks(); // Silent refresh
    } catch (err: any) {
      // Revert on error
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t));
      alert('Error: ' + err.message);
    }
  };

  // Create Task Submission
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) return;

    try {
      const assigned = createForm.assigned_to || user?.id || '';
      await createTask({
        title: createForm.title.trim(),
        description: createForm.description.trim() || null,
        origin: createForm.origin,
        task_type: createForm.task_type,
        assigned_to: assigned,
        project_id: createForm.project_id || null,
        area: createForm.area,
        priority: createForm.priority,
        due_date: createForm.due_date || null,
        requires_audit: createForm.requires_audit
      });

      setIsCreateOpen(false);
      setCreateForm({
        title: '',
        description: '',
        origin: 'proyecto',
        task_type: 'check',
        assigned_to: '',
        project_id: '',
        area: 'general',
        priority: 'media',
        due_date: '',
        requires_audit: false
      });
      loadTasks();
    } catch (err: any) {
      alert('Error creando tarea: ' + err.message);
    }
  };

  // DND Drag End Handler
  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const nextStatus = destination.droppableId as 'backlog' | 'pendiente' | 'en_progreso' | 'bloqueada' | 'completada';

    // Optimistic Update locally
    setTasks(prev => prev.map(t => t.id === draggableId ? { ...t, status: nextStatus } : t));

    try {
      await updateTaskStatus(draggableId, nextStatus);
      loadTasks(); // Silent refresh to ensure audit logs sync
    } catch (err: any) {
      // Revert on error
      loadTasks();
      alert('Error al actualizar estado: ' + err.message);
    }
  };

  // Filters logic
  const filteredTasks = tasks.filter(task => {
    // 1. Tab filter (origin)
    if (activeTab !== 'todos' && task.origin !== activeTab) return false;

    // 2. Project filter
    if (filterProject !== 'todos' && task.project_id !== filterProject) return false;

    // 3. Area filter
    if (filterArea !== 'todos' && task.area !== filterArea) return false;

    // 4. Priority filter
    if (filterPriority !== 'todos' && (task as any).priority !== filterPriority) return false;

    // 5. "Only my tasks" filter
    if (onlyMyTasks) {
      const isAssigned = (task as any).assigned_to_ids?.includes(user?.id) || task.assigned_to === user?.id;
      if (!isAssigned) return false;
    }

    return true;
  });

  // Split tasks into kanban columns
  const getColumnTasks = (status: 'backlog' | 'pendiente' | 'en_progreso' | 'bloqueada' | 'completada') => {
    return filteredTasks.filter(t => t.status === status);
  };

  // Icons helper
  const getOriginIcon = (origin: string) => {
    switch (origin) {
      case 'proyecto': return <FolderKanban className="h-3.5 w-3.5 text-emerald-400" />;
      case 'almacen': return <Package className="h-3.5 w-3.5 text-blue-400" />;
      case 'administracion': return <Database className="h-3.5 w-3.5 text-purple-400" />;
      default: return <ClipboardList className="h-3.5 w-3.5 text-zinc-400" />;
    }
  };

  // Subtask progress
  const getSubtaskProgress = (subtasks: any) => {
    if (!subtasks || !Array.isArray(subtasks) || subtasks.length === 0) return null;
    const completed = subtasks.filter((s: any) => s.completed).length;
    return `${completed}/${subtasks.length}`;
  };

  // Calendar Helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => new Date(year, month, i + 1));
  };

  const getCalendarDays = () => {
    const days = getDaysInMonth(currentDate);
    const firstDayIndex = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    
    // Pad first week with empty cells
    const padding = Array.from({ length: (firstDayIndex + 6) % 7 }, () => null);
    return [...padding, ...days];
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const getTasksForDate = (date: Date) => {
    return filteredTasks.filter(task => {
      if (!(task as any).due_date) return false;
      const tDate = new Date((task as any).due_date);
      return tDate.getDate() === date.getDate() &&
             tDate.getMonth() === date.getMonth() &&
             tDate.getFullYear() === date.getFullYear();
    });
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-6 text-left pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-emerald-400" />
            Consola Operativa de Tareas
          </h1>
          <p className="text-zinc-400 text-xs mt-1">
            Tablero interactivo de seguimiento, control de revisiones e historial de tareas del equipo.
          </p>
        </div>
        <div className="flex gap-2">
          {/* View Toggles */}
          <div className="bg-zinc-900 border border-zinc-800 p-0.5 rounded-xl flex">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'kanban' 
                  ? 'bg-zinc-800 text-white shadow-inner' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Vista Tablero (Kanban)"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'list' 
                  ? 'bg-zinc-800 text-white shadow-inner' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Vista Lista"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'calendar' 
                  ? 'bg-zinc-800 text-white shadow-inner' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Vista Calendario"
            >
              <Calendar className="h-4 w-4" />
            </button>
          </div>

          <Button onClick={() => setIsCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 px-4 rounded-xl">
            <Plus className="h-4 w-4 mr-1.5" /> Nueva Tarea
          </Button>
        </div>
      </div>

      {/* Navigation Tabs (Origin) */}
      <div className="flex border-b border-zinc-850 pb-2 gap-2 overflow-x-auto">
        {(['todos', 'proyecto', 'almacen', 'administracion'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all uppercase whitespace-nowrap ${
              activeTab === tab
                ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/20 font-bold'
                : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Filters Row */}
      <div className="bg-zinc-900/30 border border-zinc-850 p-4 rounded-2xl flex flex-wrap items-center gap-3.5">
        <div className="flex items-center gap-2 text-zinc-450 text-xs font-bold pr-2 border-r border-zinc-800 shrink-0">
          <Filter className="h-4 w-4 text-emerald-400" />
          <span>Filtros:</span>
        </div>

        <div className="flex flex-wrap gap-3 flex-1 min-w-[200px]">
          <select
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/50 h-9 font-semibold"
          >
            <option value="todos">Obra: Todas</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={filterArea}
            onChange={e => setFilterArea(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/50 h-9 font-semibold"
          >
            <option value="todos">Departamento: Todos</option>
            <option value="general">General</option>
            <option value="legal">Legal</option>
            <option value="almacen">Almacén</option>
            <option value="operaciones">Operaciones</option>
            <option value="administracion">Administración</option>
          </select>

          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/50 h-9 font-semibold"
          >
            <option value="todos">Prioridad: Todas</option>
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
          </select>
        </div>

        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-xl h-9 shrink-0">
          <input
            type="checkbox"
            id="only-my-tasks-checkbox"
            checked={onlyMyTasks}
            onChange={e => setOnlyMyTasks(e.target.checked)}
            className="rounded border-zinc-800 bg-zinc-900 text-emerald-600 focus:ring-emerald-500/20 h-4 w-4 cursor-pointer"
          />
          <label htmlFor="only-my-tasks-checkbox" className="text-xs font-bold text-zinc-400 cursor-pointer select-none">
            Asignadas a mí
          </label>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-zinc-900/10 border border-zinc-850 rounded-2xl">
          <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
          <span className="text-zinc-500 text-xs">Cargando tareas globales...</span>
        </div>
      ) : error ? (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-350 p-6 rounded-2xl flex items-center space-x-3 text-xs">
          <AlertCircle className="h-6 w-6 text-rose-450" />
          <span>{error}</span>
        </div>
      ) : (
        <>
          {/* VIEW: KANBAN BOARD */}
          {viewMode === 'kanban' && (
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 overflow-x-auto min-w-0 pb-4 h-[650px] items-stretch">
                
                {/* Column: Backlog */}
                <div className="bg-[#121214]/50 border border-zinc-800/80 rounded-2xl flex flex-col min-h-0 h-full p-3.5 border-t-2 border-t-zinc-600">
                  <div className="flex justify-between items-center mb-3 shrink-0 px-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Backlog</span>
                    <span className="bg-[#1c1c21] text-zinc-400 px-2 py-0.5 rounded text-[10px] font-bold font-mono border border-zinc-800">
                      {getColumnTasks('backlog').length}
                    </span>
                  </div>
                  <Droppable droppableId="backlog">
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex-1 overflow-y-auto space-y-3 pb-4 min-h-[150px] scrollbar-thin scrollbar-thumb-zinc-800 pr-1"
                      >
                        {getColumnTasks('backlog').map((task, index) => (
                          <KanbanCard key={task.id} task={task} index={index} onClick={() => handleOpenTask(task)} handleToggleCheck={handleToggleCheck} employees={employees} onUploadSuccess={loadTasks} documentMap={documentMap} onEditClick={handleEditTask} onDeleteClick={handleDeleteTask} />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>

                {/* Column: To Do */}
                <div className="bg-[#121214]/50 border border-zinc-800/80 rounded-2xl flex flex-col min-h-0 h-full p-3.5 border-t-2 border-t-indigo-500">
                  <div className="flex justify-between items-center mb-3 shrink-0 px-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Por Hacer</span>
                    <span className="bg-[#1c1c21] text-zinc-400 px-2 py-0.5 rounded text-[10px] font-bold font-mono border border-zinc-800">
                      {getColumnTasks('pendiente').length}
                    </span>
                  </div>
                  <Droppable droppableId="pendiente">
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex-1 overflow-y-auto space-y-3 pb-4 min-h-[150px] scrollbar-thin scrollbar-thumb-zinc-800 pr-1"
                      >
                        {getColumnTasks('pendiente').map((task, index) => (
                          <KanbanCard key={task.id} task={task} index={index} onClick={() => handleOpenTask(task)} handleToggleCheck={handleToggleCheck} employees={employees} onUploadSuccess={loadTasks} documentMap={documentMap} onEditClick={handleEditTask} onDeleteClick={handleDeleteTask} />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>

                {/* Column: In Progress */}
                <div className="bg-[#121214]/50 border border-zinc-800/80 rounded-2xl flex flex-col min-h-0 h-full p-3.5 border-t-2 border-t-purple-500">
                  <div className="flex justify-between items-center mb-3 shrink-0 px-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">En Progreso</span>
                    <span className="bg-[#1c1c21] text-zinc-400 px-2 py-0.5 rounded text-[10px] font-bold font-mono border border-zinc-800">
                      {getColumnTasks('en_progreso').length}
                    </span>
                  </div>
                  <Droppable droppableId="en_progreso">
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex-1 overflow-y-auto space-y-3 pb-4 min-h-[150px] scrollbar-thin scrollbar-thumb-zinc-800 pr-1"
                      >
                        {getColumnTasks('en_progreso').map((task, index) => (
                          <KanbanCard key={task.id} task={task} index={index} onClick={() => handleOpenTask(task)} handleToggleCheck={handleToggleCheck} employees={employees} onUploadSuccess={loadTasks} documentMap={documentMap} onEditClick={handleEditTask} onDeleteClick={handleDeleteTask} />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>

                {/* Column: Bloqueada */}
                <div className="bg-[#121214]/50 border border-zinc-800/80 rounded-2xl flex flex-col min-h-0 h-full p-3.5 border-t-2 border-t-rose-500">
                  <div className="flex justify-between items-center mb-3 shrink-0 px-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Bloqueada</span>
                    <span className="bg-[#1c1c21] text-zinc-400 px-2 py-0.5 rounded text-[10px] font-bold font-mono border border-zinc-800">
                      {getColumnTasks('bloqueada').length}
                    </span>
                  </div>
                  <Droppable droppableId="bloqueada">
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex-1 overflow-y-auto space-y-3 pb-4 min-h-[150px] scrollbar-thin scrollbar-thumb-zinc-800 pr-1"
                      >
                        {getColumnTasks('bloqueada').map((task, index) => (
                          <KanbanCard key={task.id} task={task} index={index} onClick={() => handleOpenTask(task)} handleToggleCheck={handleToggleCheck} employees={employees} onUploadSuccess={loadTasks} documentMap={documentMap} onEditClick={handleEditTask} onDeleteClick={handleDeleteTask} />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>

                {/* Column: Hecha */}
                <div className="bg-[#121214]/50 border border-zinc-800/80 rounded-2xl flex flex-col min-h-0 h-full p-3.5 border-t-2 border-t-blue-500">
                  <div className="flex justify-between items-center mb-3 shrink-0 px-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Hecha</span>
                    <span className="bg-[#1c1c21] text-zinc-400 px-2 py-0.5 rounded text-[10px] font-bold font-mono border border-zinc-800">
                      {getColumnTasks('completada').length}
                    </span>
                  </div>
                  <Droppable droppableId="completada">
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex-1 overflow-y-auto space-y-3 pb-4 min-h-[150px] scrollbar-thin scrollbar-thumb-zinc-800 pr-1"
                      >
                        {getColumnTasks('completada').map((task, index) => (
                          <KanbanCard key={task.id} task={task} index={index} onClick={() => handleOpenTask(task)} handleToggleCheck={handleToggleCheck} employees={employees} onUploadSuccess={loadTasks} documentMap={documentMap} onEditClick={handleEditTask} onDeleteClick={handleDeleteTask} />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>

              </div>
            </DragDropContext>
          )}

          {/* VIEW: DENSE LIST */}
          {viewMode === 'list' && (
            <div className="bg-zinc-900/10 border border-zinc-850 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-900/50 border-b border-zinc-850 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    <th className="px-6 py-4 w-12"></th>
                    <th className="px-6 py-4">Tarea</th>
                    <th className="px-6 py-4">Obra / Proyecto</th>
                    <th className="px-6 py-4">Departamento</th>
                    <th className="px-6 py-4">Vencimiento</th>
                    <th className="px-6 py-4">Prioridad</th>
                    <th className="px-6 py-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 text-xs">
                  {filteredTasks.map((task) => {
                    const isCompleted = task.status === 'completada';
                    const isDeliverable = ['entregable', 'reporte', 'evidencia'].includes(task.task_type);
                    const taskProject = projects.find(p => p.id === task.project_id);

                    return (
                      <tr
                        key={task.id}
                        onClick={() => handleOpenTask(task)}
                        className={`hover:bg-zinc-900/30 transition-colors cursor-pointer ${
                          isCompleted ? 'opacity-60' : ''
                        }`}
                      >
                        <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                          {!isDeliverable ? (
                            <button
                              onClick={(e) => handleToggleCheck(e, task)}
                              className="text-zinc-550 dark:text-zinc-400 hover:text-emerald-400 transition-colors"
                            >
                              {isCompleted ? (
                                <CheckSquare className="h-4.5 w-4.5 text-emerald-400" />
                              ) : (
                                <Square className="h-4.5 w-4.5" />
                              )}
                            </button>
                          ) : (
                            <FileText className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className={`font-bold text-white text-sm ${isCompleted ? 'line-through text-zinc-500' : ''}`}>
                            {task.title}
                          </div>
                          {task.description && (
                            <div className="text-[10px] text-zinc-500 truncate max-w-xs mt-0.5">{task.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-zinc-400 font-semibold">
                          {taskProject ? taskProject.name : 'Administrativa'}
                        </td>
                        <td className="px-6 py-4 text-zinc-400">
                          <span className="bg-zinc-900 border border-zinc-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                            {task.area}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-semibold text-zinc-350">
                          {(task as any).due_date ? new Date((task as any).due_date).toLocaleDateString([], { day: '2-digit', month: 'short' }) : 'N/D'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            (task as any).priority === 'alta' ? 'bg-rose-500/10 text-rose-450 border border-rose-500/20' :
                            (task as any).priority === 'media' ? 'bg-amber-500/10 text-amber-450 border border-amber-500/20' :
                            'bg-zinc-800 text-zinc-400'
                          }`}>
                            {(task as any).priority || 'baja'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold uppercase">
                          <span className={`${
                            task.status === 'completada' ? 'text-emerald-400' :
                            task.status === 'en_progreso' ? 'text-amber-400' : 'text-zinc-500'
                          }`}>
                            {task.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTasks.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-10 italic text-zinc-500">
                        No hay tareas en esta vista.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW: CALENDAR VIEW */}
          {viewMode === 'calendar' && (
            <div className="bg-zinc-900/10 border border-zinc-850 rounded-2xl p-5 shadow-xl">
              {/* Calendar Navigator Header */}
              <div className="flex justify-between items-center mb-6 px-1">
                <h3 className="font-bold text-white uppercase tracking-wider text-sm font-mono">
                  {currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex gap-2">
                  <button onClick={prevMonth} className="h-9 w-9 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                    <ChevronLeft className="h-4.5 w-4.5" />
                  </button>
                  <button onClick={nextMonth} className="h-9 w-9 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                    <ChevronRight className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

              {/* Day header grid */}
              <div className="grid grid-cols-7 gap-2.5 mb-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
                <div>Lun</div>
                <div>Mar</div>
                <div>Mié</div>
                <div>Jue</div>
                <div>Vie</div>
                <div>Sáb</div>
                <div>Dom</div>
              </div>

              {/* Month days grid */}
              <div className="grid grid-cols-7 gap-2.5">
                {getCalendarDays().map((day, idx) => {
                  if (!day) return <div key={idx} className="bg-zinc-900/5 border border-transparent min-h-24 rounded-xl" />;
                  
                  const dateTasks = getTasksForDate(day);
                  const isToday = new Date().toDateString() === day.toDateString();

                  return (
                    <div
                      key={idx}
                      className={`min-h-24 bg-zinc-900/20 border p-2 rounded-xl text-left flex flex-col justify-between hover:border-zinc-700 transition-colors ${
                        isToday ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-zinc-900'
                      }`}
                    >
                      <span className={`text-[11px] font-bold font-mono ${isToday ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {day.getDate()}
                      </span>
                      <div className="flex-1 mt-1.5 space-y-1 overflow-y-auto max-h-16 scrollbar-none">
                        {dateTasks.map(t => (
                          <div
                            key={t.id}
                            onClick={() => handleOpenTask(t)}
                            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 p-1 rounded-md text-[9px] font-bold text-zinc-200 truncate cursor-pointer hover:text-white transition-colors flex items-center gap-1"
                          >
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                              t.status === 'completada' ? 'bg-emerald-400' :
                              t.status === 'en_progreso' ? 'bg-amber-400' : 'bg-rose-400'
                            }`} />
                            <span className="truncate">{t.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* CREATE TASK DIALOG MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-zinc-850 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-emerald-400">
                <Plus className="h-5 w-5" />
                <h3 className="font-bold text-sm uppercase tracking-wide">Crear Nueva Tarea</h3>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="p-6 overflow-y-auto space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Título de la Tarea *</label>
                <input
                  required
                  type="text"
                  value={createForm.title}
                  onChange={e => setCreateForm({...createForm, title: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Ej. Realizar tendido de cable de cobre solar"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Descripción</label>
                <textarea
                  value={createForm.description}
                  onChange={e => setCreateForm({...createForm, description: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 h-20 resize-none"
                  placeholder="Instrucciones adicionales para la ejecución..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Origen / Módulo</label>
                  <select
                    value={createForm.origin}
                    onChange={e => setCreateForm({...createForm, origin: e.target.value as any})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="proyecto">Proyecto Solar (Core)</option>
                    <option value="almacen">Almacén / Logística</option>
                    <option value="administracion">Administrativo / Oficina</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Tipo Tarea</label>
                  <select
                    value={createForm.task_type}
                    onChange={e => setCreateForm({...createForm, task_type: e.target.value as any})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="check">Check (Acción Rápida)</option>
                    <option value="entregable">Entregable (Firma/Doc)</option>
                    <option value="reporte">Reporte de Campo</option>
                    <option value="evidencia">Evidencia Fotográfica</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Asignar a Colaborador *</label>
                  <select
                    required
                    value={createForm.assigned_to}
                    onChange={e => setCreateForm({...createForm, assigned_to: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="">Selecciona un colaborador</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.roleName})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Obra / Proyecto Relacionado</label>
                  <select
                    value={createForm.project_id}
                    onChange={e => setCreateForm({...createForm, project_id: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="">Sin vincular a obra</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Departamento</label>
                  <select
                    value={createForm.area}
                    onChange={e => setCreateForm({...createForm, area: e.target.value as any})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none font-semibold"
                  >
                    <option value="general">General</option>
                    <option value="legal">Legal</option>
                    <option value="almacen">Almacén</option>
                    <option value="operaciones">Operaciones</option>
                    <option value="administracion">Administración</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Prioridad</label>
                  <select
                    value={createForm.priority}
                    onChange={e => setCreateForm({...createForm, priority: e.target.value as any})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none font-semibold"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Vencimiento</label>
                  <input
                    type="date"
                    value={createForm.due_date}
                    onChange={e => setCreateForm({...createForm, due_date: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 py-2">
                <input
                  type="checkbox"
                  id="create-requires-audit"
                  checked={createForm.requires_audit}
                  onChange={e => setCreateForm({...createForm, requires_audit: e.target.checked})}
                  className="rounded border-zinc-800 bg-zinc-900 text-emerald-600 focus:ring-emerald-500/20 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="create-requires-audit" className="text-xs font-bold text-zinc-400 cursor-pointer select-none">
                  Exigir Auditoría de Líder antes de finalizar la tarea.
                </label>
              </div>

              <div className="pt-4 border-t border-zinc-850 flex justify-end gap-2 shrink-0">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-zinc-400">
                  Cancelar
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5">
                  Crear Tarea
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INTERACTIVE TASK DETAIL SLIDE-OVER DRAWER */}
      <TaskDetailDrawer
        task={selectedTask}
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        employees={employees}
        user={user}
        projects={projects}
        onTaskUpdated={loadTasks}
        initialEditMode={drawerEditMode}
      />
    </div>
  );
}

// Kanban Card Item Component
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

function KanbanCard({ task, index, onClick, handleToggleCheck, employees, onUploadSuccess, documentMap = {}, onEditClick, onDeleteClick }: KanbanCardProps) {
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
      alert('Archivo subido con éxito a la tarea.');
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err: any) {
      alert('Error al subir entregable: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Subtask progress
  const getSubtaskProgress = (subtasks: any) => {
    if (!subtasks || !Array.isArray(subtasks) || subtasks.length === 0) return null;
    const completed = subtasks.filter((s: any) => s.completed).length;
    return `${completed}/${subtasks.length}`;
  };

  const subProgress = getSubtaskProgress(task.subtasks);

  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const [zoomName, setZoomName] = useState<string>('');

  const borderAccentColor = 
    task.area === 'legal' ? 'border-l-purple-500' :
    task.area === 'almacen' ? 'border-l-blue-500' :
    task.area === 'operaciones' ? 'border-l-cyan-500' :
    task.area === 'administracion' ? 'border-l-amber-500' :
    'border-l-emerald-500'; // general

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`bg-[#1c1c21] border-l-4 ${borderAccentColor} border-t border-r border-b border-zinc-800/85 p-4 rounded-xl flex flex-col justify-between hover:border-zinc-700 transition-all select-none relative ${
            snapshot.isDragging ? 'shadow-2xl border-emerald-500 bg-zinc-900 scale-[1.02]' : ''
          } ${isCompleted ? 'opacity-65' : ''}`}
        >
          <div className="space-y-3">
            {/* Audit Status Alert Banner (Requires Audit & Pending) */}
            {task.requires_audit && task.audit_status === 'pendiente' && (
              <div className="mb-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2.5 py-1.5 rounded-lg text-[9px] font-bold flex items-center gap-1.5 animate-pulse">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span>Auditoría Pendiente (Revisar)</span>
              </div>
            )}

            {/* Badges bar */}
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex gap-1.5 flex-wrap">
                <span className="bg-zinc-800 border border-zinc-700/60 text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded text-zinc-300">
                  {task.area || 'general'}
                </span>
                
                <span className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  (task as any).priority === 'alta' ? 'bg-rose-500/20 text-rose-350 border border-rose-500/30' :
                  (task as any).priority === 'media' ? 'bg-amber-500/20 text-amber-350 border border-amber-500/30' :
                  'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}>
                  {(task as any).priority || 'baja'}
                </span>

                {task.requires_audit && task.audit_status !== 'pendiente' && (
                  <span className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${
                    task.audit_status === 'aceptado' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' :
                    task.audit_status === 'denegado' ? 'bg-rose-500/15 text-rose-400 border-rose-500/25' :
                    'bg-amber-500/15 text-amber-400 border-amber-500/25' // requiere_revision
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
                  className="p-1 rounded hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
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
                  className="p-1 rounded hover:bg-zinc-800 hover:text-rose-455 transition-colors"
                  title="Eliminar Tarea"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
                {task.task_type === 'evidencia' && <FileText className="h-3 w-3 text-purple-400 shrink-0" />}
                {task.task_type === 'reporte' && <FileText className="h-3 w-3 text-blue-400 shrink-0" />}
                {task.task_type === 'entregable' && <FileText className="h-3 w-3 text-yellow-400 shrink-0" />}
              </div>
            </div>

            {/* Task Title */}
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
              <span className={`font-bold text-xs text-white leading-snug text-left ${isCompleted ? 'line-through text-zinc-550' : ''}`}>
                {task.title}
              </span>
            </div>

            {/* Description */}
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
                  <span key={i} className="inline-flex items-center bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold transition-colors">
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
                    className="inline-flex items-center gap-1 text-[9px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold border border-zinc-800 hover:border-zinc-700 px-2 py-1 rounded-md cursor-pointer transition-colors w-fit"
                  >
                    <Upload className="h-2.5 w-2.5 text-zinc-400" />
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
              <div className="mt-2.5 pt-2 border-t border-zinc-800/80 space-y-1.5 text-left">
                <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-wider block">Entregables:</span>
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
                      <div key={idx} className="flex flex-col gap-1 max-w-[120px] bg-zinc-900/30 border border-zinc-800 p-1.5 rounded-lg">
                        <div className="flex items-center gap-1 text-[8px] text-zinc-400">
                          <FileText className="h-2.5 w-2.5 text-zinc-550 shrink-0" />
                          <span className="truncate" title={filename}>{filename}</span>
                        </div>
                        {isImg && (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomUrl(fullUrl);
                              setZoomName(filename);
                            }}
                            className="h-14 w-24 border border-zinc-800 rounded-md overflow-hidden bg-zinc-950 cursor-zoom-in hover:border-emerald-500/50 transition-colors"
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

          {/* Footer of card */}
          <div className="mt-3 pt-3 border-t border-zinc-800/80 flex justify-between items-center shrink-0">
            {/* Left side: Date / Subtasks */}
            <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-500 font-bold">
              {subProgress && (
                <span className="flex items-center gap-1 bg-zinc-900/60 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">
                  <CheckSquare className="h-3 w-3 text-emerald-400 shrink-0" />
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

            {/* Right side: Assignees avatar stack */}
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
                  className="absolute -top-12 right-0 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded-full p-2 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
                <img 
                  src={zoomUrl} 
                  alt={zoomName} 
                  className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl border border-zinc-800"
                  onClick={(e) => e.stopPropagation()} 
                />
                <div className="mt-3 text-zinc-300 text-xs font-mono bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-xl truncate max-w-md">
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
