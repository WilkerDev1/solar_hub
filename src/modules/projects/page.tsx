'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Folder, MapPin, Activity, CheckCircle2, ClipboardList, LayoutList, Loader2, AlertCircle, MoreVertical, Trash2, Archive, Search } from 'lucide-react';
import { getProjects, createProject, deleteProject, archiveProject, ProjectFilters } from '@/core/services/projects';
import { supabase } from '@/core/database/supabase';
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
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const [newProj, setNewProj] = useState({ client_id: '', name: '', phase: 'Diseño', capacity: '', location: '', status: 'en_progreso' });

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

      setProjects(mapped);
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
      setNewProj({ client_id: '', name: '', phase: 'Diseño', capacity: '', location: '', status: 'en_progreso' });
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
                      <option>Diseño</option>
                      <option>Permisos</option>
                      <option>Ingeniería</option>
                      <option>Construcción</option>
                      <option>Puesta en Marcha</option>
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
      <div className="flex flex-col md:flex-row gap-3 bg-white dark:bg-zinc-900/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800/80 transition-colors">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
          <input 
            type="text" 
            placeholder="Buscar proyecto por nombre..." 
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-800 dark:text-zinc-300 focus:border-emerald-500 focus:outline-none transition-colors"
          />
        </div>
        <select 
          value={filters.status}
          onChange={(e) => setFilters({...filters, status: e.target.value})}
          className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 focus:border-emerald-500 outline-none transition-colors"
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
          className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 focus:border-emerald-500 outline-none transition-colors"
        >
          <option value="todas">Todas las Fases</option>
          <option value="Diseño">Diseño</option>
          <option value="Permisos">Permisos</option>
          <option value="Ingeniería">Ingeniería</option>
          <option value="Construcción">Construcción</option>
          <option value="Puesta en Marcha">Puesta en Marcha</option>
        </select>
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
          <p className="text-zinc-500 text-xs mt-1">Modifica los filtros o crea un proyecto nuevo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj) => (
            <div key={proj.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between relative group shadow-md dark:shadow-lg">
              
              {/* Cover Banner Image */}
              <div className="relative h-32 w-full bg-zinc-100 dark:bg-zinc-950 overflow-hidden border-b border-zinc-200 dark:border-zinc-850 shrink-0 transition-colors">
                {proj.banner_url ? (
                  <img src={proj.banner_url} alt={proj.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-555 ease-in-out" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-100/10 dark:from-emerald-950/20 via-zinc-200/40 dark:via-zinc-900/60 to-zinc-100 dark:to-zinc-950 flex items-center justify-center">
                    <Folder className="h-10 w-10 text-zinc-400 dark:text-zinc-700 opacity-55" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-zinc-900 via-transparent to-transparent opacity-80" />
                
                {/* Status Badge overlays the image */}
                <div className="absolute bottom-3 left-4 flex gap-2">
                  <span className={`text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-md border backdrop-blur-xs ${
                    proj.status === 'completado' ? 'bg-emerald-50/80 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' :
                    proj.status === 'en_progreso' ? 'bg-amber-50/80 dark:bg-amber-950/70 text-amber-750 dark:text-amber-400 border-amber-200 dark:border-amber-500/20' :
                    proj.status === 'archivado' ? 'bg-zinc-100/90 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 border-zinc-250 dark:border-zinc-650' :
                    'bg-rose-50/80 dark:bg-rose-950/70 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
                  }`}>
                    {proj.status.replace('_', ' ')}
                  </span>
                </div>

                {/* KEBAB MENU PARA ADMIN OVERLAYS THE IMAGE */}
                <RequirePermission action="project:write">
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="p-1.5 rounded-lg bg-white/80 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 dark:hover:text-white dark:hover:bg-zinc-900 outline-none cursor-pointer">
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300">
                        <DropdownMenuItem onClick={() => handleArchive(proj.id)} className="hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                          <Archive className="h-4 w-4 mr-2" /> Archivar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-zinc-200 dark:bg-zinc-800" />
                        <DropdownMenuItem onClick={() => handleDelete(proj.id)} className="text-rose-600 dark:text-rose-400 focus:bg-rose-50 dark:focus:bg-rose-500/10 focus:text-rose-600 dark:focus:text-rose-450 cursor-pointer">
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
                      <Folder className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <h3 className="font-bold text-zinc-850 dark:text-white truncate text-sm hover:text-emerald-650 dark:hover:text-emerald-400 transition-colors cursor-pointer" onClick={() => router.push(`/projects/${proj.id}`)}>{proj.name}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <span className="text-[10px] text-zinc-550 dark:text-zinc-400 truncate font-semibold">Cliente: {proj.clients?.name || 'Sin Cliente'}</span>
                  </div>

                  <div className="space-y-2 text-xs text-zinc-500 dark:text-zinc-400 pt-3 border-t border-zinc-150 dark:border-zinc-800/80">
                    <div className="flex justify-between">
                      <span className="font-mono text-zinc-450 dark:text-zinc-550 text-[10px]">Ubicación:</span>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">{proj.location || 'N/D'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-zinc-450 dark:text-zinc-550 text-[10px]">Capacidad:</span>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300 font-mono">{proj.capacity || 'N/D'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-zinc-450 dark:text-zinc-550 text-[10px]">Fase actual:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{proj.phase}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-150 dark:border-zinc-800/60 space-y-3">
                  <div className="flex items-center justify-between text-xs bg-zinc-50 dark:bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850">
                    <span className="text-zinc-500 font-mono text-[9px] uppercase">Hitos Entregables</span>
                    <span className="font-bold text-zinc-805 dark:text-white font-mono text-xs">
                      {proj.completedDeliverables}/{proj.totalDeliverables} completados
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/projects/${proj.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 text-xs font-bold rounded-xl border border-zinc-250 dark:border-zinc-700 hover:border-zinc-350 dark:hover:border-zinc-650 transition-colors cursor-pointer"
                      style={{ minHeight: '40px' }}
                    >
                      <LayoutList className="h-3.5 w-3.5 text-zinc-550 dark:text-zinc-400" />
                      Detalles ({proj.completedTasks}/{proj.totalTasks})
                    </button>
                    <button
                      onClick={() => router.push(`/clients/${proj.client_id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-zinc-100/40 hover:bg-zinc-200/50 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 text-xs font-bold rounded-xl border border-zinc-250 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer"
                      style={{ minHeight: '40px' }}
                    >
                      <ClipboardList className="h-3.5 w-3.5 text-zinc-550 dark:text-zinc-400" />
                      Expediente
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
