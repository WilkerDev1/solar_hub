'use client';

import React from 'react';
import { 
  CheckSquare, Square, FileText 
} from 'lucide-react';
import { TaskRow } from '@/core/services/tasks';

interface ListViewProps {
  filteredTasks: TaskRow[];
  projects: any[];
  handleOpenTask: (task: TaskRow) => void;
  handleToggleCheck: (e: React.MouseEvent, task: TaskRow) => void;
}

export default function ListView({
  filteredTasks,
  projects,
  handleOpenTask,
  handleToggleCheck
}: ListViewProps) {

  return (
    <div className="bg-[#1e1e24] border border-zinc-700 rounded-2xl overflow-hidden shadow-xl">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-zinc-900/80 border-b border-zinc-700 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            <th className="px-6 py-4 w-12"></th>
            <th className="px-6 py-4">Tarea</th>
            <th className="px-6 py-4">Obra / Proyecto</th>
            <th className="px-6 py-4">Departamento</th>
            <th className="px-6 py-4">Vencimiento</th>
            <th className="px-6 py-4">Prioridad</th>
            <th className="px-6 py-4">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800 text-xs">
          {filteredTasks.map((task) => {
            const isCompleted = task.status === 'completada';
            const isDeliverable = ['entregable', 'reporte', 'evidencia'].includes(task.task_type);
            const taskProject = projects.find(p => p.id === task.project_id);

            return (
              <tr
                key={task.id}
                onClick={() => handleOpenTask(task)}
                className={`hover:bg-zinc-900/30 transition-colors cursor-pointer ${
                  isCompleted ? 'opacity-65' : ''
                }`}
              >
                <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                  {!isDeliverable ? (
                    <button
                      onClick={(e) => handleToggleCheck(e, task)}
                      className="text-zinc-550 dark:text-zinc-400 hover:text-emerald-400 transition-colors"
                    >
                      {isCompleted ? (
                        <CheckSquare className="h-4.5 w-4.5 text-emerald-400" />
                      ) : (
                        <Square className="h-4.5 w-4.5" />
                      )}
                    </button>
                  ) : (
                    <FileText className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className={`font-bold text-white text-sm ${isCompleted ? 'line-through text-zinc-550' : ''}`}>
                    {task.title}
                  </div>
                  {task.description && (
                    <div className="text-[10px] text-zinc-500 truncate max-w-xs mt-0.5">{task.description}</div>
                  )}
                </td>
                <td className="px-6 py-4 text-zinc-400 font-semibold">
                  {taskProject ? taskProject.name : 'Tarea Administrativa'}
                </td>
                <td className="px-6 py-4 text-zinc-400">
                  <span className="bg-zinc-900 border border-zinc-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                    {task.area}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono font-semibold text-zinc-350">
                  {(task as any).due_date ? new Date((task as any).due_date).toLocaleDateString([], { day: '2-digit', month: 'short' }) : 'N/D'}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    (task as any).priority === 'alta' ? 'bg-rose-500/10 text-rose-455 border border-rose-500/20' :
                    (task as any).priority === 'media' ? 'bg-amber-500/10 text-amber-455 border border-amber-500/20' :
                    'bg-zinc-800 text-zinc-400'
                  }`}>
                    {(task as any).priority || 'baja'}
                  </span>
                </td>
                <td className="px-6 py-4 font-semibold uppercase">
                  <span className={`${
                    task.status === 'completada' ? 'text-emerald-400' :
                    task.status === 'en_progreso' ? 'text-amber-400' : 'text-zinc-500'
                  }`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </td>
              </tr>
            );
          })}
          {filteredTasks.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center py-10 italic text-zinc-500">
                No hay tareas en esta vista.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
