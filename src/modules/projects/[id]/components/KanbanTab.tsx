'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { TaskRow } from '@/core/services/tasks';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import KanbanCard from './KanbanCard';
import { ProjectDetailContext } from '../hooks/useProjectDetail';

type Props = Pick<ProjectDetailContext,
  'filteredTasks' | 'getColumnTasks' | 'filterArea' | 'setFilterArea' |
  'filterPriority' | 'setFilterPriority' | 'filterAssignee' | 'setFilterAssignee' |
  'employees' | 'setIsCreateOpen' | 'onDragEnd' | 'handleToggleCheck' |
  'handleOpenTask' | 'handleEditTask' | 'handleDeleteTask' |
  'loadProjectTasks' | 'documentMap'
>;

const COLUMNS: { id: 'backlog' | 'pendiente' | 'en_progreso' | 'bloqueada' | 'completada'; label: string; borderColor: string }[] = [
  { id: 'backlog', label: 'Backlog', borderColor: 'border-t-zinc-600' },
  { id: 'pendiente', label: 'Por Hacer', borderColor: 'border-t-indigo-500' },
  { id: 'en_progreso', label: 'En Progreso', borderColor: 'border-t-purple-500' },
  { id: 'bloqueada', label: 'Bloqueada', borderColor: 'border-t-rose-500' },
  { id: 'completada', label: 'Hecha', borderColor: 'border-t-blue-500' },
];

export default function KanbanTab({
  getColumnTasks, filterArea, setFilterArea,
  filterPriority, setFilterPriority, filterAssignee, setFilterAssignee,
  employees, setIsCreateOpen, onDragEnd, handleToggleCheck,
  handleOpenTask, handleEditTask, handleDeleteTask,
  loadProjectTasks, documentMap
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-zinc-800 border border-zinc-700 p-4 rounded-none">
        <div>
          <h4 className="text-sm font-bold text-white">Tablero de Tareas de la Obra</h4>
          <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">Gestión visual del avance físico del proyecto.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-3 rounded-none flex items-center gap-1 cursor-pointer">
          <Plus className="h-4 w-4" /> Nueva Tarea
        </Button>
      </div>

      <div className="bg-zinc-800 border border-zinc-700 p-4 rounded-none flex flex-wrap items-center gap-3">
        <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider font-mono">Filtrar Tareas:</span>
        <select
          value={filterArea}
          onChange={e => setFilterArea(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded-none px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
        >
          <option value="todos">Departamento: Todos</option>
          <option value="general">General</option>
          <option value="legal">Legal</option>
          <option value="almacen">Almacén</option>
          <option value="operaciones">Operaciones</option>
          <option value="administracion">Administración</option>
        </select>

        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded-none px-3 py-1.5 text-xs text-zinc-300 focus:outline-none font-semibold"
        >
          <option value="todos">Prioridad: Todas</option>
          <option value="baja">Prioridad: Baja</option>
          <option value="media">Prioridad: Media</option>
          <option value="alta">Prioridad: Alta</option>
        </select>

        <select
          value={filterAssignee}
          onChange={e => setFilterAssignee(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded-none px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
        >
          <option value="todos">Asignado a: Todos</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.full_name}</option>
          ))}
        </select>

        {(filterArea !== 'todos' || filterPriority !== 'todos' || filterAssignee !== 'todos') && (
          <button
            onClick={() => {
              setFilterArea('todos');
              setFilterPriority('todos');
              setFilterAssignee('todos');
            }}
            className="text-[10px] text-rose-455 hover:text-rose-400 font-bold uppercase tracking-wider font-mono transition-colors ml-auto cursor-pointer"
          >
            Limpiar Filtros
          </button>
        )}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 overflow-x-auto min-w-0 pb-4 h-[650px] items-stretch">
          {COLUMNS.map(col => (
            <div key={col.id} className={`bg-[#1e1e24] border border-zinc-700 rounded-none flex flex-col min-h-0 h-full p-3.5 border-t-[3px] ${col.borderColor}`}>
              <div className="flex justify-between items-center mb-3 shrink-0 px-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">{col.label}</span>
                <span className="bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded-none text-[10px] font-bold font-mono border border-zinc-700">
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
                        onUploadSuccess={loadProjectTasks}
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
    </div>
  );
}
