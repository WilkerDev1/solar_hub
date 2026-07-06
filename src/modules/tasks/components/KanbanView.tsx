'use client';

import React from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import KanbanCard from '@/core/components/KanbanCard';
import { TaskRow } from '@/core/services/tasks';

interface KanbanViewProps {
  getColumnTasks: (status: 'backlog' | 'pendiente' | 'en_progreso' | 'bloqueada' | 'completada') => TaskRow[];
  onDragEnd: (result: any) => void;
  handleOpenTask: (task: TaskRow) => void;
  handleToggleCheck: (e: React.MouseEvent, task: TaskRow) => void;
  employees: any[];
  projects: any[];
  loadTasks: () => void;
  documentMap: Record<string, { name: string; mime_type: string }>;
  handleEditTask: (task: TaskRow) => void;
  handleDeleteTask: (task: TaskRow) => void;
}

export default function KanbanView({
  getColumnTasks,
  onDragEnd,
  handleOpenTask,
  handleToggleCheck,
  employees,
  projects,
  loadTasks,
  documentMap,
  handleEditTask,
  handleDeleteTask
}: KanbanViewProps) {

  const columns = [
    { id: 'backlog', label: 'Backlog', borderClass: 'border-t-zinc-650' },
    { id: 'pendiente', label: 'Por Hacer', borderClass: 'border-t-indigo-500' },
    { id: 'en_progreso', label: 'En Progreso', borderClass: 'border-t-purple-500' },
    { id: 'bloqueada', label: 'Bloqueada', borderClass: 'border-t-rose-500' },
    { id: 'completada', label: 'Hecha', borderClass: 'border-t-blue-500' }
  ] as const;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 h-full w-full scrollbar-thin scrollbar-thumb-zinc-800 items-stretch select-none">
        {columns.map(col => (
          <div key={col.id} className={`bg-[#1e1e24] border border-zinc-700 rounded-none flex flex-col min-h-0 h-full p-3.5 border-t-2 ${col.borderClass} w-[280px] md:w-[320px] shrink-0`}>
            <div className="flex justify-between items-center mb-3 shrink-0 px-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">{col.label}</span>
              <span className="bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded text-[10px] font-bold font-mono border border-zinc-700">
                {getColumnTasks(col.id).length}
              </span>
            </div>
            <Droppable droppableId={col.id}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex-1 overflow-y-auto space-y-3 pb-4 min-h-[150px] scrollbar-thin scrollbar-thumb-zinc-800 pr-1"
                >
                  {getColumnTasks(col.id).map((task, index) => (
                    <KanbanCard 
                      key={task.id} 
                      task={task} 
                      index={index} 
                      onClick={() => handleOpenTask(task)} 
                      handleToggleCheck={handleToggleCheck} 
                      employees={employees} 
                      projects={projects}
                      showProjectBadge={true}
                      showStatus={false}
                      onUploadSuccess={loadTasks} 
                      documentMap={documentMap} 
                      onEditClick={handleEditTask} 
                      onDeleteClick={handleDeleteTask} 
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
