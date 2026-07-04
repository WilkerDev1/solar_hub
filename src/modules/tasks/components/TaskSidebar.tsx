'use client';

import React from 'react';
import { 
  ClipboardList, Package, Database, Tag, Shield, Cpu, Filter, ChevronLeft, ChevronRight 
} from 'lucide-react';

interface TaskSidebarProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  filterProject: string;
  setFilterProject: (val: string) => void;
  filterArea: string;
  setFilterArea: (val: string) => void;
  filterPriority: string;
  setFilterPriority: (val: string) => void;
  filterStatus: string;
  setFilterStatus: (val: string) => void;
  onlyMyTasks: boolean;
  setOnlyMyTasks: (val: boolean) => void;
  projects: any[];
}

export default function TaskSidebar({
  sidebarCollapsed,
  setSidebarCollapsed,
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
  projects
}: TaskSidebarProps) {

  const areas = [
    { id: 'todos', label: 'Todos los Deptos', icon: ClipboardList },
    { id: 'general', label: 'General', icon: Tag },
    { id: 'legal', label: 'Legal', icon: Shield },
    { id: 'almacen', label: 'Almacén', icon: Package },
    { id: 'operaciones', label: 'Operaciones', icon: Cpu },
    { id: 'administracion', label: 'Administración', icon: Database }
  ] as const;

  return (
    <aside 
      className={`border-l border-zinc-800 bg-[#121214]/95 lg:bg-[#121214]/65 transition-all duration-300 flex flex-col h-full shrink-0
        ${sidebarCollapsed 
          ? 'max-lg:hidden w-16' 
          : 'max-lg:fixed max-lg:top-0 max-lg:right-0 max-lg:h-full max-lg:z-50 max-lg:w-64 max-lg:shadow-2xl w-64'
        }
      `}
    >
      {/* Sidebar Header / Collapse toggle (reversing icons because it's now on the right side) */}
      <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
        {!sidebarCollapsed && (
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-450 flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-emerald-400" />
            Panel de Filtros
          </span>
        )}
        <button 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors mx-auto md:mx-0"
          title={sidebarCollapsed ? "Expandir Filtros" : "Colapsar Filtros"}
        >
          {sidebarCollapsed ? <ChevronLeft className="h-4.5 w-4.5" /> : <ChevronRight className="h-4.5 w-4.5" />}
        </button>
      </div>

      {/* Navigation list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5 select-none scrollbar-none">
        
        {/* SECTION: DEPARTMENTS */}
        <div className="space-y-1">
          {!sidebarCollapsed && (
            <span className="px-3 text-[9px] font-mono font-bold text-zinc-555 uppercase tracking-widest block mb-2">Departamentos</span>
          )}
          {areas.map(item => {
            const Icon = item.icon;
            const isActive = filterArea === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setFilterArea(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
                  isActive 
                    ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/20 shadow-inner' 
                    : 'bg-transparent text-zinc-400 border-transparent hover:bg-zinc-850 hover:text-zinc-200'
                } ${sidebarCollapsed ? 'justify-center' : 'justify-start'}`}
                title={item.label}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-455' : 'text-zinc-455'}`} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* SECTION: DETAILED FILTERS (Expanded only) */}
        {!sidebarCollapsed && (
          <div className="space-y-3.5 pt-4 border-t border-zinc-900">
            <span className="px-3 text-[9px] font-mono font-bold text-zinc-555 uppercase tracking-widest block">Otros Filtros</span>
            
            <div className="px-3 space-y-3">
              {/* Status Filter */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider">Estado</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/50 h-9 font-semibold"
                >
                  <option value="todos">Todos los Estados</option>
                  <option value="backlog">Backlog</option>
                  <option value="pendiente">Por Hacer</option>
                  <option value="en_progreso">En Progreso</option>
                  <option value="bloqueada">Bloqueada</option>
                  <option value="completada">Hecha</option>
                </select>
              </div>

              {/* Project Filter */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-555 uppercase tracking-wider">Obra / Proyecto</label>
                <select
                  value={filterProject}
                  onChange={e => setFilterProject(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/50 h-9 font-semibold"
                >
                  <option value="todos">Todas las Obras</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Priority Filter */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-555 uppercase tracking-wider">Prioridad</label>
                <select
                  value={filterPriority}
                  onChange={e => setFilterPriority(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/50 h-9 font-semibold"
                >
                  <option value="todos">Todas</option>
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
              </div>

              {/* Only My Tasks Toggle */}
              <div className="flex items-center gap-2 bg-zinc-950/40 border border-zinc-800 px-3 py-2 rounded-xl h-9">
                <input
                  type="checkbox"
                  id="sidebar-my-tasks-checkbox"
                  checked={onlyMyTasks}
                  onChange={e => setOnlyMyTasks(e.target.checked)}
                  className="rounded border-zinc-800 bg-zinc-900 text-emerald-600 focus:ring-emerald-500/20 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="sidebar-my-tasks-checkbox" className="text-xs font-bold text-zinc-455 cursor-pointer select-none">
                  Asignadas a mí
                </label>
              </div>
            </div>

          </div>
        )}

      </div>
    </aside>
  );
}
