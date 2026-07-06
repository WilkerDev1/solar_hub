'use client';

import React from 'react';
import { Plus, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { ProjectDetailContext } from '../hooks/useProjectDetail';

type Props = Pick<ProjectDetailContext,
  'filteredTasks' | 'setIsCreateOpen' | 'handleToggleCheck' |
  'setSelectedTask' | 'setIsTaskDrawerOpen'
>;

export default function ListTab({
  filteredTasks, setIsCreateOpen, handleToggleCheck,
  setSelectedTask, setIsTaskDrawerOpen
}: Props) {
  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="flex justify-between items-center bg-zinc-800 border border-zinc-700 p-4 rounded-none">
        <div>
          <h4 className="text-sm font-bold text-white">Listado de Tareas de la Obra</h4>
          <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">Vista tabular y filtros detallados por departamento y prioridad.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-3 rounded-none flex items-center gap-1 cursor-pointer">
          <Plus className="h-4 w-4" /> Nueva Tarea
        </Button>
      </div>

      {/* Table Container */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-none overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-zinc-900/60 border-b border-zinc-700 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              <th className="px-6 py-4 w-12"></th>
              <th className="px-6 py-4">Tarea</th>
              <th className="px-6 py-4">Departamento</th>
              <th className="px-6 py-4">Vencimiento</th>
              <th className="px-6 py-4">Prioridad</th>
              <th className="px-6 py-4">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-700">
            {filteredTasks.map(task => {
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
                      <button
                        onClick={(e) => handleToggleCheck(e, task)}
                        className="text-zinc-500 hover:text-emerald-450 transition-colors"
                      >
                        {isCompleted ? (
                          <CheckSquare className="h-4.5 w-4.5 text-emerald-400" />
                        ) : (
                          <Square className="h-4.5 w-4.5" />
                        )}
                      </button>
                    ) : null}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-bold text-white ${isCompleted ? 'line-through text-zinc-500' : ''}`}>{task.title}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-zinc-900 border border-zinc-700 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-none text-zinc-400">{task.area || 'general'}</span>
                  </td>
                  <td className="px-6 py-4 text-zinc-400 font-mono text-[11px]">
                    {(task as any).due_date ? new Date((task as any).due_date).toLocaleDateString() : 'N/D'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-none ${
                      (task as any).priority === 'alta' ? 'bg-rose-500/20 text-rose-455 border border-rose-500/30' :
                      (task as any).priority === 'media' ? 'bg-amber-500/20 text-amber-455 border border-amber-500/30' :
                      'bg-zinc-900 text-zinc-400 border border-zinc-700'
                    }`}>{(task as any).priority || 'baja'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-none ${
                      task.status === 'completada' ? 'bg-emerald-500/15 text-emerald-400' :
                      task.status === 'en_progreso' ? 'bg-purple-500/15 text-purple-400' :
                      task.status === 'bloqueada' ? 'bg-rose-500/15 text-rose-455' :
                      'bg-zinc-900 text-zinc-400'
                    }`}>{task.status.replace('_', ' ')}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
