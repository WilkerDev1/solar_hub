'use client';

import React from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar, Clock 
} from 'lucide-react';
import { TaskRow } from '@/core/services/tasks';

interface CalendarViewProps {
  currentDate: Date;
  getCalendarDays: () => (Date | null)[];
  getTasksForDate: (date: Date) => TaskRow[];
  handleOpenTask: (task: TaskRow) => void;
  nextMonth: () => void;
  prevMonth: () => void;
}

export default function CalendarView({
  currentDate,
  getCalendarDays,
  getTasksForDate,
  handleOpenTask,
  nextMonth,
  prevMonth
}: CalendarViewProps) {

  return (
    <div className="bg-zinc-900/10 border border-zinc-850 rounded-2xl p-5 shadow-xl">
      {/* Calendar Navigator Header */}
      <div className="flex justify-between items-center mb-6 px-1">
        <h3 className="font-bold text-white uppercase tracking-wider text-sm font-mono">
          {currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="h-9 w-9 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
            <ChevronLeft className="h-4.5 w-4.5" />
          </button>
          <button onClick={nextMonth} className="h-9 w-9 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
            <ChevronRight className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* Day header grid */}
      <div className="grid grid-cols-7 gap-2.5 mb-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
        <div>Lun</div>
        <div>Mar</div>
        <div>Mié</div>
        <div>Jue</div>
        <div>Vie</div>
        <div>Sáb</div>
        <div>Dom</div>
      </div>

      {/* Month days grid */}
      <div className="grid grid-cols-7 gap-2.5">
        {getCalendarDays().map((day, idx) => {
          if (!day) return <div key={idx} className="bg-zinc-900/5 border border-transparent min-h-24 rounded-xl" />;
          
          const dateTasks = getTasksForDate(day);
          const isToday = new Date().toDateString() === day.toDateString();

          return (
            <div
              key={idx}
              className={`min-h-24 bg-zinc-900/20 border p-2 rounded-xl text-left flex flex-col justify-between hover:border-zinc-700 transition-colors ${
                isToday ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-zinc-900'
              }`}
            >
              <span className={`text-[11px] font-bold font-mono ${isToday ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {day.getDate()}
              </span>
              <div className="flex-1 mt-1.5 space-y-1 overflow-y-auto max-h-16 scrollbar-none">
                {dateTasks.map(t => (
                  <div
                    key={t.id}
                    onClick={() => handleOpenTask(t)}
                    className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 p-1 rounded-md text-[9px] font-bold text-zinc-200 truncate cursor-pointer hover:text-white transition-colors flex items-center gap-1"
                  >
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                      t.status === 'completada' ? 'bg-emerald-400' :
                      t.status === 'en_progreso' ? 'bg-amber-400' : 'bg-rose-455'
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
