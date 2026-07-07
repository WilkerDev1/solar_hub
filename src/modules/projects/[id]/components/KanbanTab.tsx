'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import KanbanBoard from '@/core/components/KanbanBoard';
import { ProjectDetailContext } from '../hooks/useProjectDetail';

type Props = Pick<ProjectDetailContext,
  'getColumnTasks' | 'employees' | 'setIsCreateOpen' | 'onDragEnd' | 'handleToggleCheck' |
  'handleOpenTask' | 'handleEditTask' | 'handleDeleteTask' |
  'loadProjectTasks' | 'documentMap' | 'handleQuickCreate'
>;

export default function KanbanTab({
  getColumnTasks, employees, setIsCreateOpen, onDragEnd, handleToggleCheck,
  handleOpenTask, handleEditTask, handleDeleteTask,
  loadProjectTasks, documentMap, handleQuickCreate
}: Props) {
  return (
    <div className="space-y-4 flex flex-col h-full min-h-0">
      {/* Header Card */}
      <div className="flex justify-between items-center bg-zinc-800 border border-zinc-700 p-4 rounded-none shrink-0">
        <div>
          <h4 className="text-sm font-bold text-white">Tablero de Tareas de la Obra</h4>
          <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">Gestión visual del avance físico del proyecto.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-3 rounded-none flex items-center gap-1 cursor-pointer">
          <Plus className="h-4 w-4" /> Nueva Tarea
        </Button>
      </div>

      {/* Board Container */}
      <div className="flex-1 min-h-0 h-[650px] overflow-hidden">
        <KanbanBoard
          getColumnTasks={getColumnTasks}
          onDragEnd={onDragEnd}
          handleOpenTask={handleOpenTask}
          handleToggleCheck={handleToggleCheck}
          employees={employees}
          loadTasks={loadProjectTasks}
          documentMap={documentMap}
          handleEditTask={handleEditTask}
          handleDeleteTask={handleDeleteTask}
          showProjectBadge={false}
          onQuickCreate={handleQuickCreate}
        />
      </div>
    </div>
  );
}
