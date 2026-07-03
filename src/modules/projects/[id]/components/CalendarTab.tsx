'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProjectDetailContext } from '../hooks/useProjectDetail';

type Props = Pick<ProjectDetailContext,
  'currentDate' | 'getCalendarDays' | 'nextMonth' | 'prevMonth' | 'getTasksForDate' |
  'setSelectedTask' | 'setIsTaskDrawerOpen'
>;

export default function CalendarTab({
  currentDate, getCalendarDays, nextMonth, prevMonth, getTasksForDate,
  setSelectedTask, setIsTaskDrawerOpen
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-zinc-800 border border-zinc-700 p-4 rounded-none">
        <h3 className="text-sm font-bold text-white capitalize">
          {currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="h-9 w-9 bg-zinc-900 border border-zinc-700 rounded-none flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-750 transition-colors">
            <ChevronLeft className="h-4.5 w-4.5" />
          </button>
          <button onClick={nextMonth} className="h-9 w-9 bg-zinc-900 border border-zinc-700 rounded-none flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-750 transition-colors">
            <ChevronRight className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
        <div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div><div>Dom</div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {getCalendarDays().map((day, idx) => {
          if (!day) return <div key={idx} className="bg-zinc-900/10 min-h-20 rounded-none border border-transparent" />;

          const dateTasks = getTasksForDate(day);
          const isToday = new Date().toDateString() === day.toDateString();

          return (
            <div
              key={idx}
              className={`min-h-20 bg-zinc-900 border p-2 rounded-none text-left flex flex-col justify-between hover:border-zinc-500 transition-colors ${
                isToday ? 'border-emerald-500 bg-emerald-500/5' : 'border-zinc-700'
              }`}
            >
              <span className={`text-[10px] font-bold font-mono ${isToday ? 'text-emerald-450' : 'text-zinc-500'}`}>
                {day.getDate()}
              </span>
              <div className="flex-1 mt-1 space-y-1 overflow-y-auto max-h-12 scrollbar-none">
                {dateTasks.map(t => (
                  <div
                    key={t.id}
                    onClick={() => { setSelectedTask(t); setIsTaskDrawerOpen(true); }}
                    className="bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 p-1 rounded-none text-[8px] font-bold text-zinc-300 truncate cursor-pointer flex items-center gap-1"
                  >
                    <span className={`h-1 rounded-full w-1 shrink-0 ${
                      t.status === 'completada' ? 'bg-emerald-450' :
                      t.status === 'en_progreso' ? 'bg-amber-450' : 'bg-rose-450'
                    }`} />
                    <span className="truncate">{t.title}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
