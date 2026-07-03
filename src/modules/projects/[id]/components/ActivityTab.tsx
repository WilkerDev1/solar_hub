'use client';

import React from 'react';
import { ProjectDetailContext } from '../hooks/useProjectDetail';

type Props = Pick<ProjectDetailContext,
  'activityMemberFilter' | 'setActivityMemberFilter' | 'employees' | 'getProjectActivities'
>;

export default function ActivityTab({ activityMemberFilter, setActivityMemberFilter, employees, getProjectActivities }: Props) {
  const activities = getProjectActivities();

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900/30 border border-zinc-900 p-4 rounded-xl flex items-center gap-3">
        <span className="text-xs font-bold text-zinc-500">Filtrar por Miembro:</span>
        <select
          value={activityMemberFilter}
          onChange={e => setActivityMemberFilter(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
        >
          <option value="todos">Todos los miembros</option>
          {employees.map(e => (
            <option key={e.id} value={e.id}>{e.full_name}</option>
          ))}
        </select>
      </div>

      <div className="border border-zinc-900 rounded-xl divide-y divide-zinc-900 max-h-96 overflow-y-auto text-left">
        {activities.map((act) => (
          <div key={act.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-900/20">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-zinc-900 border border-zinc-800 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded text-zinc-400">
                  {act.action}
                </span>
                <span className="text-[10px] text-zinc-600 font-mono">
                  {new Date(act.created_at).toLocaleDateString([], { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-normal">{act.details}</p>
              <div className="text-[10px] text-zinc-500 font-medium">
                Tarea asociada: <strong className="text-zinc-400 font-bold">{act.taskTitle}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="h-6 w-6 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-[8px] font-bold text-zinc-350">
                {act.user_name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-zinc-450">{act.user_name}</span>
            </div>
          </div>
        ))}

        {activities.length === 0 && (
          <p className="text-center py-10 italic text-zinc-500 text-xs">No hay registros de actividades auditadas en esta obra.</p>
        )}
      </div>
    </div>
  );
}
