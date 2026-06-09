'use client';

import React, { useState } from 'react';
import { Plus, Folder, LayoutGrid, Calendar, ClipboardList } from 'lucide-react';
import { RequirePermission } from '@/core/auth/AuthContext';

interface Project {
  id: string;
  name: string;
  location: string;
  capacity: string;
  phase: 'Diseno' | 'Permisos' | 'Construccion' | 'Operacion';
  status: 'completado' | 'en_progreso' | 'demorado';
}

export default function ProjectsModule() {
  const [projects] = useState<Project[]>([
    { id: '1', name: 'Planta Solar Copiapó 100MW', location: 'Copiapó, Chile', capacity: '100 MWp', phase: 'Construccion', status: 'en_progreso' },
    { id: '2', name: 'Techo Industrial Solar Santiago', location: 'Maipú, Santiago', capacity: '2.5 MWp', phase: 'Permisos', status: 'en_progreso' },
    { id: '3', name: 'Parque Solar Antofagasta', location: 'Antofagasta, Chile', capacity: '150 MWp', phase: 'Diseno', status: 'demorado' },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Gestión de Proyectos</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Monitorea y edita las fases, entregables y documentación de obra.</p>
        </div>
        <RequirePermission action="project:create">
          <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors">
            <Plus className="h-4 w-4" />
            Nuevo Proyecto
          </button>
        </RequirePermission>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {projects.map((proj) => (
          <div key={proj.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-2">
                <Folder className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-zinc-900 dark:text-zinc-50">{proj.name}</h3>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                proj.status === 'en_progreso' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' :
                proj.status === 'demorado' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300' :
                'bg-emerald-100 text-emerald-800'
              }`}>
                {proj.status.replace('_', ' ')}
              </span>
            </div>

            <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <div className="flex justify-between">
                <span>Ubicación:</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{proj.location}</span>
              </div>
              <div className="flex justify-between">
                <span>Capacidad:</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{proj.capacity}</span>
              </div>
              <div className="flex justify-between">
                <span>Fase actual:</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">{proj.phase}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between gap-2">
              <button className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                <LayoutGrid className="h-3.5 w-3.5" />
                Planos
              </button>
              <button className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                <ClipboardList className="h-3.5 w-3.5" />
                Hitos
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
