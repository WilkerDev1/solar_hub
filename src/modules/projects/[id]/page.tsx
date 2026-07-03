'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Folder, MapPin, Zap, Activity, CheckCircle, Clock, 
  Upload, FileText, Loader2, AlertCircle, MessageSquare, Send,
  Shield, Check, X, AlertTriangle, Plus, Settings, Eye, FileSpreadsheet,
  Calendar as CalendarIcon, User, Layers, Share2, ClipboardList, Info,
  Package, Search, Download, Trash2, ArrowRight, CheckSquare, Square,
  ChevronLeft, ChevronRight, Edit
} from 'lucide-react';
import { supabase } from '@/core/database/supabase';
import { Button } from '@/core/components/ui/button';
import { RequirePermission } from '@/core/auth/AuthContext';
import { getTasks, createTask, updateTaskStatus, auditTaskStatus, uploadTaskEvidence, deleteTask, TaskRow } from '@/core/services/tasks';
import { getProjectMessages, sendMessage, ProjectMessageRow } from '@/core/services/chat';
import { 
  getProjectMaterials, 
  addProjectMaterialRequirement, 
  dispatchMaterialToProject, 
  getInventoryItems, 
  ProjectMaterialWithItem, 
  InventoryItemRow,
  getProjectDispatchHistory,
  ProjectDispatchTransaction
} from '@/core/services/inventory';
import { updateProject } from '@/core/services/projects';
import { getFolders, getDocumentsByProject, uploadDocument, DocumentRow } from '@/core/services/documents';
import TaskDetailDrawer from '@/core/components/TaskDetailDrawer';
import { getApiUrl } from '@/core/utils/api';

// Drag & Drop Imports
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

type TabType = 'overview' | 'kanban' | 'list' | 'calendar' | 'files' | 'materials' | 'activity';

export default function ProjectDetailModule({ projectId }: { projectId: string }) {
  const router = useRouter();
  
  // View states
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Core Data States
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  // Tasks States
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [documentMap, setDocumentMap] = useState<Record<string, { name: string; mime_type: string }>>({});
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);
  const [taskDrawerEditMode, setTaskDrawerEditMode] = useState(false);

  // Chat States
  const [messages, setMessages] = useState<ProjectMessageRow[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // BOM Materials States
  const [materials, setMaterials] = useState<ProjectMaterialWithItem[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemRow[]>([]);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Dispatch Modal Form State
  const [dispatchForm, setDispatchForm] = useState({
    itemId: '',
    quantity: 1,
    requiredQuantity: 0,
    actionType: 'dispatch' as 'dispatch' | 'requirement',
    reason: ''
  });

  // Task Creation States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    origin: 'proyecto' as any,
    task_type: 'check' as any,
    assigned_to: '',
    project_id: projectId,
    area: 'general' as any,
    priority: 'media' as any,
    due_date: '',
    requires_audit: false
  });

  // Materials dispatch history state
  const [dispatchHistory, setDispatchHistory] = useState<ProjectDispatchTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Task filter states for project
  const [filterArea, setFilterArea] = useState('todos');
  const [filterPriority, setFilterPriority] = useState('todos');
  const [filterAssignee, setFilterAssignee] = useState('todos');

  // Settings Edit Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    description: '',
    phase: '',
    capacity: '',
    location: '',
    gps_coordinates: '',
    status: '',
    banner_url: '',
    member_ids: [] as string[]
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Files Tab States
  const [fileFilterDept, setFileFilterDept] = useState('todos');
  const [fileFilterExt, setFileFilterExt] = useState('todos');
  const [projectDocuments, setProjectDocuments] = useState<DocumentRow[]>([]);
  const [projectFolders, setProjectFolders] = useState<any[]>([]);
  const [selectedUploadDept, setSelectedUploadDept] = useState('general');
  const [uploadingFile, setUploadingFile] = useState(false);

  // Activity Log Member Filter
  const [activityMemberFilter, setActivityMemberFilter] = useState('todos');

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    setIsMounted(true);
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

  // Fetch Project & User Session Info
  const loadProjectData = async () => {
    setLoading(true);
    try {
      // User Profile and Permissions
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setCurrentUser({ ...user, ...profile });
        
        // Admin Check
        const { data: adminCheck } = await supabase.rpc('user_has_permission', { required_action: 'admin:*' });
        setIsAdmin(!!adminCheck);
      }

      // Load Profiles and Clients for selector options
      const [profilesRes, clientsRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email'),
        supabase.from('clients').select('id, name')
      ]);

      if (profilesRes.data) {
        setEmployees(profilesRes.data.map(p => ({
          id: p.id,
          full_name: p.full_name || p.email || 'Desconocido'
        })));
      }
      if (clientsRes.data) {
        setClients(clientsRes.data);
      }

      // Fetch Project
      const { data: projData, error: fetchErr } = await supabase
        .from('projects')
        .select('*, clients(id, name)')
        .eq('id', projectId)
        .single();

      if (fetchErr) throw fetchErr;
      setProject(projData);

      // Prepopulate Settings Form
      setSettingsForm({
        name: projData.name || '',
        description: projData.description || '',
        phase: projData.phase || '',
        capacity: projData.capacity || '',
        location: projData.location || '',
        gps_coordinates: projData.gps_coordinates || '',
        status: projData.status || '',
        banner_url: projData.banner_url || '',
        member_ids: projData.member_ids || []
      });

    } catch (err: any) {
      console.error('Error loading project details:', err);
      setError(err.message || 'Proyecto no encontrado.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) loadProjectData();
  }, [projectId]);

  // Load project tasks
  const loadProjectTasks = async () => {
    if (!projectId) return;
    setLoadingTasks(true);
    try {
      const projTasks = await getTasks({ projectId });
      setTasks(projTasks);

      // Fetch metadata of documents for these tasks
      const taskIds = projTasks.map(t => t.id);
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

      // Fetch project folders and direct documents
      try {
        const folders = await getFolders({ projectId });
        setProjectFolders(folders);

        const docs = await getDocumentsByProject(projectId);
        setProjectDocuments(docs);
      } catch (err) {
        console.error('Error fetching project folders/documents:', err);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    loadProjectTasks();
  }, [projectId]);

  // Load project materials (BOM)
  const loadProjectMaterials = async () => {
    if (!projectId) return;
    setLoadingMaterials(true);
    try {
      const mats = await getProjectMaterials(projectId);
      setMaterials(mats);
      
      const invItems = await getInventoryItems();
      setInventoryItems(invItems);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMaterials(false);
    }
  };

  // Load project dispatch history
  const loadProjectDispatchHistory = async () => {
    if (!projectId) return;
    setLoadingHistory(true);
    try {
      const history = await getProjectDispatchHistory(projectId);
      setDispatchHistory(history);
    } catch (e) {
      console.error('Error loading dispatch history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Direct File Upload Action
  const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingFile(true);
    try {
      await uploadDocument(file, null, projectId, selectedUploadDept);
      await loadProjectTasks();
      alert('Archivo subido con éxito.');
    } catch (err: any) {
      alert('Error al subir archivo: ' + err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  // Create Task Submission
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) return;

    try {
      const assigned = createForm.assigned_to || currentUser?.id || '';
      await createTask({
        title: createForm.title.trim(),
        description: createForm.description.trim() || null,
        origin: createForm.origin,
        task_type: createForm.task_type,
        assigned_to: assigned,
        project_id: projectId,
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
        project_id: projectId,
        area: 'general',
        priority: 'media',
        due_date: '',
        requires_audit: false
      });
      loadProjectTasks();
    } catch (err: any) {
      alert('Error creando tarea: ' + err.message);
    }
  };

  useEffect(() => {
    if (activeTab === 'materials') {
      loadProjectMaterials();
      loadProjectDispatchHistory();
    }
  }, [projectId, activeTab]);

  // Load & subscribe Chat messages
  useEffect(() => {
    if (!projectId) return;

    const fetchMsgs = async () => {
      try {
        const msgs = await getProjectMessages(projectId);
        setMessages(msgs);
        scrollToBottom();
      } catch (e) {
        console.error(e);
      }
    };
    fetchMsgs();

    const channel = supabase
      .channel(`project_chat_${projectId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'project_messages', filter: `project_id=eq.${projectId}` },
        (payload) => {
          supabase.from('profiles').select('id, full_name, avatar_url, email').eq('id', payload.new.profile_id).single()
            .then(({ data: profile }) => {
              const newMsg = { ...payload.new, profiles: profile } as any;
              setMessages((prev) => [...prev, newMsg]);
              scrollToBottom();
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sendingMsg) return;
    
    setSendingMsg(true);
    try {
      await sendMessage(projectId, newMessage);
      setNewMessage('');
    } catch (err) {
      console.error(err);
      alert('Error enviando mensaje');
    } finally {
      setSendingMsg(false);
    }
  };

  // Toggle checklist tasks status reactively
  const handleToggleCheck = async (e: React.MouseEvent, task: TaskRow) => {
    e.stopPropagation();
    const nextStatus = task.status === 'completada' ? 'pendiente' : 'completada';
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
    try {
      await updateTaskStatus(task.id, nextStatus);
      loadProjectTasks();
    } catch (err: any) {
      loadProjectTasks();
      alert('Error: ' + err.message);
    }
  };

  const handleOpenTask = (task: TaskRow) => {
    setSelectedTask(task);
    setTaskDrawerEditMode(false);
    setIsTaskDrawerOpen(true);
  };

  const handleEditTask = (task: TaskRow) => {
    setSelectedTask(task);
    setTaskDrawerEditMode(true);
    setIsTaskDrawerOpen(true);
  };

  const handleDeleteTask = async (task: TaskRow) => {
    if (!confirm(`¿Está seguro que desea eliminar la tarea "${task.title}"?`)) return;
    try {
      await deleteTask(task.id);
      alert('Tarea eliminada con éxito.');
      loadProjectTasks();
    } catch (err: any) {
      alert('Error al eliminar tarea: ' + err.message);
    }
  };

  // Drag End for Kanban DND
  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const nextStatus = destination.droppableId as 'backlog' | 'pendiente' | 'en_progreso' | 'bloqueada' | 'completada';
    setTasks(prev => prev.map(t => t.id === draggableId ? { ...t, status: nextStatus } : t));

    try {
      await updateTaskStatus(draggableId, nextStatus);
      loadProjectTasks();
    } catch (err: any) {
      loadProjectTasks();
      alert('Error al mover tarea: ' + err.message);
    }
  };

  // Computed client-side filtered tasks
  const filteredTasks = tasks.filter(task => {
    if (filterArea !== 'todos' && task.area !== filterArea) return false;
    if (filterPriority !== 'todos' && (task as any).priority !== filterPriority) return false;
    if (filterAssignee !== 'todos') {
      const assignedIds = (task as any).assigned_to_ids || (task.assigned_to ? [task.assigned_to] : []);
      if (!assignedIds.includes(filterAssignee)) return false;
    }
    return true;
  });

  const getColumnTasks = (status: 'backlog' | 'pendiente' | 'en_progreso' | 'bloqueada' | 'completada') => {
    return filteredTasks.filter(t => t.status === status);
  };

  // Save Settings Modal
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await updateProject(projectId, {
        name: settingsForm.name,
        description: settingsForm.description || null,
        phase: settingsForm.phase,
        capacity: settingsForm.capacity || null,
        location: settingsForm.location || null,
        gps_coordinates: settingsForm.gps_coordinates || null,
        status: settingsForm.status,
        banner_url: settingsForm.banner_url || null,
        member_ids: settingsForm.member_ids
      });

      setIsSettingsOpen(false);
      loadProjectData();
    } catch (err: any) {
      alert('Error al guardar configuración: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // Material BOM dispatch submit
  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchForm.itemId) return;

    setActionLoading(true);
    try {
      if (dispatchForm.actionType === 'requirement') {
        await addProjectMaterialRequirement(projectId, dispatchForm.itemId, Number(dispatchForm.requiredQuantity));
      } else {
        await dispatchMaterialToProject({
          projectId,
          itemId: dispatchForm.itemId,
          quantity: Number(dispatchForm.quantity),
          reason: dispatchForm.reason || 'Despacho de insumos en obra'
        });
      }

      setIsDispatchModalOpen(false);
      setDispatchForm({
        itemId: '',
        quantity: 1,
        requiredQuantity: 0,
        actionType: 'dispatch',
        reason: ''
      });
      loadProjectMaterials();
      loadProjectDispatchHistory();
    } catch (err: any) {
      alert('Fallo en operación: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Export BOM to CSV
  const handleExportCSV = () => {
    if (materials.length === 0) return;
    
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'SKU,Material,Requerido,En Obra (Sitio),Unidad,Costo Unitario,Estado\n';
    
    materials.forEach(m => {
      const item = m.inventory_items;
      if (!item) return;
      
      const status = m.quantity >= m.required_quantity ? 'COMPLETO' : m.quantity > 0 ? 'PARCIAL' : 'FALTANTE';
      csvContent += `"${item.sku}","${item.name}",${m.required_quantity},${m.quantity},"${item.unit}",${item.cost},"${status}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BOM_${project.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Extract Files / Evidence across all tasks
  const getEvidenceFiles = () => {
    const files: any[] = [];
    tasks.forEach(t => {
      if (t.evidence_urls && t.evidence_urls.length > 0) {
        t.evidence_urls.forEach((url, i) => {
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
          
          files.push({
            id: fileId || `${t.id}_file_${i}`,
            taskId: t.id,
            taskTitle: t.title,
            department: t.area || 'general',
            url,
            name: filename,
            ext: extension,
            isImage
          });
        });
      }
    });

    let filtered = files;

    // Apply department filter
    if (fileFilterDept !== 'todos') {
      filtered = filtered.filter(f => f.department === fileFilterDept);
    }

    // Apply extension/type filter
    if (fileFilterExt === 'images') {
      filtered = filtered.filter(f => f.isImage);
    } else if (fileFilterExt === 'pdf') {
      filtered = filtered.filter(f => f.ext === 'pdf');
    } else if (fileFilterExt === 'others') {
      filtered = filtered.filter(f => !f.isImage && f.ext !== 'pdf');
    }

    return filtered;
  };

  // Extract direct project documents
  const getDirectProjectFiles = () => {
    const files: any[] = [];
    projectDocuments.forEach(doc => {
      // Find folder to map to department
      const folder = projectFolders.find(f => f.id === doc.folder_id);
      const department = folder?.department_id || 'general';

      const extension = doc.name.split('.').pop()?.toLowerCase() || '';
      const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(extension) || (doc.mime_type && doc.mime_type.startsWith('image/'));

      files.push({
        id: doc.id,
        name: doc.name,
        ext: extension,
        url: `/api/storage/file/${doc.id}?name=${encodeURIComponent(doc.name)}`,
        department: department,
        isImage
      });
    });

    let filtered = files;

    // Apply department filter
    if (fileFilterDept !== 'todos') {
      filtered = filtered.filter(f => f.department === fileFilterDept);
    }

    // Apply type filter
    if (fileFilterExt === 'images') {
      filtered = filtered.filter(f => f.isImage);
    } else if (fileFilterExt === 'pdf') {
      filtered = filtered.filter(f => f.ext === 'pdf');
    } else if (fileFilterExt === 'others') {
      filtered = filtered.filter(f => !f.isImage && f.ext !== 'pdf');
    }

    return filtered;
  };

  // Compile project activities from task logs
  const getProjectActivities = () => {
    let list: any[] = [];
    tasks.forEach(t => {
      if (t.task_activities && Array.isArray(t.task_activities)) {
        t.task_activities.forEach((act: any) => {
          list.push({
            ...act,
            taskId: t.id,
            taskTitle: t.title
          });
        });
      }
    });

    // Sort by date descending
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (activityMemberFilter !== 'todos') {
      return list.filter(a => a.profile_id === activityMemberFilter);
    }
    return list;
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
    return tasks.filter(task => {
      if (!(task as any).due_date) return false;
      const tDate = new Date((task as any).due_date);
      return tDate.getDate() === date.getDate() &&
             tDate.getMonth() === date.getMonth() &&
             tDate.getFullYear() === date.getFullYear();
    });
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
        <span className="text-zinc-500 text-sm font-medium">Cargando centro de mando del proyecto...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/30 text-rose-305 p-6 rounded-xl flex items-center space-x-3 text-sm max-w-lg mx-auto mt-12">
        <AlertCircle className="h-6 w-6 text-rose-450" />
        <span>{error || 'Proyecto no encontrado.'}</span>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden -m-4 md:-m-8">
      {/* LEFT/CENTER MAIN EXPANDING SECTION */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 scrollbar-thin scrollbar-thumb-zinc-900">
        
        {/* Header Breadcrumbs & Quick Banner Image */}
        <div className="flex items-center gap-3 border-b border-zinc-900 pb-5">
          <button
            onClick={() => router.push('/?tab=projects')}
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white tracking-wide truncate">{project.name}</h1>
            <p className="text-zinc-400 text-xs mt-1 truncate">
              Cliente: <strong className="text-white">{project.clients?.name || 'N/D'}</strong>
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`h-10 w-10 flex items-center justify-center rounded-xl border transition-all ${
                isChatOpen 
                  ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-zinc-900 border-zinc-800 text-zinc-550 hover:text-white'
              }`}
              title="Toggle Chat Sidebar"
            >
              <MessageSquare className="h-4 w-4" />
            </button>

            {isAdmin && (
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
                title="Configuración de Obra"
              >
                <Settings className="h-4.5 w-4.5" />
              </button>
            )}
          </div>
        </div>

        {/* Header Metadata Quick Widgets */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Fase Actual</span>
              <p className="text-sm font-bold text-emerald-400 mt-0.5">
                {project.phase === 'Diseno' ? 'Diseño' :
                 project.phase === 'Construccion' ? 'Construcción' :
                 project.phase === 'Operacion' ? 'Operación' : project.phase}
              </p>
            </div>
            <Layers className="h-4 w-4 text-emerald-400/60" />
          </div>

          <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Ubicación GPS</span>
              <p className="text-xs font-mono font-bold text-white mt-0.5 select-all">{project.gps_coordinates || 'N/D'}</p>
            </div>
            <MapPin className="h-4 w-4 text-zinc-555" />
          </div>

          <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Capacidad MWp</span>
              <p className="text-sm font-bold text-white mt-0.5">{project.capacity || 'N/D'}</p>
            </div>
            <Zap className="h-4 w-4 text-amber-500/60" />
          </div>

          <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Estado General</span>
              <p className={`text-xs font-bold uppercase mt-0.5 ${
                project.status === 'completado' ? 'text-emerald-400' :
                project.status === 'en_progreso' ? 'text-amber-400' : 'text-rose-400'
              }`}>{project.status.replace('_', ' ')}</p>
            </div>
            <CheckCircle className="h-4 w-4 text-zinc-555" />
          </div>
        </div>

        {/* Tab Selection Row */}
        <div className="flex border-b border-zinc-850 pb-px overflow-x-auto gap-1">
          {(['overview', 'kanban', 'list', 'calendar', 'files', 'materials', 'activity'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-xs font-bold uppercase transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab 
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab === 'overview' ? 'Overview' :
               tab === 'kanban' ? 'Tablero Kanban' :
               tab === 'list' ? 'Lista' :
               tab === 'calendar' ? 'Calendario' :
               tab === 'files' ? 'Archivos' :
               tab === 'materials' ? 'Materiales BOM' : 'Bitácora'}
            </button>
          ))}
        </div>

        {/* TABS CONTENT */}
        <div className="pt-2">
          
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left Column: Description & Banner */}
              <div className="md:col-span-2 space-y-6">
                {project.banner_url && (
                  <div className="h-48 rounded-2xl overflow-hidden border border-zinc-900 relative">
                    <img src={project.banner_url} alt="Project banner" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
                  </div>
                )}
                
                <div className="bg-zinc-900/10 border border-zinc-900 p-6 rounded-2xl space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 font-mono">Ficha Descriptiva</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-line">
                    {project.description || 'Sin descripción detallada registrada para esta obra.'}
                  </p>
                </div>
              </div>

              {/* Right Column: Attributes & Team members list */}
              <div className="space-y-6">
                <div className="bg-zinc-900/30 border border-zinc-900 p-5 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 font-mono flex items-center gap-1.5 pb-2.5 border-b border-zinc-900">
                    <MapPin className="h-4 w-4 text-emerald-400" /> Atributos Técnicos
                  </h3>
                  <div className="space-y-3 text-xs leading-normal">
                    <div className="flex justify-between py-1.5 border-b border-zinc-900">
                      <span className="text-zinc-500 font-medium">Ubicación Física</span>
                      <span className="font-bold text-zinc-350 text-right">{project.location || 'N/D'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-zinc-900 font-mono">
                      <span className="text-zinc-500 font-medium">Coordenadas GPS</span>
                      <span className="font-bold text-amber-400">{project.gps_coordinates || 'N/D'}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-zinc-500 font-medium">Capacidad Nominal</span>
                      <span className="font-bold text-zinc-350">{project.capacity || 'N/D'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900/30 border border-zinc-900 p-5 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 font-mono flex items-center gap-1.5 pb-2.5 border-b border-zinc-900">
                    <User className="h-4 w-4 text-emerald-400" /> Equipo de Obra
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {project.member_ids && project.member_ids.length > 0 ? (
                      project.member_ids.map((id: string) => {
                        const emp = employees.find(e => e.id === id);
                        if (!emp) return null;
                        return (
                          <div key={id} className="flex items-center gap-2.5 bg-zinc-900/40 p-2 rounded-xl border border-zinc-900">
                            <div className="h-6 w-6 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-350">
                              {emp.full_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs text-zinc-300 font-bold">{emp.full_name}</span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs italic text-zinc-500">Sin integrantes asignados a la obra.</p>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB: KANBAN BOARD */}
          {activeTab === 'kanban' && isMounted && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-zinc-900/10 border border-zinc-900 p-4 rounded-xl">
                <div>
                  <h4 className="text-sm font-bold text-white">Tablero de Tareas de la Obra</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">Gestión visual del avance físico del proyecto.</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-3 rounded-lg flex items-center gap-1 cursor-pointer">
                  <Plus className="h-4 w-4" /> Nueva Tarea
                </Button>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-900 p-4 rounded-xl flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Filtrar Tareas:</span>
                <select
                  value={filterArea}
                  onChange={e => setFilterArea(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
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
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none font-semibold"
                >
                  <option value="todos">Prioridad: Todas</option>
                  <option value="baja">Prioridad: Baja</option>
                  <option value="media">Prioridad: Media</option>
                  <option value="alta">Prioridad: Alta</option>
                </select>

                <select
                  value={filterAssignee}
                  onChange={e => setFilterAssignee(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
                >
                  <option value="todos">Asignado a: Todos</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>

                {(filterArea !== 'todos' || filterPriority !== 'todos' || filterAssignee !== 'todos') && (
                  <button
                    onClick={() => {
                      setFilterArea('todos');
                      setFilterPriority('todos');
                      setFilterAssignee('todos');
                    }}
                    className="text-[10px] text-rose-455 hover:text-rose-400 font-bold uppercase tracking-wider font-mono transition-colors ml-auto cursor-pointer"
                  >
                    Limpiar Filtros
                  </button>
                )}
              </div>

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
                            <KanbanCard key={task.id} task={task} index={index} onClick={() => handleOpenTask(task)} handleToggleCheck={handleToggleCheck} employees={employees} onUploadSuccess={loadProjectTasks} documentMap={documentMap} onEditClick={handleEditTask} onDeleteClick={handleDeleteTask} />
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
                            <KanbanCard key={task.id} task={task} index={index} onClick={() => handleOpenTask(task)} handleToggleCheck={handleToggleCheck} employees={employees} onUploadSuccess={loadProjectTasks} documentMap={documentMap} onEditClick={handleEditTask} onDeleteClick={handleDeleteTask} />
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
                            <KanbanCard key={task.id} task={task} index={index} onClick={() => handleOpenTask(task)} handleToggleCheck={handleToggleCheck} employees={employees} onUploadSuccess={loadProjectTasks} documentMap={documentMap} onEditClick={handleEditTask} onDeleteClick={handleDeleteTask} />
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
                            <KanbanCard key={task.id} task={task} index={index} onClick={() => handleOpenTask(task)} handleToggleCheck={handleToggleCheck} employees={employees} onUploadSuccess={loadProjectTasks} documentMap={documentMap} onEditClick={handleEditTask} onDeleteClick={handleDeleteTask} />
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
                            <KanbanCard key={task.id} task={task} index={index} onClick={() => handleOpenTask(task)} handleToggleCheck={handleToggleCheck} employees={employees} onUploadSuccess={loadProjectTasks} documentMap={documentMap} onEditClick={handleEditTask} onDeleteClick={handleDeleteTask} />
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>

                </div>
              </DragDropContext>
            </div>
          )}

          {/* TAB: LIST */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-zinc-900/10 border border-zinc-900 p-4 rounded-xl">
                <div>
                  <h4 className="text-sm font-bold text-white">Listado de Tareas de la Obra</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">Vista tabular y filtros detallados por departamento y prioridad.</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-3 rounded-lg flex items-center gap-1 cursor-pointer">
                  <Plus className="h-4 w-4" /> Nueva Tarea
                </Button>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-900 p-4 rounded-xl flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Filtrar Tareas:</span>
                <select
                  value={filterArea}
                  onChange={e => setFilterArea(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
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
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none font-semibold"
                >
                  <option value="todos">Prioridad: Todas</option>
                  <option value="baja">Prioridad: Baja</option>
                  <option value="media">Prioridad: Media</option>
                  <option value="alta">Prioridad: Alta</option>
                </select>

                <select
                  value={filterAssignee}
                  onChange={e => setFilterAssignee(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
                >
                  <option value="todos">Asignado a: Todos</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>

                {(filterArea !== 'todos' || filterPriority !== 'todos' || filterAssignee !== 'todos') && (
                  <button
                    onClick={() => {
                      setFilterArea('todos');
                      setFilterPriority('todos');
                      setFilterAssignee('todos');
                    }}
                    className="text-[10px] text-rose-455 hover:text-rose-400 font-bold uppercase tracking-wider font-mono transition-colors ml-auto cursor-pointer"
                  >
                    Limpiar Filtros
                  </button>
                )}
              </div>

              <div className="bg-zinc-900/10 border border-zinc-900 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-900/50 border-b border-zinc-850 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    <th className="px-6 py-4 w-12"></th>
                    <th className="px-6 py-4">Tarea</th>
                    <th className="px-6 py-4">Departamento</th>
                    <th className="px-6 py-4">Vencimiento</th>
                    <th className="px-6 py-4">Prioridad</th>
                    <th className="px-6 py-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {filteredTasks.map(task => {
                    const isCompleted = task.status === 'completada';
                    const isDeliverable = ['entregable', 'reporte', 'evidencia'].includes(task.task_type);
                    return (
                      <tr
                        key={task.id}
                        onClick={() => { setSelectedTask(task); setIsTaskDrawerOpen(true); }}
                        className="hover:bg-zinc-900/30 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                          {!isDeliverable ? (
                            <button onClick={e => handleToggleCheck(e, task)} className="text-zinc-555 hover:text-emerald-400 transition-colors">
                              {isCompleted ? <CheckSquare className="h-4.5 w-4.5 text-emerald-450" /> : <Square className="h-4.5 w-4.5" />}
                            </button>
                          ) : (
                            <FileText className="h-4.5 w-4.5 text-emerald-505" />
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className={`font-bold text-white text-sm ${isCompleted ? 'line-through text-zinc-500' : ''}`}>{task.title}</div>
                          {task.description && <div className="text-[10px] text-zinc-505 mt-0.5 truncate max-w-xs">{task.description}</div>}
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-zinc-900 border border-zinc-800 text-[10px] px-2 py-0.5 rounded font-bold uppercase text-zinc-400">{task.area}</span>
                        </td>
                        <td className="px-6 py-4 font-mono font-semibold text-zinc-350">
                          {(task as any).due_date ? new Date((task as any).due_date).toLocaleDateString([], { day: '2-digit', month: 'short' }) : 'N/D'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            (task as any).priority === 'alta' ? 'bg-rose-500/10 text-rose-455 border border-rose-500/20' :
                            (task as any).priority === 'media' ? 'bg-amber-500/10 text-amber-455 border border-amber-500/20' :
                            'bg-zinc-800 text-zinc-400'
                          }`}>{ (task as any).priority || 'baja'}</span>
                        </td>
                        <td className="px-6 py-4 uppercase font-semibold text-zinc-350">{task.status.replace('_', ' ')}</td>
                      </tr>
                    );
                  })}
                  {filteredTasks.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 italic text-zinc-550">No hay tareas en esta vista.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            </div>
          )}

          {/* TAB: CALENDAR */}
          {activeTab === 'calendar' && (
            <div className="bg-zinc-900/10 border border-zinc-900 p-5 rounded-2xl shadow-xl">
              <div className="flex justify-between items-center mb-6">
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

              <div className="grid grid-cols-7 gap-2 mb-2 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-550 font-mono">
                <div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div><div>Dom</div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {getCalendarDays().map((day, idx) => {
                  if (!day) return <div key={idx} className="bg-zinc-900/5 min-h-20 rounded-xl" />;
                  
                  const dateTasks = getTasksForDate(day);
                  const isToday = new Date().toDateString() === day.toDateString();

                  return (
                    <div
                      key={idx}
                      className={`min-h-20 bg-zinc-900/20 border p-2 rounded-xl text-left flex flex-col justify-between hover:border-zinc-700 transition-colors ${
                        isToday ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-zinc-900'
                      }`}
                    >
                      <span className={`text-[10px] font-bold font-mono ${isToday ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {day.getDate()}
                      </span>
                      <div className="flex-1 mt-1 space-y-1 overflow-y-auto max-h-12 scrollbar-none">
                        {dateTasks.map(t => (
                          <div
                            key={t.id}
                            onClick={() => { setSelectedTask(t); setIsTaskDrawerOpen(true); }}
                            className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 p-1 rounded text-[8px] font-bold text-zinc-300 truncate cursor-pointer flex items-center gap-1"
                          >
                            <span className={`h-1 rounded-full w-1 shrink-0 ${
                              t.status === 'completada' ? 'bg-emerald-400' :
                              t.status === 'en_progreso' ? 'bg-amber-400' : 'bg-rose-455'
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

          {/* TAB: FILES / EVIDENCE */}
          {activeTab === 'files' && (
            <div className="space-y-6 text-left">
              {/* Filter controls & Upload Form */}
              <div className="bg-[#1c1c21] border border-zinc-800 p-5 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-bold text-zinc-400">Filtrar Archivos:</span>
                  <select
                    value={fileFilterDept}
                    onChange={e => setFileFilterDept(e.target.value)}
                    className="bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none"
                  >
                    <option value="todos">Departamento: Todos</option>
                    <option value="general">General</option>
                    <option value="legal">Legal</option>
                    <option value="almacen">Almacén</option>
                    <option value="operaciones">Operaciones</option>
                    <option value="administracion">Administración</option>
                  </select>

                  <select
                    value={fileFilterExt}
                    onChange={e => setFileFilterExt(e.target.value)}
                    className="bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none"
                  >
                    <option value="todos">Tipo: Todos</option>
                    <option value="images">Imágenes (PNG/JPG/WEBP)</option>
                    <option value="pdf">Documentos PDF</option>
                    <option value="others">Otros</option>
                  </select>
                </div>

                {/* Upload Form directly linked to project/dept */}
                <RequirePermission action="inventory:write">
                  <div className="flex items-center gap-2 bg-zinc-955 border border-zinc-850 p-1.5 rounded-lg">
                    <select
                      value={selectedUploadDept}
                      onChange={e => setSelectedUploadDept(e.target.value)}
                      className="bg-transparent text-xs text-zinc-300 focus:outline-none px-2 font-semibold"
                    >
                      <option value="general">Depto: General</option>
                      <option value="legal">Depto: Legal</option>
                      <option value="almacen">Depto: Almacén</option>
                      <option value="operaciones">Depto: Operaciones</option>
                      <option value="administracion">Depto: Administración</option>
                    </select>
                    
                    <label className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold h-7 px-3 rounded flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0">
                      <input
                        type="file"
                        onChange={handleDirectFileUpload}
                        className="hidden"
                        disabled={uploadingFile}
                      />
                      {uploadingFile ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Subiendo...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-3 w-3" />
                          <span>Subir Archivo</span>
                        </>
                      )}
                    </label>
                  </div>
                </RequirePermission>
              </div>

              {/* ─── CATEGORY 1: ARCHIVOS GENERALES O DE DEPARTAMENTO ─── */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-zinc-850 pb-2">
                  <Folder className="h-4.5 w-4.5 text-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
                    Archivos Generales o por Departamento ({getDirectProjectFiles().length})
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {getDirectProjectFiles().map((file) => {
                    const signedUrl = file.url.startsWith('/api/storage/file/') 
                      ? getApiUrl(`${file.url}${file.url.includes('?') ? '&' : '?'}token=${token || ''}`) 
                      : file.url;

                    return (
                      <div key={file.id} className="bg-[#1c1c21] border border-zinc-850 p-4 rounded-lg flex flex-col justify-between gap-3 hover:border-zinc-800 transition-colors text-left">
                        <div className="flex items-start gap-2.5">
                          <div className="h-10 w-10 bg-zinc-950 border border-zinc-850 rounded-lg flex items-center justify-center shrink-0">
                            {file.isImage ? (
                              <img src={signedUrl} alt="thumbnail" className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <FileText className="h-5 w-5 text-emerald-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-white truncate block" title={file.name}>{file.name}</span>
                            <span className="text-[10px] text-zinc-500 block mt-0.5 font-mono">
                              Subido directamente
                            </span>
                          </div>
                        </div>

                        {file.isImage && (
                          <div className="border border-zinc-950 rounded-lg overflow-hidden bg-zinc-950 max-h-32 flex items-center justify-center">
                            <img src={signedUrl} alt={file.name} className="w-full h-auto max-h-32 object-contain" />
                          </div>
                        )}

                        <div className="flex items-center justify-between border-t border-zinc-900 pt-3 mt-1">
                          <span className="bg-zinc-950 border border-zinc-850 text-[8px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded text-emerald-450">
                            {file.department.toUpperCase()}
                          </span>
                          <a
                            href={signedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-zinc-955 border border-zinc-850 text-[10px] font-bold text-zinc-350 hover:text-white px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors"
                          >
                            <Download className="h-3 w-3" /> Descargar
                          </a>
                        </div>
                      </div>
                    );
                  })}
                  {getDirectProjectFiles().length === 0 && (
                    <div className="col-span-full text-center py-6 italic text-zinc-650 text-xs">
                      No hay archivos generales o departamentales cargados para este proyecto.
                    </div>
                  )}
                </div>
              </div>

              {/* ─── CATEGORY 2: ARCHIVOS DE TAREAS ─── */}
              <div className="space-y-3 pt-4">
                <div className="flex items-center gap-2 border-b border-zinc-850 pb-2">
                  <ClipboardList className="h-4.5 w-4.5 text-zinc-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
                    Archivos de Evidencia de Tareas ({getEvidenceFiles().length})
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {getEvidenceFiles().map((file) => {
                    const signedUrl = file.url.startsWith('/api/storage/file/') 
                      ? getApiUrl(`${file.url}${file.url.includes('?') ? '&' : '?'}token=${token || ''}`) 
                      : file.url;

                    return (
                      <div key={file.id} className="bg-[#1c1c21] border border-zinc-850 p-4 rounded-lg flex flex-col justify-between gap-3 hover:border-zinc-800 transition-colors text-left">
                        <div className="flex items-start gap-2.5">
                          <div className="h-10 w-10 bg-zinc-950 border border-zinc-850 rounded-lg flex items-center justify-center shrink-0">
                            {file.isImage ? (
                              <img src={signedUrl} alt="Evidence thumbnail" className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <FileText className="h-5 w-5 text-emerald-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-white truncate block" title={file.name}>{file.name}</span>
                            <span className="text-[10px] text-zinc-500 block mt-0.5 truncate" title={`Tarea: ${file.taskTitle}`}>
                              Tarea: {file.taskTitle}
                            </span>
                          </div>
                        </div>

                        {file.isImage && (
                          <div className="border border-zinc-950 rounded-lg overflow-hidden bg-zinc-955 max-h-32 flex items-center justify-center">
                            <img src={signedUrl} alt={file.name} className="w-full h-auto max-h-32 object-contain" />
                          </div>
                        )}

                        <div className="flex items-center justify-between border-t border-zinc-900 pt-3 mt-1">
                          <span className="bg-zinc-950 border border-zinc-850 text-[8px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded text-zinc-500 font-semibold">
                            {file.department.toUpperCase()}
                          </span>
                          <a
                            href={signedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-zinc-955 border border-zinc-850 text-[10px] font-bold text-zinc-350 hover:text-white px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors"
                          >
                            <Download className="h-3 w-3" /> Descargar
                          </a>
                        </div>
                      </div>
                    );
                  })}
                  {getEvidenceFiles().length === 0 && (
                    <div className="col-span-full text-center py-6 italic text-zinc-650 text-xs">
                      No se encontraron archivos de tareas cargados para los filtros seleccionados.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: MATERIALS (BOM) */}
          {activeTab === 'materials' && (
            <div className="space-y-6">
              
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900/30 border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Total Insumos BOM</span>
                    <p className="text-lg font-bold text-white mt-0.5">{materials.length}</p>
                  </div>
                  <Package className="h-5 w-5 text-zinc-500" />
                </div>

                <div className="bg-zinc-900/30 border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Abastecimiento Completo</span>
                    <p className="text-lg font-bold text-emerald-400 mt-0.5">
                      {materials.filter(m => m.quantity >= m.required_quantity).length}
                    </p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                </div>

                <div className="bg-zinc-900/30 border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Cant. Despachada</span>
                    <p className="text-lg font-bold text-blue-400 mt-0.5">
                      {materials.reduce((acc, m) => acc + m.quantity, 0)}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-blue-400" />
                </div>

                <div className="bg-zinc-900/30 border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Presupuesto Ejecutado</span>
                    <p className="text-lg font-bold text-amber-500 mt-0.5">
                      ${materials.reduce((acc, m) => acc + (m.quantity * (m.inventory_items?.cost || 0)), 0).toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </p>
                  </div>
                  <FileText className="h-5 w-5 text-amber-500" />
                </div>
              </div>

              {/* Action Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/10 border border-zinc-900 p-4 rounded-xl">
                <div>
                  <h4 className="text-sm font-bold text-white">Lista de Materiales de Obra (BOM)</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Control comparativo de insumos Requeridos vs En Sitio en almacén físico.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleExportCSV} className="bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold text-xs h-9 px-3 rounded-lg flex items-center gap-1 cursor-pointer">
                    <FileSpreadsheet className="h-4 w-4" /> Exportar CSV
                  </Button>
                  <RequirePermission action="inventory:use_material">
                    <Button 
                      onClick={() => {
                        setDispatchForm({ itemId: '', quantity: 1, requiredQuantity: 1, actionType: 'requirement', reason: '' });
                        setIsDispatchModalOpen(true);
                      }} 
                      className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold text-xs h-9 px-3 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" /> Añadir Material BOM
                    </Button>
                    <Button 
                      onClick={() => {
                        setDispatchForm({ itemId: '', quantity: 1, requiredQuantity: 1, actionType: 'dispatch', reason: '' });
                        setIsDispatchModalOpen(true);
                      }} 
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-3 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowRight className="h-4 w-4" /> Despachar Lote
                    </Button>
                  </RequirePermission>
                </div>
              </div>

              {loadingMaterials ? (
                <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-zinc-500 h-6 w-6" /></div>
              ) : materials.length === 0 ? (
                <div className="border border-zinc-900 rounded-xl p-10 text-center italic text-zinc-500">
                  No se han registrado requerimientos de materiales en la BOM de este proyecto.
                </div>
              ) : (
                <div className="bg-zinc-900/10 border border-zinc-900 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-900/50 border-b border-zinc-850 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        <th className="px-6 py-4 w-16">Miniatura</th>
                        <th className="px-6 py-4">Insumo / SKU</th>
                        <th className="px-6 py-4 text-center">Progreso Abastecimiento</th>
                        <th className="px-6 py-4 text-center">Requerido</th>
                        <th className="px-6 py-4 text-center">En Sitio (Obra)</th>
                        <th className="px-6 py-4">Medida</th>
                        <th className="px-6 py-4">Costo Total</th>
                        <th className="px-6 py-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850">
                      {materials.map(m => {
                        const item = m.inventory_items;
                        if (!item) return null;

                        const isComplete = m.quantity >= m.required_quantity;
                        const isPartial = m.quantity < m.required_quantity && m.quantity > 0;
                        const isMissing = m.quantity === 0;
                        const pct = m.required_quantity > 0 ? Math.min(100, Math.round((m.quantity / m.required_quantity) * 100)) : 100;

                        return (
                          <tr key={m.id} className="hover:bg-zinc-900/20">
                            <td className="px-6 py-3">
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="h-10 w-10 object-cover rounded-lg border border-zinc-800" />
                              ) : (
                                <div className="h-10 w-10 bg-zinc-950 border border-zinc-850 rounded-lg flex items-center justify-center text-zinc-650">
                                  <Package className="h-4 w-4" />
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-3 text-left">
                              <span className="font-bold text-white block">{item.name}</span>
                              <span className="text-[10px] font-mono text-zinc-550">{item.sku}</span>
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex flex-col space-y-1 max-w-[120px] mx-auto">
                                <div className="flex justify-between text-[10px] font-mono font-bold text-zinc-400">
                                  <span>{pct}%</span>
                                  <span className={isComplete ? "text-emerald-450" : isPartial ? "text-amber-450" : "text-rose-450"}>
                                    {isComplete ? "OK" : isPartial ? "PARCIAL" : "PTE"}
                                  </span>
                                </div>
                                <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      isComplete ? 'bg-emerald-500' : isPartial ? 'bg-amber-500' : 'bg-rose-500'
                                    }`} 
                                    style={{ width: `${pct}%` }} 
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-3 text-center font-semibold font-mono text-zinc-300">
                              {m.required_quantity}
                            </td>
                            <td className="px-6 py-3 text-center font-semibold font-mono text-white">
                              {m.quantity}
                            </td>
                            <td className="px-6 py-3 text-zinc-400 capitalize">{item.unit}</td>
                            <td className="px-6 py-3 font-mono font-bold text-zinc-300">
                              ${(item.cost * m.quantity).toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                            </td>
                            <td className="px-6 py-3 text-right">
                              <RequirePermission action="inventory:use_material">
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => {
                                      setDispatchForm({ itemId: m.item_id, quantity: 1, requiredQuantity: 1, actionType: 'dispatch', reason: '' });
                                      setIsDispatchModalOpen(true);
                                    }}
                                    className="px-2 py-1 rounded bg-emerald-600/10 hover:bg-emerald-600 text-emerald-450 hover:text-white border border-emerald-500/15 hover:border-emerald-500 text-[10px] font-bold transition-all cursor-pointer"
                                    title="Despachar unidades a obra"
                                  >
                                    Despachar
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDispatchForm({ itemId: m.item_id, quantity: 1, requiredQuantity: 1, actionType: 'requirement', reason: '' });
                                      setIsDispatchModalOpen(true);
                                    }}
                                    className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-350 hover:text-white border border-zinc-850 text-[10px] font-bold transition-all cursor-pointer"
                                    title="Modificar requerimiento BOM"
                                  >
                                    Requisito
                                  </button>
                                </div>
                              </RequirePermission>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Dispatch Logs History */}
              <div className="bg-zinc-900/10 border border-zinc-900 rounded-xl p-5 space-y-4 text-left">
                <h4 className="text-xs font-bold text-zinc-550 uppercase tracking-widest font-mono flex items-center gap-1.5 pb-2 border-b border-zinc-900">
                  📋 Historial Reciente de Despacho de Materiales
                </h4>

                {loadingHistory ? (
                  <div className="py-4 flex justify-center"><Loader2 className="animate-spin text-zinc-500 h-5 w-5" /></div>
                ) : dispatchHistory.length === 0 ? (
                  <p className="text-xs italic text-zinc-500">No se registran movimientos de stock para esta obra aún.</p>
                ) : (
                  <div className="space-y-3.5 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-900">
                    {dispatchHistory.map((log) => (
                      <div key={log.id} className="bg-zinc-950 border border-zinc-900 p-3 rounded-lg flex items-center justify-between text-xs hover:border-zinc-850 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{log.inventory_items?.name}</span>
                            <span className="bg-zinc-900 text-zinc-400 font-mono text-[9px] px-1.5 py-0.5 rounded border border-zinc-800">{log.inventory_items?.sku}</span>
                            <span className="text-[10px] text-zinc-550 font-mono">
                              {new Date(log.created_at).toLocaleDateString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-zinc-400 text-[11px] leading-relaxed">
                            Detalle: <strong className="text-zinc-300 font-bold">{log.reason}</strong>
                          </p>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-3">
                          <div>
                            <span className="text-[9px] font-bold text-zinc-550 uppercase font-mono block">Responsable</span>
                            <span className="font-semibold text-zinc-350">{log.profiles?.full_name || 'Desconocido'}</span>
                          </div>
                          <div className="bg-rose-500/10 text-rose-400 font-bold border border-rose-500/25 px-2.5 py-1 rounded-lg text-center font-mono">
                            {log.quantity} {log.inventory_items?.unit}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
            </div>
          )}

          {/* TAB: BITÁCORA / ACTIVITY LOG */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div className="bg-zinc-900/30 border border-zinc-900 p-4 rounded-xl flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-500">Filtrar por Miembro:</span>
                <select
                  value={activityMemberFilter}
                  onChange={e => setActivityMemberFilter(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
                >
                  <option value="todos">Todos los miembros</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="border border-zinc-900 rounded-xl divide-y divide-zinc-900 max-h-96 overflow-y-auto text-left">
                {getProjectActivities().map((act) => (
                  <div key={act.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-900/20">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-zinc-900 border border-zinc-800 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded text-zinc-400">
                          {act.action}
                        </span>
                        <span className="text-[10px] text-zinc-600 font-mono">
                          {new Date(act.created_at).toLocaleDateString([], { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-normal">{act.details}</p>
                      <div className="text-[10px] text-zinc-500 font-medium">
                        Tarea asociada: <strong className="text-zinc-400 font-bold">{act.taskTitle}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="h-6 w-6 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-[8px] font-bold text-zinc-350">
                        {act.user_name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-zinc-450">{act.user_name}</span>
                    </div>
                  </div>
                ))}

                {getProjectActivities().length === 0 && (
                  <p className="text-center py-10 italic text-zinc-500 text-xs">No hay registros de actividades auditadas en esta obra.</p>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* RIGHT SIDEBAR: CHAT DE OBRA COLLAPSIBLE */}
      {isChatOpen && (
        <div className="w-[360px] border-l border-zinc-900 bg-zinc-950 flex flex-col h-full shrink-0 z-10 transition-all duration-300">
          {/* Chat Header */}
          <div className="p-4 border-b border-zinc-900 bg-zinc-900/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4.5 w-4.5 text-emerald-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">Chat de Obra</span>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="p-1 hover:bg-zinc-900 rounded text-zinc-550 hover:text-white transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Messages Panel */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-900">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2">
                <MessageSquare className="h-8 w-8 opacity-20" />
                <p className="text-xs italic">No hay mensajes en este canal. Escribe el primero.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.profile_id === currentUser?.id;
                const profile = (msg as any).profiles;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} text-left`}>
                    {!isMe && (
                      <span className="text-[9px] text-zinc-500 ml-1 mb-1 font-bold">
                        {profile?.full_name || 'Miembro'}
                      </span>
                    )}
                    <div className={`px-3.5 py-2 rounded-2xl max-w-[85%] text-xs leading-normal ${
                      isMe 
                        ? 'bg-emerald-600 text-white rounded-br-sm' 
                        : 'bg-zinc-900 text-zinc-200 rounded-bl-sm border border-zinc-800/80'
                    }`}>
                      {msg.message}
                    </div>
                    <span className="text-[8px] text-zinc-600 mt-1 mx-1 font-mono">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Messages Input Box */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-900 bg-zinc-900/50 flex gap-2 shrink-0">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe al equipo de obra..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
            <Button type="submit" disabled={sendingMsg || !newMessage.trim()} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-3.5 h-8">
              {sendingMsg ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </form>
        </div>
      )}

      {/* MODAL: CONFIGURACIÓN DE OBRA (SETTINGS) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-zinc-850 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-white">
                <Settings className="h-5 w-5 text-zinc-400" />
                <h3 className="font-bold text-sm uppercase tracking-wide">Configuración de Obra</h3>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveSettings} className="p-6 overflow-y-auto space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Nombre de la Obra *</label>
                <input
                  required
                  type="text"
                  value={settingsForm.name}
                  onChange={e => setSettingsForm({...settingsForm, name: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Fase Operativa</label>
                  <select
                    value={settingsForm.phase}
                    onChange={e => setSettingsForm({...settingsForm, phase: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none font-semibold"
                  >
                    <option value="Diseno">Diseño</option>
                    <option value="Permisos">Permisos</option>
                    <option value="Construccion">Construcción</option>
                    <option value="Operacion">Operación</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Estado</label>
                  <select
                    value={settingsForm.status}
                    onChange={e => setSettingsForm({...settingsForm, status: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none font-semibold"
                  >
                    <option value="en_progreso">En Progreso</option>
                    <option value="demorado">Demorado</option>
                    <option value="completado">Completado</option>
                    <option value="archivado">Archivado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Capacidad Nominal (MWp/kWp)</label>
                  <input
                    type="text"
                    value={settingsForm.capacity}
                    onChange={e => setSettingsForm({...settingsForm, capacity: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    placeholder="Ej. 1.2 MWp"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Coordenadas GPS</label>
                  <input
                    type="text"
                    value={settingsForm.gps_coordinates}
                    onChange={e => setSettingsForm({...settingsForm, gps_coordinates: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    placeholder="Ej. -12.04637, -77.04279"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Ubicación / Dirección de Obra</label>
                <input
                  type="text"
                  value={settingsForm.location}
                  onChange={e => setSettingsForm({...settingsForm, location: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  placeholder="Dirección física del proyecto..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">URL de Banner de Obra</label>
                <input
                  type="text"
                  value={settingsForm.banner_url}
                  onChange={e => setSettingsForm({...settingsForm, banner_url: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none font-mono"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Descripción General</label>
                <textarea
                  value={settingsForm.description}
                  onChange={e => setSettingsForm({...settingsForm, description: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none h-16 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Colaboradores Asignados a la Obra</label>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2.5 max-h-32 overflow-y-auto">
                  {employees.map(emp => {
                    const isChecked = settingsForm.member_ids.includes(emp.id);
                    return (
                      <label key={emp.id} className="flex items-center gap-2.5 text-xs font-semibold text-zinc-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSettingsForm({...settingsForm, member_ids: settingsForm.member_ids.filter(x => x !== emp.id)});
                            } else {
                              setSettingsForm({...settingsForm, member_ids: [...settingsForm.member_ids, emp.id]});
                            }
                          }}
                          className="rounded border-zinc-800 bg-zinc-950 text-emerald-600 focus:ring-emerald-500/20 h-4 w-4 cursor-pointer"
                        />
                        <span>{emp.full_name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-850 flex justify-end gap-2 shrink-0">
                <Button type="button" variant="ghost" onClick={() => setIsSettingsOpen(false)} className="text-zinc-400">
                  Cancelar
                </Button>
                <Button type="submit" disabled={savingSettings} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5">
                  {savingSettings ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Guardar Configuración
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASIGNAR / DESPACHAR MATERIAL */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-zinc-850 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-emerald-450">
                <Plus className="h-5 w-5" />
                <h3 className="font-bold text-sm uppercase tracking-wide">Despacho / Requisito BOM</h3>
              </div>
              <button onClick={() => setIsDispatchModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Sub-tabs */}
            <div className="flex border-b border-zinc-850 px-4 bg-zinc-900/30">
              <button
                onClick={() => setDispatchForm({...dispatchForm, actionType: 'dispatch'})}
                className={`px-4 py-3 text-xs font-bold uppercase border-b-2 ${
                  dispatchForm.actionType === 'dispatch' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-500'
                }`}
              >
                Despachar a Obra
              </button>
              <button
                onClick={() => setDispatchForm({...dispatchForm, actionType: 'requirement'})}
                className={`px-4 py-3 text-xs font-bold uppercase border-b-2 ${
                  dispatchForm.actionType === 'requirement' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-500'
                }`}
              >
                Añadir Requisito BOM
              </button>
            </div>

            <form onSubmit={handleDispatchSubmit} className="p-6 overflow-y-auto space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Seleccionar Insumo *</label>
                <select
                  required
                  value={dispatchForm.itemId}
                  onChange={e => setDispatchForm({...dispatchForm, itemId: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="">Selecciona un material global...</option>
                  {inventoryItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} (SKU: {item.sku} • Stock: {item.stock} {item.unit})
                    </option>
                  ))}
                </select>
              </div>

              {dispatchForm.actionType === 'dispatch' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Cantidad a Despachar *</label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={dispatchForm.quantity}
                      onChange={e => setDispatchForm({...dispatchForm, quantity: Math.max(1, Number(e.target.value))})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Motivo del despacho / Guía remisión</label>
                    <input
                      type="text"
                      placeholder="Ej. Guía N° 2034 / Envío paneles Trina"
                      value={dispatchForm.reason}
                      onChange={e => setDispatchForm({...dispatchForm, reason: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Cantidad Requerida Adicional *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={dispatchForm.requiredQuantity}
                    onChange={e => setDispatchForm({...dispatchForm, requiredQuantity: Math.max(1, Number(e.target.value))})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-zinc-850 flex justify-end gap-2 shrink-0">
                <Button type="button" variant="ghost" onClick={() => setIsDispatchModalOpen(false)} className="text-zinc-400">
                  Cancelar
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5">
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Ejecutar Cambios
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TASK DIALOG MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-zinc-850 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-emerald-400">
                <Plus className="h-5 w-5" />
                <h3 className="font-bold text-sm uppercase tracking-wide">Crear Nueva Tarea en Obra</h3>
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
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
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
                  id="create-requires-audit-project"
                  checked={createForm.requires_audit}
                  onChange={e => setCreateForm({...createForm, requires_audit: e.target.checked})}
                  className="rounded border-zinc-800 bg-zinc-900 text-emerald-600 focus:ring-emerald-500/20 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="create-requires-audit-project" className="text-xs font-bold text-zinc-400 cursor-pointer select-none">
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

      {/* TASK DETAIL SLIDE-OVER DRAWER */}
      <TaskDetailDrawer
        task={selectedTask}
        isOpen={isTaskDrawerOpen}
        onClose={() => { 
          setIsTaskDrawerOpen(false); 
          setSelectedTask(null); 
          setTaskDrawerEditMode(false);
        }}
        employees={employees}
        user={currentUser}
        projects={[project]}
        onTaskUpdated={loadProjectTasks}
        initialEditMode={taskDrawerEditMode}
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
                          <FileText className="h-2.5 w-2.5 text-zinc-555 shrink-0" />
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

          <div className="mt-3 pt-3 border-t border-zinc-800/80 flex justify-between items-center shrink-0">
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
                    className="h-5.5 w-5.5 rounded-full bg-zinc-900 border border-zinc-955 flex items-center justify-center text-[8px] font-bold text-zinc-300 ring-1 ring-zinc-800"
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
