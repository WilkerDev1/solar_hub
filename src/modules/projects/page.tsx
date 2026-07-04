'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProjectDetailModule from '@/modules/projects/[id]/page';
import { Plus, Folder, MapPin, Activity, CheckCircle2, ClipboardList, LayoutList, Loader2, AlertCircle, MoreVertical, Trash2, Archive, Search, LayoutGrid, Filter, X } from 'lucide-react';
import { getProjects, createProject, deleteProject, archiveProject, ProjectFilters } from '@/core/services/projects';
import { supabase } from '@/core/database/supabase';
import { getApiUrl } from '@/core/utils/api';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/core/components/ui/dropdown-menu';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/core/components/ui/dialog';
import { Button } from '@/core/components/ui/button';
import { RequirePermission } from '@/core/auth/AuthContext';

interface ProjectWithStats {
  id: string;
  client_id: string;
  name: string;
  location: string | null;
  capacity: string | null;
  phase: string;
  status: string;
  gps_coordinates: string | null;
  clients?: { name: string };
  completedTasks: number;
  totalTasks: number;
  completedDeliverables: number;
  totalDeliverables: number;
  banner_url?: string | null;
}

export default function ProjectsModule() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
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

  const getDownloadUrl = (url: string | null | undefined) => {
    if (!url) return '';
    if (url.startsWith('/api/storage/file/')) {
      const urlWithToken = token ? `${url}${url.includes('?') ? '&' : '?'}token=${token}` : url;
      return getApiUrl(urlWithToken);
    }
    return url;
  };

  // View & selection states for list view
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [bulkAction, setBulkAction] = useState<string>('');
  const [executingBulk, setExecutingBulk] = useState(false);

  // Filters state
  const [filters, setFilters] = useState<ProjectFilters>({
    status: 'todos',
    phase: 'todas',
    search: ''
  });

  // Creation State
  const [clients, setClients] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProj, setNewProj] = useState({ client_id: '', name: '', phase: 'Diseno', capacity: '', location: '', status: 'en_progreso' });

  const handleBulkAction = async () => {
    if (selectedIds.length === 0) return alert('Por favor, selecciona al menos un proyecto.');
    if (!bulkAction) return alert('Selecciona una acción.');
    
    const confirmMsg = bulkAction === 'delete' 
      ? `¿Estás seguro de eliminar permanentemente los ${selectedIds.length} proyectos seleccionados?`
      : `¿Estás seguro de archivar los ${selectedIds.length} proyectos seleccionados?`;

    if (!confirm(confirmMsg)) return;

    setExecutingBulk(true);
    try {
      if (bulkAction === 'delete') {
        for (const id of selectedIds) {
          await deleteProject(id);
        }
      } else if (bulkAction === 'archive') {
        for (const id of selectedIds) {
          await archiveProject(id);
        }
      }
      setSelectedIds([]);
      setBulkAction('');
      loadData();
    } catch (err: any) {
      alert(`Error en acción en lote: ${err.message}`);
    } finally {
      setExecutingBulk(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load clients for creation dropdown
      const { data: clientsData } = await supabase.from('clients').select('id, name').order('name');
      setClients(clientsData || []);

      // Load projects from service
      const projData = await getProjects(filters);

      // Fetch tasks globally to count stats
      const { data: taskData } = await supabase.from('global_tasks').select('project_id, task_type, status');

      const mapped: ProjectWithStats[] = (projData || []).map((p) => {
        const pTasks = (taskData || []).filter((t) => t.project_id === p.id);
        const totalTasks = pTasks.length;
        const completedTasks = pTasks.filter((t) => t.status === 'completada').length;

        const pDeliverables = pTasks.filter((t) => t.task_type === 'entregable');
        const totalDeliverables = pDeliverables.length;
        const completedDeliverables = pDeliverables.filter((t) => t.status === 'completada').length;

        return {
          ...p,
          completedTasks,
          totalTasks,
          completedDeliverables,
          totalDeliverables,
        };
      });

      // Sort: active projects first, archived projects at the bottom
      const sortedMapped = [...mapped].sort((a, b) => {
        if (a.status === 'archivado' && b.status !== 'archivado') return 1;
        if (a.status !== 'archivado' && b.status === 'archivado') return -1;
        return 0; // maintain default order (created_at desc)
      });
      setProjects(sortedMapped);
    } catch (err: any) {
      console.error('Error loading projects:', err);
      setError(err.message || 'Error al cargar los proyectos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]); // Reload when filters change

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProj.name || !newProj.client_id) return alert('Nombre y Cliente son obligatorios');
    setCreating(true);
    try {
      await createProject(newProj);
      setIsCreateOpen(false);
      setNewProj({ client_id: '', name: '', phase: 'Diseno', capacity: '', location: '', status: 'en_progreso' });
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este proyecto y todo su historial de forma permanente?')) {
      try {
        await deleteProject(id);
        loadData();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveProject(id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (projectId) {
    return <ProjectDetailModule projectId={projectId} />;
  }

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-800 dark:text-white tracking-wide flex items-center gap-2 transition-colors">
            <Folder className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            Gestión de Proyectos Solares
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1 transition-colors">Administra, filtra y supervisa el progreso de las obras.</p>
        </div>
        
        {/* CREATE BUTTON */}
        <RequirePermission action="project:write">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger className="inline-flex items-center justify-center rounded-xl text-sm px-4 py-2.5 bg-emerald-650 hover:bg-emerald-600 text-white font-bold gap-2 cursor-pointer shadow-sm">
              <Plus className="h-4 w-4" /> Nuevo Proyecto
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200">
              <DialogHeader>
                <DialogTitle className="text-emerald-600 dark:text-emerald-400">Crear Nuevo Proyecto</DialogTitle>
                <DialogDescription className="text-zinc-500 dark:text-zinc-500">
                  Añade una nueva obra al sistema y vincúlala a un cliente existente.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-450 dark:text-zinc-400 uppercase">Nombre de la Obra</label>
                  <input required value={newProj.name} onChange={e => setNewProj({...newProj, name: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:border-emerald-500 outline-none transition-colors" placeholder="Ej. Planta Solar 100MW" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-450 dark:text-zinc-400 uppercase">Cliente Propietario</label>
                  <select required value={newProj.client_id} onChange={e => setNewProj({...newProj, client_id: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-700 dark:text-zinc-300 focus:border-emerald-500 outline-none transition-colors">
                    <option value="">Seleccione un cliente...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-455 dark:text-zinc-400 uppercase">Fase</label>
                    <select value={newProj.phase} onChange={e => setNewProj({...newProj, phase: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-700 dark:text-zinc-300 focus:border-emerald-500 outline-none transition-colors">
                      <option value="Diseno">Diseño</option>
                      <option value="Permisos">Permisos</option>
                      <option value="Construccion">Construcción</option>
                      <option value="Operacion">Operación</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-455 dark:text-zinc-400 uppercase">Capacidad</label>
                    <input value={newProj.capacity} onChange={e => setNewProj({...newProj, capacity: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:border-emerald-500 outline-none transition-colors" placeholder="100 MWp" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-455 dark:text-zinc-400 uppercase">Ubicación (Región/Ciudad)</label>
                  <input value={newProj.location} onChange={e => setNewProj({...newProj, location: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:border-emerald-500 outline-none transition-colors" placeholder="Copiapó, Atacama" />
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-zinc-500 dark:text-zinc-400">Cancelar</Button>
                  <Button type="submit" disabled={creating} className="bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer">
                    {creating ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null} Guardar Proyecto
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </RequirePermission>
      </div>

      {/* TOOLBAR: FILTERS */}
      <div className="flex flex-col md:flex-row gap-3 bg-zinc-800 border border-zinc-700 p-3 rounded-none transition-colors">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Buscar proyecto por nombre..." 
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-none pl-9 pr-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none transition-colors"
          />
        </div>

        {(!isFilterOpen || viewMode === 'grid') && (
          <>
            <select 
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="bg-zinc-900 border border-zinc-700 rounded-none px-3 py-2 text-sm text-zinc-300 focus:border-emerald-500 outline-none transition-colors"
            >
              <option value="todos">Todos los Estados</option>
              <option value="en_progreso">En Progreso</option>
              <option value="completado">Completado</option>
              <option value="demorado">Demorado</option>
              <option value="archivado">Archivado</option>
            </select>
            <select 
              value={filters.phase}
              onChange={(e) => setFilters({...filters, phase: e.target.value})}
              className="bg-zinc-900 border border-zinc-700 rounded-none px-3 py-2 text-sm text-zinc-300 focus:border-emerald-500 outline-none transition-colors"
            >
              <option value="todas">Todas las Fases</option>
              <option value="Diseno">Diseño</option>
              <option value="Permisos">Permisos</option>
              <option value="Construccion">Construcción</option>
              <option value="Operacion">Operación</option>
            </select>
          </>
        )}

        {/* List/Grid View Switcher */}
        <div className="flex border border-zinc-700 rounded-none overflow-hidden shrink-0">
          <button 
            type="button"
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'grid' 
                ? 'bg-zinc-700 text-white font-semibold' 
                : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Mosaico
          </button>
          <button 
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'list' 
                ? 'bg-zinc-700 text-white font-semibold' 
                : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <LayoutList className="h-3.5 w-3.5" />
            Lista
          </button>
        </div>

        {/* Filtro Sidebar toggle button (list view only) */}
        {viewMode === 'list' && (
          <button 
            type="button"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`px-3.5 py-2 text-xs font-bold border border-zinc-700 rounded-none transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              isFilterOpen 
                ? 'bg-emerald-600 border-emerald-500 text-white font-semibold' 
                : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
          <span className="text-zinc-500 text-sm font-medium">Cargando proyectos solares...</span>
        </div>
      ) : error ? (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 p-4 rounded-xl flex items-center space-x-3 text-sm">
          <AlertCircle className="h-5 w-5 text-rose-500 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-12 text-center rounded-2xl transition-colors">
          <Folder className="h-10 w-10 text-zinc-400 dark:text-zinc-700 mx-auto mb-3" />
          <h3 className="text-zinc-700 dark:text-zinc-400 font-bold text-sm">Ningún proyecto encontrado</h3>
          <p className="text-zinc-550 text-xs mt-1">Modifica los filtros o crea un proyecto nuevo.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj) => {
            const borderAccent =
              proj.status === 'completado' ? 'border-l-emerald-500' :
              proj.status === 'en_progreso' ? 'border-l-amber-500' :
              proj.status === 'demorado' ? 'border-l-rose-500' :
              'border-l-zinc-400';

            const titleColor =
              proj.status === 'completado' ? 'text-emerald-400 hover:text-emerald-350' :
              proj.status === 'en_progreso' ? 'text-amber-400 hover:text-amber-350' :
              proj.status === 'demorado' ? 'text-rose-455 hover:text-rose-400' :
              'text-zinc-400 hover:text-zinc-350';

            return (
              <div
                key={proj.id}
                className={`bg-zinc-800 border-l-[6px] ${borderAccent} border-t border-r border-b border-zinc-700/80 rounded-none overflow-hidden hover:shadow-lg transition-all flex flex-col justify-between relative group text-zinc-100`}
              >
                {/* Cover Banner Image */}
                <div className="relative h-44 w-full bg-zinc-905 overflow-hidden shrink-0 border-b border-zinc-700/60">
                  {proj.banner_url ? (
                    <img src={getDownloadUrl(proj.banner_url)} alt={proj.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-in-out" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-zinc-850 to-zinc-900 flex items-center justify-center">
                      <Folder className="h-10 w-10 text-zinc-500 opacity-50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-80" />
                  
                  {/* Status Badge overlays the image */}
                  <div className="absolute bottom-3 left-4 flex gap-2">
                    <span className={`text-[9px] font-bold uppercase px-2.5 py-0.5 rounded border ${
                      proj.status === 'completado' ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500/20' :
                      proj.status === 'en_progreso' ? 'bg-amber-950/70 text-amber-400 border-amber-500/20' :
                      proj.status === 'archivado' ? 'bg-zinc-900/80 text-zinc-400 border-zinc-700' :
                      'bg-rose-950/70 text-rose-400 border-rose-500/20'
                    }`}>
                      {proj.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* KEBAB MENU PARA ADMIN OVERLAYS THE IMAGE */}
                  <RequirePermission action="project:write">
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1.5 rounded-lg bg-zinc-950/80 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-900 outline-none cursor-pointer">
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 bg-zinc-900 border border-zinc-700 text-zinc-350">
                          <DropdownMenuItem onClick={() => handleArchive(proj.id)} className="hover:bg-zinc-800 cursor-pointer">
                            <Archive className="h-4 w-4 mr-2" /> Archivar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-zinc-800" />
                          <DropdownMenuItem onClick={() => handleDelete(proj.id)} className="text-rose-400 focus:bg-rose-950/20 focus:text-rose-455 cursor-pointer">
                            <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </RequirePermission>
                </div>

                {/* Card content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2 min-w-0">
                        <Folder className="h-4 w-4 text-zinc-500 shrink-0" />
                        <h3
                          className={`font-bold truncate text-sm ${titleColor} transition-colors cursor-pointer`}
                          onClick={() => router.push(`/?tab=projects&projectId=${proj.id}`)}
                        >
                          {proj.name}
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <span className="text-[10px] text-zinc-450 font-semibold font-mono uppercase tracking-wider block">
                        Cliente: {proj.clients?.name || 'Sin Cliente'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs pt-3 border-t border-zinc-700/60">
                      <div>
                        <span className="text-[10px] text-zinc-450 block font-mono uppercase">Ubicación</span>
                        <span className="font-bold text-zinc-200">{proj.location || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-450 block font-mono uppercase">Capacidad</span>
                        <span className="font-bold text-zinc-200 font-mono">{proj.capacity || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-455 block font-mono uppercase">Fase actual</span>
                        <span className="font-bold text-zinc-200">
                          {proj.phase === 'Diseno' ? 'Diseño' :
                           proj.phase === 'Construccion' ? 'Construcción' :
                           proj.phase === 'Operacion' ? 'Operación' : proj.phase}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-455 block font-mono uppercase">Hitos</span>
                        <span className="font-bold text-zinc-200">
                          {proj.completedDeliverables}/{proj.totalDeliverables} completados
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3">
                    <button
                      onClick={() => router.push(`/?tab=projects&projectId=${proj.id}`)}
                      className="w-full text-center py-2.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white text-xs font-bold border border-zinc-700 transition-colors uppercase tracking-wider cursor-pointer"
                      style={{ minHeight: '40px' }}
                    >
                      Detalles ({proj.completedTasks}/{proj.totalTasks} tareas)
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="flex gap-4 min-h-[400px] items-stretch">
          {/* Main Table area */}
          <div className="flex-1 flex flex-col justify-between overflow-x-auto bg-white dark:bg-zinc-900/40 rounded-xl border border-zinc-200 dark:border-zinc-800/80 p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-mono tracking-widest text-zinc-500 uppercase">
                    <th className="py-3 px-2 w-8">
                      <input 
                        type="checkbox"
                        checked={projects.length > 0 && selectedIds.length === projects.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(projects.map(p => p.id));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                        className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </th>
                    <th className="py-3 px-3">Proyecto</th>
                    <th className="py-3 px-3">Cliente</th>
                    <th className="py-3 px-3">Etapa</th>
                    <th className="py-3 px-3">Capacidad</th>
                    <th className="py-3 px-3">Ubicación</th>
                    <th className="py-3 px-3">Hitos</th>
                    <th className="py-3 px-3">Estado</th>
                    <th className="py-3 px-3 w-12 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 text-xs">
                  {(selectedClientId ? projects.filter(p => p.client_id === selectedClientId) : projects).map((proj) => {
                    const isSelected = selectedIds.includes(proj.id);
                    return (
                      <tr key={proj.id} className={`hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors ${isSelected ? 'bg-emerald-50/5 dark:bg-emerald-950/5' : ''}`}>
                        <td className="py-3.5 px-2">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds([...selectedIds, proj.id]);
                              } else {
                                setSelectedIds(selectedIds.filter(id => id !== proj.id));
                              }
                            }}
                            className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-zinc-800 dark:text-white">
                          <button
                            onClick={() => router.push(`/?tab=projects&projectId=${proj.id}`)}
                            className="hover:text-emerald-500 font-bold transition-colors cursor-pointer text-left"
                          >
                            {proj.name}
                          </button>
                        </td>
                        <td className="py-3.5 px-3 text-zinc-500 dark:text-zinc-400">
                          {proj.clients?.name || 'Sin Cliente'}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            {proj.phase === 'Diseno' ? 'Diseño' :
                             proj.phase === 'Construccion' ? 'Construcción' :
                             proj.phase === 'Operacion' ? 'Operación' : proj.phase}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-zinc-650 dark:text-zinc-300 font-mono">
                          {proj.capacity || '—'}
                        </td>
                        <td className="py-3.5 px-3 text-zinc-650 dark:text-zinc-300">
                          {proj.location || '—'}
                        </td>
                        <td className="py-3.5 px-3 text-zinc-500 dark:text-zinc-400 font-mono">
                          {proj.completedDeliverables}/{proj.totalDeliverables}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                            proj.status === 'completado' ? 'bg-emerald-50/80 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border-emerald-250 dark:border-emerald-500/20' :
                            proj.status === 'en_progreso' ? 'bg-amber-50/80 dark:bg-amber-950/70 text-amber-750 dark:text-amber-400 border-emerald-250 dark:border-emerald-500/20' :
                            proj.status === 'archivado' ? 'bg-zinc-100/90 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 border-zinc-250 dark:border-zinc-700' :
                            'bg-rose-50/80 dark:bg-rose-950/70 text-rose-700 dark:text-rose-400 border-rose-250 dark:border-rose-500/20'
                          }`}>
                            {proj.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-450 hover:text-zinc-900 dark:hover:text-white outline-none cursor-pointer">
                              <MoreVertical className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300">
                              <DropdownMenuItem onClick={() => handleArchive(proj.id)} className="hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                                <Archive className="h-4 w-4 mr-2" /> Archivar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-zinc-200 dark:bg-zinc-800" />
                              <DropdownMenuItem onClick={() => handleDelete(proj.id)} className="text-rose-600 dark:text-rose-405 focus:bg-rose-50 dark:focus:bg-rose-500/10 focus:text-rose-600 dark:focus:text-rose-450 cursor-pointer">
                                <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bulk actions bar at bottom */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800 mt-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 font-mono">Acción:</span>
                <select 
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 focus:border-emerald-500 outline-none text-zinc-700 dark:text-zinc-300"
                >
                  <option value="">Seleccionar acción...</option>
                  <option value="archive">Archivar seleccionados</option>
                  <option value="delete">Eliminar seleccionados</option>
                </select>
                <button
                  type="button"
                  onClick={handleBulkAction}
                  disabled={executingBulk || selectedIds.length === 0 || !bulkAction}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-3 py-1.5 font-bold cursor-pointer disabled:opacity-40 transition-colors shrink-0"
                >
                  {executingBulk ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Ir'}
                </button>
                <span className="text-[10px] text-zinc-500 font-mono ml-2">
                  seleccionados {selectedIds.length} de {projects.length}
                </span>
              </div>
              <div className="text-zinc-500 text-[10px] font-mono">
                Total: {projects.length} resultados
              </div>
            </div>
          </div>

          {/* Right Filters sidebar */}
          {isFilterOpen && (
            <div className="w-[260px] bg-[#121214] border border-zinc-800 rounded-xl p-4 space-y-5 text-left shrink-0 flex flex-col justify-between">
              <div className="space-y-5">
                {/* Header of Filter */}
                <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                  <span className="text-xs font-bold font-mono tracking-widest text-white">FILTRO</span>
                  <button 
                    onClick={() => setIsFilterOpen(false)}
                    className="p-1 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>

                {/* Filters selects */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono tracking-wider block">POR ETAPA (FASE)</label>
                    <select
                      value={filters.phase}
                      onChange={(e) => setFilters({...filters, phase: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 focus:border-emerald-500 outline-none"
                    >
                      <option value="todas">Todo</option>
                      <option value="Diseno">Diseño</option>
                      <option value="Permisos">Permisos</option>
                      <option value="Construccion">Construcción</option>
                      <option value="Operacion">Operación</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono tracking-wider block">POR ESTADO (STATUS)</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({...filters, status: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 focus:border-emerald-500 outline-none"
                    >
                      <option value="todos">Todo</option>
                      <option value="en_progreso">En Progreso</option>
                      <option value="completado">Completado</option>
                      <option value="demorado">Demorado</option>
                      <option value="archivado">Archivado</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono tracking-wider block">POR CLIENTE</label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 focus:border-emerald-500 outline-none"
                    >
                      <option value="">Todo</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Reset filter button */}
              <button
                onClick={() => {
                  setFilters({ status: 'todos', phase: 'todas', search: '' });
                  setSelectedClientId('');
                }}
                className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Limpiar Filtros
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
