'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Folder, MapPin, Zap, Activity, CheckCircle, Clock, 
  Upload, FileText, Loader2, AlertCircle, MessageSquare, Send,
  Shield, Check, X, AlertTriangle, Plus, Settings, Eye, FileSpreadsheet,
  Calendar as CalendarIcon, User, Layers, Share2, ClipboardList, Info,
  Package, Search, Download, Trash2, ArrowRight, CheckSquare, Square,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { supabase } from '@/core/database/supabase';
import { Button } from '@/core/components/ui/button';
import { RequirePermission } from '@/core/auth/AuthContext';
import { getTasks, createTask, updateTaskStatus, auditTaskStatus, uploadTaskEvidence, TaskRow } from '@/core/services/tasks';
import { getProjectMessages, sendMessage, ProjectMessageRow } from '@/core/services/chat';
import { 
  getProjectMaterials, 
  addProjectMaterialRequirement, 
  dispatchMaterialToProject, 
  getInventoryItems, 
  ProjectMaterialWithItem, 
  InventoryItemRow 
} from '@/core/services/inventory';
import { updateProject } from '@/core/services/projects';
import TaskDetailDrawer from '@/core/components/TaskDetailDrawer';

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  // Tasks States
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);

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
  const [fileFilterArea, setFileFilterArea] = useState('todos');
  const [fileFilterExt, setFileFilterExt] = useState('todos');

  // Activity Log Member Filter
  const [activityMemberFilter, setActivityMemberFilter] = useState('todos');

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    setIsMounted(true);
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

  useEffect(() => {
    if (activeTab === 'materials') {
      loadProjectMaterials();
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

  // Drag End for Kanban DND
  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const nextStatus = destination.droppableId as 'pendiente' | 'en_progreso' | 'completada';
    setTasks(prev => prev.map(t => t.id === draggableId ? { ...t, status: nextStatus } : t));

    try {
      await updateTaskStatus(draggableId, nextStatus);
      loadProjectTasks();
    } catch (err: any) {
      loadProjectTasks();
      alert('Error al mover tarea: ' + err.message);
    }
  };

  const getColumnTasks = (status: 'pendiente' | 'en_progreso' | 'completada') => {
    return tasks.filter(t => t.status === status);
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
          const filename = url.split('/').pop() || `Archivo_${i + 1}`;
          const extension = filename.split('.').pop()?.toLowerCase() || '';
          
          files.push({
            id: `${t.id}_file_${i}`,
            taskId: t.id,
            taskTitle: t.title,
            taskArea: t.area || 'general',
            url,
            name: filename,
            ext: extension
          });
        });
      }
    });

    return files.filter(f => {
      if (fileFilterArea !== 'todos' && f.taskArea !== fileFilterArea) return false;
      if (fileFilterExt !== 'todos') {
        if (fileFilterExt === 'images') {
          return ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(f.ext);
        }
        if (fileFilterExt === 'pdf') {
          return f.ext === 'pdf';
        }
        if (fileFilterExt === 'others') {
          return !['png', 'jpg', 'jpeg', 'webp', 'gif', 'pdf'].includes(f.ext);
        }
      }
      return true;
    });
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
              <p className="text-sm font-bold text-emerald-400 mt-0.5">{project.phase}</p>
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
               tab === 'files' ? 'Entregables' :
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
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[550px] items-stretch min-h-0">
                
                {/* Column: To Do */}
                <div className="bg-zinc-900/10 border border-zinc-900 rounded-2xl flex flex-col min-h-0 h-full p-4">
                  <div className="flex justify-between items-center mb-3 shrink-0 px-1">
                    <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest font-mono">Por Hacer</span>
                    <span className="bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                      {getColumnTasks('pendiente').length}
                    </span>
                  </div>
                  <Droppable droppableId="pendiente">
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex-1 overflow-y-auto space-y-3 pb-4 min-h-[150px] scrollbar-thin scrollbar-thumb-zinc-900"
                      >
                        {getColumnTasks('pendiente').map((task, index) => (
                          <KanbanCard key={task.id} task={task} index={index} onClick={() => { setSelectedTask(task); setIsTaskDrawerOpen(true); }} handleToggleCheck={handleToggleCheck} employees={employees} />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>

                {/* Column: In Progress */}
                <div className="bg-zinc-900/10 border border-zinc-900 rounded-2xl flex flex-col min-h-0 h-full p-4">
                  <div className="flex justify-between items-center mb-3 shrink-0 px-1">
                    <span className="text-[10px] font-bold text-zinc-555 uppercase tracking-widest font-mono">En Progreso</span>
                    <span className="bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                      {getColumnTasks('en_progreso').length}
                    </span>
                  </div>
                  <Droppable droppableId="en_progreso">
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex-1 overflow-y-auto space-y-3 pb-4 min-h-[150px] scrollbar-thin scrollbar-thumb-zinc-900"
                      >
                        {getColumnTasks('en_progreso').map((task, index) => (
                          <KanbanCard key={task.id} task={task} index={index} onClick={() => { setSelectedTask(task); setIsTaskDrawerOpen(true); }} handleToggleCheck={handleToggleCheck} employees={employees} />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>

                {/* Column: Completed */}
                <div className="bg-zinc-900/10 border border-zinc-900 rounded-2xl flex flex-col min-h-0 h-full p-4">
                  <div className="flex justify-between items-center mb-3 shrink-0 px-1">
                    <span className="text-[10px] font-bold text-zinc-555 uppercase tracking-widest font-mono">Finalizadas</span>
                    <span className="bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                      {getColumnTasks('completada').length}
                    </span>
                  </div>
                  <Droppable droppableId="completada">
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex-1 overflow-y-auto space-y-3 pb-4 min-h-[150px] scrollbar-thin scrollbar-thumb-zinc-900"
                      >
                        {getColumnTasks('completada').map((task, index) => (
                          <KanbanCard key={task.id} task={task} index={index} onClick={() => { setSelectedTask(task); setIsTaskDrawerOpen(true); }} handleToggleCheck={handleToggleCheck} employees={employees} />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>

              </div>
            </DragDropContext>
          )}

          {/* TAB: LIST */}
          {activeTab === 'list' && (
            <div className="bg-zinc-900/10 border border-zinc-900 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-900/50 border-b border-zinc-850 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    <th className="px-6 py-4 w-12"></th>
                    <th className="px-6 py-4">Tarea</th>
                    <th className="px-6 py-4">Área</th>
                    <th className="px-6 py-4">Vencimiento</th>
                    <th className="px-6 py-4">Prioridad</th>
                    <th className="px-6 py-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {tasks.map(task => {
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
                            <button onClick={e => handleToggleCheck(e, task)} className="text-zinc-550 hover:text-emerald-400 transition-colors">
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
                          }`}>{(task as any).priority || 'baja'}</span>
                        </td>
                        <td className="px-6 py-4 uppercase font-semibold text-zinc-350">{task.status.replace('_', ' ')}</td>
                      </tr>
                    );
                  })}
                  {tasks.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 italic text-zinc-550">No hay tareas creadas para este proyecto.</td>
                    </tr>
                  )}
                </tbody>
              </table>
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
            <div className="space-y-4">
              <div className="bg-zinc-900/30 border border-zinc-900 p-4 rounded-xl flex flex-wrap items-center gap-3.5">
                <span className="text-xs font-bold text-zinc-500">Filtrar Archivos:</span>
                <select
                  value={fileFilterArea}
                  onChange={e => setFileFilterArea(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
                >
                  <option value="todos">Área: Todas</option>
                  <option value="general">General</option>
                  <option value="legal">Legal</option>
                  <option value="almacen">Almacén</option>
                  <option value="operaciones">Operaciones</option>
                  <option value="administracion">Administración</option>
                </select>

                <select
                  value={fileFilterExt}
                  onChange={e => setFileFilterExt(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
                >
                  <option value="todos">Tipo: Todos</option>
                  <option value="images">Imágenes (PNG/JPG/WEBP)</option>
                  <option value="pdf">Documentos PDF</option>
                  <option value="others">Otros</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {getEvidenceFiles().map((file) => (
                  <div key={file.id} className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-2xl flex flex-col justify-between gap-3 hover:border-zinc-800 transition-colors text-left">
                    <div className="flex items-start gap-2.5">
                      <div className="h-10 w-10 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-center shrink-0">
                        {['png', 'jpg', 'jpeg', 'webp'].includes(file.ext) ? (
                          <img src={file.url} alt="Evidence thumbnail" className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <FileText className="h-5 w-5 text-emerald-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-white truncate block" title={file.name}>{file.name}</span>
                        <span className="text-[10px] text-zinc-550 block mt-0.5 truncate" title={`Tarea: ${file.taskTitle}`}>
                          Origen: {file.taskTitle}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-zinc-950 pt-3">
                      <span className="bg-zinc-950 border border-zinc-850 text-[8px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded text-zinc-500">
                        {file.taskArea}
                      </span>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-350 hover:text-white px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <Download className="h-3 w-3" /> Descargar
                      </a>
                    </div>
                  </div>
                ))}
                {getEvidenceFiles().length === 0 && (
                  <div className="col-span-full text-center py-10 italic text-zinc-500">
                    No se encontraron entregables de evidencia cargados para los filtros seleccionados.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: MATERIALS (BOM) */}
          {activeTab === 'materials' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-zinc-900/10 border border-zinc-900 p-4 rounded-xl">
                <div>
                  <h4 className="text-sm font-bold text-white">Lista de Materiales de Obra (BOM)</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Control comparativo de insumos Requeridos vs En Sitio en almacén físico.</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleExportCSV} className="bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold text-xs h-9 px-3 rounded-lg flex items-center gap-1">
                    <FileSpreadsheet className="h-4 w-4" /> Exportar CSV
                  </Button>
                  <RequirePermission action="inventory:use_material">
                    <Button onClick={() => setIsDispatchModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-3 rounded-lg flex items-center gap-1">
                      <Plus className="h-4 w-4" /> Despachar / Asignar
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
                        <th className="px-6 py-4">Insumo / SKU</th>
                        <th className="px-6 py-4 text-center">Requerido</th>
                        <th className="px-6 py-4 text-center">En Sitio (Obra)</th>
                        <th className="px-6 py-4">Medida</th>
                        <th className="px-6 py-4">Estado Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850">
                      {materials.map(m => {
                        const item = m.inventory_items;
                        if (!item) return null;

                        const isComplete = m.quantity >= m.required_quantity;
                        const isPartial = m.quantity < m.required_quantity && m.quantity > 0;
                        const isMissing = m.quantity === 0;

                        return (
                          <tr key={m.id} className="hover:bg-zinc-900/20">
                            <td className="px-6 py-3.5">
                              <span className="font-bold text-white block">{item.name}</span>
                              <span className="text-[10px] font-mono text-zinc-500">{item.sku}</span>
                            </td>
                            <td className="px-6 py-3.5 text-center font-semibold font-mono text-zinc-300">
                              {m.required_quantity}
                            </td>
                            <td className="px-6 py-3.5 text-center font-semibold font-mono text-white">
                              {m.quantity}
                            </td>
                            <td className="px-6 py-3.5 text-zinc-400 capitalize">{item.unit}</td>
                            <td className="px-6 py-3.5">
                              {isComplete ? (
                                <span className="bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 px-2 py-0.5 rounded text-[9px] font-bold">COMPLETO</span>
                              ) : isPartial ? (
                                <span className="bg-amber-500/10 text-amber-455 border border-amber-500/20 px-2 py-0.5 rounded text-[9px] font-bold">PARCIAL</span>
                              ) : (
                                <span className="bg-rose-500/10 text-rose-455 border border-rose-500/20 px-2 py-0.5 rounded text-[9px] font-bold">FALTANTE</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
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
                  <input
                    type="text"
                    value={settingsForm.phase}
                    onChange={e => setSettingsForm({...settingsForm, phase: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    placeholder="Ej. Construcción, Permisos..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Estado</label>
                  <select
                    value={settingsForm.status}
                    onChange={e => setSettingsForm({...settingsForm, status: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none font-semibold"
                  >
                    <option value="diseño">Diseño</option>
                    <option value="en_progreso">En Progreso</option>
                    <option value="demorado">Demorado</option>
                    <option value="completado">Completado</option>
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

      {/* TASK DETAIL SLIDE-OVER DRAWER */}
      <TaskDetailDrawer
        task={selectedTask}
        isOpen={isTaskDrawerOpen}
        onClose={() => { setIsTaskDrawerOpen(false); setSelectedTask(null); }}
        employees={employees}
        user={currentUser}
        projects={[project]}
        onTaskUpdated={loadProjectTasks}
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
}

function KanbanCard({ task, index, onClick, handleToggleCheck, employees }: KanbanCardProps) {
  const isCompleted = task.status === 'completada';
  const isDeliverable = ['entregable', 'reporte', 'evidencia'].includes(task.task_type);

  // Subtask progress
  const getSubtaskProgress = (subtasks: any) => {
    if (!subtasks || !Array.isArray(subtasks) || subtasks.length === 0) return null;
    const completed = subtasks.filter((s: any) => s.completed).length;
    return `${completed}/${subtasks.length}`;
  };

  const subProgress = getSubtaskProgress(task.subtasks);

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`bg-zinc-950 border p-4 rounded-xl flex flex-col justify-between hover:border-zinc-700 transition-all select-none ${
            snapshot.isDragging ? 'shadow-2xl border-emerald-500 bg-zinc-900 scale-[1.02]' : 'border-zinc-900'
          } ${isCompleted ? 'opacity-55' : ''}`}
        >
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex gap-1.5 flex-wrap">
                <span className="bg-zinc-900 border border-zinc-800 text-[8px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded text-zinc-400">
                  {task.area || 'general'}
                </span>
                
                <span className={`text-[8px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                  (task as any).priority === 'alta' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                  (task as any).priority === 'media' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  'bg-zinc-900 text-zinc-500 border border-zinc-800'
                }`}>
                  {(task as any).priority || 'baja'}
                </span>

                {task.requires_audit && (
                  <span className={`text-[8px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                    task.audit_status === 'aceptado' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' :
                    task.audit_status === 'denegado' ? 'bg-rose-500/10 text-rose-400 border-rose-500/25' :
                    task.audit_status === 'requiere_revision' ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' :
                    'bg-zinc-900 text-zinc-500 border-zinc-800'
                  }`}>
                    {task.audit_status === 'pendiente' ? 'Rev. Pendiente' : 
                     task.audit_status === 'aceptado' ? 'Aprobado' : 
                     task.audit_status === 'denegado' ? 'Rechazado' : 'Cambios'}
                  </span>
                )}
              </div>

              <div className="shrink-0 text-zinc-500">
                {task.task_type === 'evidencia' && <FileText className="h-3 w-3 text-purple-400" />}
                {task.task_type === 'reporte' && <FileText className="h-3 w-3 text-blue-400" />}
                {task.task_type === 'entregable' && <FileText className="h-3 w-3 text-yellow-400" />}
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              {!isDeliverable ? (
                <button
                  onClick={(e) => handleToggleCheck(e, task)}
                  className="mt-0.5 text-zinc-650 hover:text-emerald-400 transition-colors shrink-0"
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
              <p className="text-[10px] text-zinc-500 line-clamp-2 text-left leading-relaxed">
                {task.description}
              </p>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-900 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-500 font-bold">
              {subProgress && (
                <span className="flex items-center gap-1 bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400">
                  <CheckSquare className="h-3 w-3 text-emerald-400 shrink-0" />
                  {subProgress}
                </span>
              )}
              {(task as any).due_date && (
                <span className="flex items-center gap-0.5">
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
                    className="h-5.5 w-5.5 rounded-full bg-zinc-900 border border-zinc-950 flex items-center justify-center text-[8px] font-bold text-zinc-300 ring-1 ring-zinc-800"
                    title={emp.full_name}
                  >
                    {emp.full_name?.charAt(0).toUpperCase()}
                  </div>
                );
              })}
              {((task as any).assigned_to_ids?.length || 0) > 3 && (
                <div className="h-5.5 w-5.5 rounded-full bg-zinc-900 border border-zinc-955 flex items-center justify-center text-[7px] font-bold text-zinc-500 ring-1 ring-zinc-800">
                  +{((task as any).assigned_to_ids?.length || 0) - 3}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
