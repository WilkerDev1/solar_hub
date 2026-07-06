'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, MapPin, Zap, CheckCircle, MessageSquare, Settings, Layers, SlidersHorizontal
} from 'lucide-react';
import { ProjectDetailContext } from '../hooks/useProjectDetail';

type Props = Pick<ProjectDetailContext,
  'project' | 'isAdmin' | 'isChatOpen' | 'setIsChatOpen' | 'setIsSettingsOpen' | 'activeTab' | 'setActiveTab' |
  'sidebarCollapsed' | 'setSidebarCollapsed'
>;

export default function ProjectHeader({ 
  project, isAdmin, isChatOpen, setIsChatOpen, setIsSettingsOpen, 
  activeTab, setActiveTab, sidebarCollapsed, setSidebarCollapsed 
}: Props) {
  const router = useRouter();

  return (
    <>
      {/* Header Breadcrumbs & Quick Banner Image */}
      <div className="flex items-center gap-3 border-b border-zinc-800 pb-5">
        <button
          onClick={() => router.push('/?tab=projects')}
          className="h-10 w-10 flex items-center justify-center rounded-none bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors shrink-0"
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
          {(activeTab === 'kanban' || activeTab === 'list') && setSidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`h-10 w-10 flex items-center justify-center rounded-none border transition-all ${
                !sidebarCollapsed
                  ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700'
              }`}
              title="Filtrar Tareas"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`h-10 w-10 flex items-center justify-center rounded-none border transition-all ${
              isChatOpen
                ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/20'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700'
            }`}
            title="Toggle Chat Sidebar"
          >
            <MessageSquare className="h-4 w-4" />
          </button>

          {isAdmin && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="h-10 w-10 flex items-center justify-center rounded-none bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
              title="Configuración de Obra"
            >
              <Settings className="h-4.5 w-4.5" />
            </button>
          )}
        </div>
      </div>

      {/* Header Metadata Quick Widgets - Only visible in overview tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-800 border border-zinc-700 p-4 rounded-none flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold text-zinc-450 uppercase tracking-wider font-mono">Fase Actual</span>
              <p className="text-sm font-bold text-emerald-400 mt-0.5">
                {project.phase === 'Diseno' ? 'Diseño' :
                 project.phase === 'Construccion' ? 'Construcción' :
                 project.phase === 'Operacion' ? 'Operación' : project.phase}
              </p>
            </div>
            <Layers className="h-4 w-4 text-emerald-400/60" />
          </div>

          <div className="bg-zinc-800 border border-zinc-700 p-4 rounded-none flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold text-zinc-450 uppercase tracking-wider font-mono">Ubicación GPS</span>
              <p className="text-xs font-mono font-bold text-white mt-0.5 select-all">{project.gps_coordinates || 'N/D'}</p>
            </div>
            <MapPin className="h-4 w-4 text-zinc-500" />
          </div>

          <div className="bg-zinc-800 border border-zinc-700 p-4 rounded-none flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold text-zinc-455 uppercase tracking-wider font-mono">Capacidad MWp</span>
              <p className="text-sm font-bold text-white mt-0.5">{project.capacity || 'N/D'}</p>
            </div>
            <Zap className="h-4 w-4 text-amber-500/60" />
          </div>

          <div className="bg-zinc-800 border border-zinc-700 p-4 rounded-none flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold text-zinc-455 uppercase tracking-wider font-mono">Estado General</span>
              <p className={`text-xs font-bold uppercase mt-0.5 ${
                project.status === 'completado' ? 'text-emerald-400' :
                project.status === 'en_progreso' ? 'text-amber-400' : 'text-rose-455'
              }`}>{project.status.replace('_', ' ')}</p>
            </div>
            <CheckCircle className="h-4 w-4 text-zinc-500" />
          </div>
        </div>
      )}

      {/* Tab Selection Row */}
      <div className="flex border-b border-zinc-700 pb-px overflow-x-auto gap-1">
        {(['overview', 'kanban', 'list', 'calendar', 'files', 'materials', 'activity'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-xs font-bold uppercase transition-colors border-b-2 whitespace-nowrap rounded-none ${
              activeTab === tab
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-zinc-550 hover:text-zinc-300 hover:bg-zinc-800/20'
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
    </>
  );
}
