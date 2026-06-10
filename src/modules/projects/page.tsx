'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Folder, MapPin, Activity, CheckCircle2, ClipboardList, LayoutList, Loader2, AlertCircle } from 'lucide-react';
import { RequirePermission } from '@/core/auth/AuthContext';
import { supabase } from '@/core/database/supabase';

interface ProjectWithStats {
  id: string;
  client_id: string;
  name: string;
  location: string | null;
  capacity: string | null;
  phase: string;
  status: string;
  gps_coordinates: string | null;
  completedTasks: number;
  totalTasks: number;
  completedDeliverables: number;
  totalDeliverables: number;
}

export default function ProjectsModule() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch projects
      const { data: projData, error: projErr } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projErr) throw projErr;

      // Fetch all global tasks to count per project
      const { data: taskData, error: taskErr } = await supabase
        .from('global_tasks')
        .select('project_id, task_type, status');

      if (taskErr) throw taskErr;

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
    loadProjects();
  }, []);

  return (
    <div className="space-y-6 text-left">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Folder className="h-6 w-6 text-emerald-400" />
            Gestión de Proyectos Solares
          </h1>
          <p className="text-zinc-400 text-xs mt-1">Monitorea y edita las fases, entregables y documentación de obra.</p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
          <span className="text-zinc-500 text-sm font-medium">Cargando proyectos solares...</span>
        </div>
      ) : error ? (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl flex items-center space-x-3 text-sm">
          <AlertCircle className="h-5 w-5 text-rose-400" />
          <span>{error}</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 p-12 text-center rounded-2xl">
          <Folder className="h-10 w-10 text-zinc-650 mx-auto mb-3" />
          <h3 className="text-zinc-400 font-bold text-sm">Ningún proyecto registrado</h3>
          <p className="text-zinc-500 text-xs mt-1">Crea un proyecto asociándolo a un cliente en el CRM.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj) => (
            <div key={proj.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4 hover:border-zinc-750 transition-colors flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-2 min-w-0">
                    <Folder className="h-5 w-5 text-emerald-400 shrink-0" />
                    <h3 className="font-bold text-white truncate text-sm">{proj.name}</h3>
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    proj.status === 'completado' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/20' :
                    proj.status === 'en_progreso' ? 'bg-amber-950/50 text-amber-400 border border-amber-500/20' :
                    'bg-rose-950/50 text-rose-400 border border-rose-500/20'
                  }`}>
                    {proj.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-zinc-400 pt-2 border-t border-zinc-800/80">
                  <div className="flex justify-between">
                    <span className="font-mono text-zinc-500 text-[10px]">Ubicación:</span>
                    <span className="font-semibold text-zinc-350">{proj.location || 'N/D'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-zinc-500 text-[10px]">Capacidad:</span>
                    <span className="font-semibold text-zinc-350 font-mono">{proj.capacity || 'N/D'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-zinc-500 text-[10px]">Fase actual:</span>
                    <span className="font-semibold text-emerald-400">{proj.phase}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800/60 space-y-3">
                {/* Dynamic Deliverables Indicator */}
                <div className="flex items-center justify-between text-xs bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800">
                  <span className="text-zinc-500 font-mono text-[9px] uppercase">Hitos Entregables</span>
                  <span className="font-bold text-white font-mono text-xs">
                    {proj.completedDeliverables}/{proj.totalDeliverables} completados
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/?tab=tasks`)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl border border-zinc-750 transition-colors"
                    style={{ minHeight: '40px' }}
                  >
                    <LayoutList className="h-3.5 w-3.5 text-zinc-400" />
                    Tareas ({proj.completedTasks}/{proj.totalTasks})
                  </button>
                  <button
                    onClick={() => router.push(`/clients/${proj.client_id}`)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-zinc-800/40 hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-xl border border-zinc-750 transition-colors"
                    style={{ minHeight: '40px' }}
                  >
                    <ClipboardList className="h-3.5 w-3.5 text-zinc-400" />
                    Expediente
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
