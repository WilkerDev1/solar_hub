'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/core/database/supabase';
import { getTasks, createTask, updateTaskStatus, uploadTaskEvidence, deleteTask, TaskRow } from '@/core/services/tasks';
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
import { getFolders, getDocumentsByProject, uploadDocument, createFolder, ensureProjectFolders, DocumentRow } from '@/core/services/documents';
import { getApiUrl } from '@/core/utils/api';

export type TabType = 'overview' | 'kanban' | 'list' | 'calendar' | 'files' | 'materials' | 'activity';

export function useProjectDetail(projectId: string) {
  // View states
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isChatOpen, setIsChatOpen] = useState(false);
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

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

  // ─── Effects ───

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

  // ─── Data Loaders ───

  const loadProjectData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setCurrentUser({ ...user, ...profile });

        const { data: adminCheck } = await supabase.rpc('user_has_permission', { required_action: 'admin:*' });
        setIsAdmin(!!adminCheck);
      }

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

      const { data: projData, error: fetchErr } = await supabase
        .from('projects')
        .select('*, clients(*)')
        .eq('id', projectId)
        .single();

      if (fetchErr) throw fetchErr;
      setProject(projData);

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

  const loadProjectTasks = async () => {
    if (!projectId) return;
    setLoadingTasks(true);
    try {
      const projTasks = await getTasks({ projectId });
      setTasks(projTasks);

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

      try {
        const folders = await getFolders({ projectId });
        setProjectFolders(folders);

        const docsList = await getDocumentsByProject(projectId);
        setProjectDocuments(docsList);
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

  useEffect(() => {
    if (activeTab === 'materials') {
      loadProjectMaterials();
      loadProjectDispatchHistory();
    }
  }, [projectId, activeTab]);

  // ─── Chat Realtime ───

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

  // ─── Action Handlers ───

  const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingFile(true);
    try {
      await uploadDocument(file, null, projectId, selectedUploadDept);
      await loadProjectTasks();
    } catch (err: any) {
      alert('Error al subir archivo: ' + err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleUploadBanner = async (file: File) => {
    setUploadingFile(true);
    try {
      const generalFolderId = await ensureProjectFolders(projectId, project.name);
      const doc = await uploadDocument(file, generalFolderId, projectId, 'general');
      const bannerUrl = `/api/storage/file/${doc.id}?name=${encodeURIComponent(doc.name)}`;
      await updateProject(projectId, { banner_url: bannerUrl });
      await loadProjectData();
    } catch (err: any) {
      alert('Error al subir banner: ' + err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleUploadGalleryImage = async (file: File) => {
    setUploadingFile(true);
    try {
      let galleryFolder = projectFolders.find(f => f.name.toLowerCase() === 'galería' || f.name.toLowerCase() === 'galeria');
      let folderId = galleryFolder?.id;
      if (!folderId) {
        // Ensure project folders exist first to resolve root project folder
        await ensureProjectFolders(projectId, project.name);
        const folders = await getFolders({ projectId });
        const projRoot = folders.find(f => f.name === project.name);

        const newFolder = await createFolder({
          name: 'Galería',
          parentId: projRoot?.id || null,
          projectId: projectId
        });
        folderId = newFolder.id;
        const foldersList = await getFolders({ projectId });
        setProjectFolders(foldersList);
      }
      await uploadDocument(file, folderId, projectId, 'general');
      await loadProjectTasks();
    } catch (err: any) {
      alert('Error al subir imagen a la galería: ' + err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) return;

    try {
      const assigned = createForm.assigned_to || currentUser?.id || '';
      await createTask({
        title: createForm.title.trim(),
        description: createForm.description.trim() || null,
        origin: createForm.origin || 'proyecto',
        task_type: createForm.task_type || 'check',
        assigned_to: assigned,
        project_id: projectId,
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

  const handleQuickCreate = async (status: 'backlog' | 'pendiente' | 'en_progreso' | 'bloqueada' | 'completada', title: string) => {
    if (!title.trim()) return;
    try {
      await createTask({
        title: title.trim(),
        status,
        project_id: projectId,
        origin: 'proyecto',
        task_type: 'check',
        assigned_to: currentUser?.id || '',
        priority: 'media',
        area: 'general'
      });
      loadProjectTasks();
    } catch (err: any) {
      alert('Error al crear tarea rápida: ' + err.message);
    }
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

  const handleToggleCheck = async (e: React.MouseEvent, task: TaskRow) => {
    e.stopPropagation();
    const nextStatus = task.status === 'completada' ? 'pendiente' : 'completada';
    
    let targetStatus: 'backlog' | 'pendiente' | 'en_progreso' | 'bloqueada' | 'completada' = nextStatus;
    if (nextStatus === 'completada' && task.requires_audit && task.audit_status !== 'aceptado') {
      targetStatus = 'bloqueada';
      alert('Esta tarea requiere auditoría de líder antes de completarse. Se moverá a la columna "Bloqueada" en espera de aprobación.');
    }

    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: targetStatus } : t));
    try {
      await updateTaskStatus(task.id, targetStatus);
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

    setTasks(prev => prev.map(t => t.id === draggableId ? { ...t, status: targetStatus } : t));

    try {
      await updateTaskStatus(draggableId, targetStatus);
      loadProjectTasks();
    } catch (err: any) {
      loadProjectTasks();
      alert('Error al mover tarea: ' + err.message);
    }
  };

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

  const handleExportCSV = () => {
    if (materials.length === 0 || !project) return;

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

  const handleCloseTaskDrawer = () => {
    setIsTaskDrawerOpen(false);
    setSelectedTask(null);
    setTaskDrawerEditMode(false);
  };

  // ─── Computed Values ───

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (filterArea !== 'todos' && task.area !== filterArea) return false;
      if (filterPriority !== 'todos' && (task as any).priority !== filterPriority) return false;
      if (filterAssignee !== 'todos') {
        const assignedIds = (task as any).assigned_to_ids || (task.assigned_to ? [task.assigned_to] : []);
        if (!assignedIds.includes(filterAssignee)) return false;
      }
      return true;
    });
  }, [tasks, filterArea, filterPriority, filterAssignee]);

  const getColumnTasks = (status: 'backlog' | 'pendiente' | 'en_progreso' | 'bloqueada' | 'completada') => {
    return filteredTasks.filter(t => t.status === status);
  };

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
    if (fileFilterDept !== 'todos') {
      filtered = filtered.filter(f => f.department === fileFilterDept);
    }
    if (fileFilterExt === 'images') {
      filtered = filtered.filter(f => f.isImage);
    } else if (fileFilterExt === 'pdf') {
      filtered = filtered.filter(f => f.ext === 'pdf');
    } else if (fileFilterExt === 'others') {
      filtered = filtered.filter(f => !f.isImage && f.ext !== 'pdf');
    }
    return filtered;
  };

  const getDirectProjectFiles = () => {
    const files: any[] = [];
    projectDocuments.forEach(doc => {
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
    if (fileFilterDept !== 'todos') {
      filtered = filtered.filter(f => f.department === fileFilterDept);
    }
    if (fileFilterExt === 'images') {
      filtered = filtered.filter(f => f.isImage);
    } else if (fileFilterExt === 'pdf') {
      filtered = filtered.filter(f => f.ext === 'pdf');
    } else if (fileFilterExt === 'others') {
      filtered = filtered.filter(f => !f.isImage && f.ext !== 'pdf');
    }
    return filtered;
  };

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

    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (activityMemberFilter !== 'todos') {
      return list.filter(a => a.profile_id === activityMemberFilter);
    }
    return list;
  };

  // ─── Calendar Helpers ───

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

  // ─── Return ───

  return {
    // View
    activeTab, setActiveTab,
    isChatOpen, setIsChatOpen,
    isMounted,

    // Core Data
    project, loading, error,
    currentUser, token, isAdmin,
    employees, clients,

    // Tasks
    tasks, loadingTasks, documentMap,
    selectedTask, setSelectedTask,
    isTaskDrawerOpen, setIsTaskDrawerOpen,
    taskDrawerEditMode, setTaskDrawerEditMode,
    filteredTasks, getColumnTasks,

    // Chat
    messages, newMessage, setNewMessage,
    sendingMsg, messagesEndRef,

    // Materials BOM
    materials, loadingMaterials,
    inventoryItems,
    isDispatchModalOpen, setIsDispatchModalOpen,
    actionLoading,
    dispatchForm, setDispatchForm,
    dispatchHistory, loadingHistory,

    // Task Creation
    isCreateOpen, setIsCreateOpen,
    createForm, setCreateForm,

    // Filters
    filterArea, setFilterArea,
    filterPriority, setFilterPriority,
    filterAssignee, setFilterAssignee,
    sidebarCollapsed, setSidebarCollapsed,

    // Settings
    isSettingsOpen, setIsSettingsOpen,
    settingsForm, setSettingsForm,
    savingSettings,

    // Files
    fileFilterDept, setFileFilterDept,
    fileFilterExt, setFileFilterExt,
    selectedUploadDept, setSelectedUploadDept,
    uploadingFile,
    projectFolders,
    projectDocuments,

    // Activity
    activityMemberFilter, setActivityMemberFilter,

    // Calendar
    currentDate, getCalendarDays, nextMonth, prevMonth, getTasksForDate,

    // Computed
    getEvidenceFiles, getDirectProjectFiles, getProjectActivities,

    // Handlers
    handleDirectFileUpload,
    handleUploadBanner,
    handleUploadGalleryImage,
    handleCreateSubmit,
    handleQuickCreate,
    handleSendMessage,
    handleToggleCheck,
    handleOpenTask, handleEditTask, handleDeleteTask,
    onDragEnd,
    handleSaveSettings,
    handleDispatchSubmit,
    handleExportCSV,
    handleCloseTaskDrawer,
    loadProjectTasks,
    loadProjectMaterials,
    loadProjectDispatchHistory,
  };
}

export type ProjectDetailContext = ReturnType<typeof useProjectDetail>;
