'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/core/auth/AuthContext';
import { 
  getTasks, 
  createTask, 
  updateTaskStatus, 
  deleteTask,
  TaskRow 
} from '@/core/services/tasks';
import { supabase } from '@/core/database/supabase';

export type ViewMode = 'kanban' | 'list' | 'calendar' | 'keep';

export function useTasks() {
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
  const [viewMode, setViewMode] = useState<ViewMode>('keep');
  const [keepLayout, setKeepLayout] = useState<'grid' | 'list'>('grid');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Filter values
  const [filterProject, setFilterProject] = useState('todos');
  const [filterArea, setFilterArea] = useState('todos');
  const [filterPriority, setFilterPriority] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');
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

  // Detect mobile device to default to Keep Grid
  useEffect(() => {
    const checkMobile = () => {
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setViewMode('keep');
        setKeepLayout('grid');
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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
      const data = await getTasks();
      setTasks(data);

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

  // Open task if taskId is provided in the URL query parameters
  useEffect(() => {
    if (tasks.length === 0) return;
    const searchParams = new URLSearchParams(window.location.search);
    const taskId = searchParams.get('taskId');
    if (taskId) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        setSelectedTask(task);
        setIsDrawerOpen(true);
        setDrawerEditMode(false);
        
        // Clean the taskId query parameter quietly from the URL
        const cleanedSearch = window.location.search.replace(/([\?&])taskId=[a-f0-9-]+&?/, '$1').replace(/[\?&]$/, '');
        const newUrl = window.location.pathname + cleanedSearch;
        window.history.replaceState(null, '', newUrl);
      }
    }
  }, [tasks]);

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
    
    let targetStatus: 'backlog' | 'pendiente' | 'en_progreso' | 'bloqueada' | 'completada' = nextStatus;
    if (nextStatus === 'completada' && task.requires_audit && task.audit_status !== 'aceptado') {
      targetStatus = 'bloqueada';
      alert('Esta tarea requiere auditoría de líder antes de completarse. Se moverá a la columna "Bloqueada" en espera de aprobación.');
    }
    
    // Optimistic Update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: targetStatus } : t));

    try {
      await updateTaskStatus(task.id, targetStatus);
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
        origin: createForm.origin || 'proyecto',
        task_type: createForm.task_type || 'check',
        assigned_to: assigned,
        project_id: createForm.project_id || null,
        area: createForm.area || 'general',
        priority: createForm.priority || 'media',
        due_date: createForm.due_date || null,
        requires_audit: createForm.requires_audit || false
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
    
    const task = tasks.find(t => t.id === draggableId);
    let targetStatus = nextStatus;
    if (nextStatus === 'completada' && task?.requires_audit && task?.audit_status !== 'aceptado') {
      targetStatus = 'bloqueada';
      alert('Esta tarea requiere auditoría de líder antes de completarse. Se ha movido a la columna "Bloqueada" en espera de aprobación.');
    }

    // Optimistic Update locally
    setTasks(prev => prev.map(t => t.id === draggableId ? { ...t, status: targetStatus } : t));

    try {
      await updateTaskStatus(draggableId, targetStatus);
      loadTasks(); // Silent refresh
    } catch (err: any) {
      loadTasks();
      alert('Error al actualizar estado: ' + err.message);
    }
  };

  // Filters logic
  const filteredTasks = tasks.filter(task => {
    // 1. Project filter
    if (filterProject !== 'todos' && task.project_id !== filterProject) return false;

    // 2. Area filter
    if (filterArea !== 'todos' && task.area !== filterArea) return false;

    // 3. Priority filter
    if (filterPriority !== 'todos' && (task as any).priority !== filterPriority) return false;

    // 4. Status filter
    if (filterStatus !== 'todos' && task.status !== filterStatus) return false;

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

  return {
    // Auth context
    user,
    // Data list
    tasks,
    loading,
    error,
    documentMap,
    employees,
    projects,
    // Navigation / View modes
    viewMode,
    setViewMode,
    keepLayout,
    setKeepLayout,
    sidebarCollapsed,
    setSidebarCollapsed,
    // Filters
    filterProject,
    setFilterProject,
    filterArea,
    setFilterArea,
    filterPriority,
    setFilterPriority,
    filterStatus,
    setFilterStatus,
    onlyMyTasks,
    setOnlyMyTasks,
    // Selection drawers
    selectedTask,
    setSelectedTask,
    isDrawerOpen,
    setIsDrawerOpen,
    drawerEditMode,
    setDrawerEditMode,
    // Create Task form
    isCreateOpen,
    setIsCreateOpen,
    createForm,
    setCreateForm,
    // Calendar view state
    currentDate,
    setCurrentDate,
    // Actions & methods
    loadTasks,
    handleOpenTask,
    handleEditTask,
    handleDeleteTask,
    handleDrawerClose,
    handleToggleCheck,
    handleCreateSubmit,
    onDragEnd,
    // Computed values
    filteredTasks,
    getColumnTasks,
    getCalendarDays,
    nextMonth,
    prevMonth,
    getTasksForDate
  };
}
