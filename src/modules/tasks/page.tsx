'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/core/auth/AuthContext';
import { 
  getTasks, 
  updateTaskStatus, 
  TaskRow 
} from '@/core/services/tasks';
import { 
  ClipboardList, 
  CheckSquare, 
  Square, 
  ExternalLink, 
  Loader2, 
  AlertCircle,
  FolderKanban,
  Building,
  Package,
  Database
} from 'lucide-react';
import { Button } from '@/core/components/ui/button';

export default function TasksModule() {
  const router = useRouter();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Active Filter Tab (all or by origin)
  const [activeFilter, setActiveFilter] = useState<'todos' | 'proyecto' | 'almacen' | 'administracion'>('todos');

  const loadTasks = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch tasks assigned to the logged-in user
      const data = await getTasks({ assignedTo: user.id });
      setTasks(data);
    } catch (err: any) {
      console.error('Error fetching assigned tasks:', err);
      setError(err.message || 'Error al cargar tus tareas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [user]);

  const handleToggleCheck = async (task: TaskRow) => {
    const nextStatus = task.status === 'completada' ? 'pendiente' : 'completada';
    
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));

    try {
      await updateTaskStatus(task.id, nextStatus);
    } catch (err: any) {
      // Revert on error
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t));
      alert('Error al actualizar tarea: ' + err.message);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (activeFilter === 'todos') return true;
    return t.origin === activeFilter;
  });

  const getOriginIcon = (origin: string) => {
    switch (origin) {
      case 'proyecto':
        return <FolderKanban className="h-4 w-4 text-emerald-400" />;
      case 'almacen':
        return <Package className="h-4 w-4 text-blue-400" />;
      case 'administracion':
        return <Database className="h-4 w-4 text-purple-400" />;
      default:
        return <ClipboardList className="h-4 w-4 text-zinc-400" />;
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-5">
        <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-emerald-400" />
          Mis Tareas Asignadas
        </h1>
        <p className="text-zinc-400 text-xs mt-1">
          Lista operativa de tareas personales clasificadas por procedencia de origen.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-zinc-850 pb-2 gap-2 overflow-x-auto">
        {(['todos', 'proyecto', 'almacen', 'administracion'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all uppercase whitespace-nowrap ${
              activeFilter === tab
                ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/20'
                : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-350'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
          <span className="text-zinc-500 text-sm font-medium">Obteniendo tus tareas...</span>
        </div>
      ) : error ? (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl flex items-center space-x-3 text-sm">
          <AlertCircle className="h-5 w-5 text-rose-400" />
          <span>{error}</span>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-850 p-12 text-center rounded-xl">
          <ClipboardList className="h-10 w-10 text-zinc-650 mx-auto mb-3" />
          <h3 className="text-zinc-400 font-bold text-sm">No tienes tareas pendientes</h3>
          <p className="text-zinc-500 text-xs mt-1">Buen trabajo. Has completado todas tus asignaciones.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => {
            const isCompleted = task.status === 'completada';
            const isDeliverable = ['entregable', 'reporte', 'evidencia'].includes(task.task_type);

            return (
              <div 
                key={task.id} 
                className={`bg-zinc-900 border border-zinc-800 rounded-xl p-5 transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-4 ${
                  isCompleted ? 'border-zinc-850/60 opacity-60' : 'hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Action trigger for checks */}
                  {!isDeliverable ? (
                    <button
                      onClick={() => handleToggleCheck(task)}
                      className="mt-0.5 text-zinc-400 hover:text-emerald-400 transition-colors shrink-0"
                      aria-label={isCompleted ? 'Marcar como pendiente' : 'Marcar como completada'}
                    >
                      {isCompleted ? (
                        <CheckSquare className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </button>
                  ) : (
                    <div className="mt-0.5 shrink-0 text-emerald-500">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{task.title}</span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-zinc-800 border border-zinc-750`}>
                        {getOriginIcon(task.origin)}
                        <span className="ml-0.5 text-[8px] font-mono text-zinc-400">{task.origin}</span>
                      </span>
                    </div>
                    {task.description && (
                      <p className={`text-xs ${isCompleted ? 'line-through text-zinc-500' : 'text-zinc-400'}`}>
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Tactical Action button for deliverables */}
                {isDeliverable && task.project_id && (
                  <Button
                    onClick={() => router.push(`/projects/${task.project_id}`)}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs"
                    style={{ minHeight: '48px', paddingLeft: '1.25rem', paddingRight: '1.25rem' }}
                  >
                    <span>Ir al Proyecto</span>
                    <ExternalLink className="h-4 w-4 shrink-0" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
