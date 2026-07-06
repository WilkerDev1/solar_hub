'use client';

import React from 'react';
import KanbanCard from '@/core/components/KanbanCard';
import { TaskRow } from '@/core/services/tasks';

interface KeepViewProps {
  filteredTasks: TaskRow[];
  employees: any[];
  projects: any[];
  documentMap: Record<string, { name: string; mime_type: string }>;
  keepLayout: 'grid' | 'list';
  handleOpenTask: (task: TaskRow) => void;
  handleToggleCheck: (e: React.MouseEvent, task: TaskRow) => void;
  loadTasks: () => void;
  handleEditTask: (task: TaskRow) => void;
  handleDeleteTask: (task: TaskRow) => void;
}

export default function KeepView({
  filteredTasks,
  employees,
  projects,
  documentMap,
  keepLayout,
  handleOpenTask,
  handleToggleCheck,
  loadTasks,
  handleEditTask,
  handleDeleteTask
}: KeepViewProps) {

  // Columns layout responsive configuration
  const layoutClass = keepLayout === 'grid'
    ? 'columns-2 md:columns-3 lg:columns-4 gap-4 [column-fill:_balance] w-full'
    : 'columns-1 gap-4 max-w-3xl mx-auto w-full';

  return (
    <div className="w-full">
      {filteredTasks.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center bg-[#1e1e24] border border-zinc-700 rounded-2xl">
          <span className="text-zinc-550 italic text-xs">No hay tareas en esta vista.</span>
        </div>
      ) : (
        <div className={layoutClass}>
          {filteredTasks.map((task) => (
            <div key={task.id} className="break-inside-avoid mb-4">
              <KanbanCard
                task={task}
                index={-1} // Render as static card outside drag & drop context
                onClick={() => handleOpenTask(task)}
                handleToggleCheck={handleToggleCheck}
                employees={employees}
                projects={projects}
                showProjectBadge={true}
                showStatus={true} // Display status badge in Keep view
                onUploadSuccess={loadTasks}
                documentMap={documentMap}
                onEditClick={handleEditTask}
                onDeleteClick={handleDeleteTask}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
