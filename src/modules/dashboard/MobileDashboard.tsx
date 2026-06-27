'use client';

import React from 'react';
import { 
  CheckCircle, 
  Clock, 
  ClipboardList, 
  Package, 
  FolderKanban, 
  ArrowRight,
  Sun,
  ShieldAlert
} from 'lucide-react';

export default function MobileDashboard({ user, stats, myTasks, activities }: any) {
  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <header className="flex justify-between items-center bg-zinc-900/10 dark:bg-zinc-800/20 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-800 dark:text-zinc-50">
            Hola, {user?.fullName?.split(' ')[0] || 'Técnico'}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Plantas Solares Operativas
          </p>
        </div>
        <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
          {user?.fullName?.charAt(0).toUpperCase()}
        </div>
      </header>

      {/* Quick Metrics (Mobile 2x2 Grid) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center text-center">
          <CheckCircle className="h-6 w-6 text-emerald-500 mb-2" />
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider mb-1">Obras Activas</p>
          <p className="text-lg font-black text-zinc-800 dark:text-zinc-50">{stats.projectsCount}</p>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center text-center">
          <ClipboardList className="h-6 w-6 text-blue-500 mb-2" />
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider mb-1">Mis Tareas</p>
          <p className="text-lg font-black text-zinc-800 dark:text-zinc-50">{myTasks.length}</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center text-center">
          <Sun className="h-6 w-6 text-amber-500 mb-2" />
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider mb-1">KWh Hoy</p>
          <p className="text-lg font-black text-zinc-800 dark:text-zinc-50">{stats.generationToday}</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center text-center">
          <ShieldAlert className="h-6 w-6 text-rose-500 mb-2" />
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider mb-1">Stock Crítico</p>
          <p className="text-lg font-black text-zinc-800 dark:text-zinc-50">{stats.lowStockCount}</p>
        </div>
      </div>

      {/* Mis Tareas Destacadas (Card based for easy tap) */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center justify-between">
          Tareas Prioritarias
          <ArrowRight className="h-4 w-4 text-zinc-400" />
        </h2>
        
        {myTasks.slice(0, 3).length === 0 ? (
          <div className="text-center py-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">No hay tareas pendientes.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {myTasks.slice(0, 3).map((task: any) => (
              <div key={task.id} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 pr-2 leading-tight">{task.title}</h3>
                  <span className={`shrink-0 text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${
                    task.priority === 'alta' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                  }`}>
                    {task.priority}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs font-semibold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">{task.area}</span>
                  <span className="text-xs text-zinc-400">{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Sin fecha'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actividad Reciente */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center justify-between">
          Última Actividad
        </h2>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {activities.slice(0, 4).map((act: any) => (
              <div key={act.id} className="p-3.5 flex items-start space-x-3">
                <div className="shrink-0 p-2 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                  {act.type === 'inventory' ? <Package className="h-4 w-4 text-amber-500" /> : 
                   act.type === 'task' ? <ClipboardList className="h-4 w-4 text-blue-500" /> : 
                   act.type === 'project' ? <FolderKanban className="h-4 w-4 text-emerald-500" /> :
                   <Clock className="h-4 w-4 text-zinc-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{act.title}</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{act.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
