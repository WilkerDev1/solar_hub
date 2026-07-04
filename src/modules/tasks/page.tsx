'use client';

import React, { useEffect } from 'react';
import { useTasks } from './hooks/useTasks';
import TaskSidebar from './components/TaskSidebar';
import KanbanView from './components/KanbanView';
import ListView from './components/ListView';
import CalendarView from './components/CalendarView';
import KeepView from './components/KeepView';
import CreateTaskModal from './components/CreateTaskModal';
import TaskDetailDrawer from '@/core/components/TaskDetailDrawer';
import { 
  ClipboardList, LayoutGrid, List, Calendar, StickyNote, Plus, Loader2, AlertCircle
} from 'lucide-react';
import { Button } from '@/core/components/ui/button';

export default function TasksModule() {
  const t = useTasks();

  // Load friendly Keep-style font dynamically for testing
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;900&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <div 
      className="flex h-[calc(100vh-5.5rem)] -m-6 overflow-hidden"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {/* 1. Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0c0c0e] overflow-hidden p-6 space-y-6">
        {/* Top Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-emerald-400" />
              Consola Operativa de Tareas
            </h1>
            <p className="text-zinc-450 text-xs mt-1">
              Tablero interactivo de seguimiento, control de revisiones e historial de tareas del equipo.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* View Toggles */}
            <div className="bg-zinc-900 border border-zinc-800 p-0.5 rounded-xl flex">
              <button
                onClick={() => t.setViewMode('keep')}
                className={`p-2 rounded-lg text-xs font-bold transition-all ${
                  t.viewMode === 'keep' 
                    ? 'bg-zinc-800 text-white shadow-inner' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Vista Notas (Keep)"
              >
                <StickyNote className="h-4 w-4" />
              </button>
              <button
                onClick={() => t.setViewMode('kanban')}
                className={`p-2 rounded-lg text-xs font-bold transition-all ${
                  t.viewMode === 'kanban' 
                    ? 'bg-zinc-800 text-white shadow-inner' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Vista Tablero (Kanban)"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => t.setViewMode('list')}
                className={`p-2 rounded-lg text-xs font-bold transition-all ${
                  t.viewMode === 'list' 
                    ? 'bg-zinc-800 text-white shadow-inner' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Vista Lista"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => t.setViewMode('calendar')}
                className={`p-2 rounded-lg text-xs font-bold transition-all ${
                  t.viewMode === 'calendar' 
                    ? 'bg-zinc-800 text-white shadow-inner' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Vista Calendario"
              >
                <Calendar className="h-4 w-4" />
              </button>
            </div>

            {/* If in Keep view, show keep-specific layout toggle */}
            {t.viewMode === 'keep' && (
              <button
                onClick={() => t.setKeepLayout(t.keepLayout === 'grid' ? 'list' : 'grid')}
                className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all"
                title={t.keepLayout === 'grid' ? "Ver modo ampliado (Lista)" : "Ver modo galería (Cuadrícula)"}
              >
                {t.keepLayout === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
              </button>
            )}

            <Button onClick={() => t.setIsCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 px-4 rounded-xl">
              <Plus className="h-4 w-4 mr-1.5" /> Nueva Tarea
            </Button>
          </div>
        </div>

        {/* Dynamic Inner Viewport */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-1 scrollbar-thin scrollbar-thumb-zinc-900">
          {t.loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-zinc-900/10 border border-zinc-850 rounded-2xl">
              <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
              <span className="text-zinc-500 text-xs">Cargando tareas globales...</span>
            </div>
          ) : t.error ? (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-350 p-6 rounded-2xl flex items-center space-x-3 text-xs">
              <AlertCircle className="h-6 w-6 text-rose-455" />
              <span>{t.error}</span>
            </div>
          ) : (
            <>
              {t.viewMode === 'keep' && (
                <KeepView
                  filteredTasks={t.filteredTasks}
                  employees={t.employees}
                  projects={t.projects}
                  documentMap={t.documentMap}
                  keepLayout={t.keepLayout}
                  handleOpenTask={t.handleOpenTask}
                  handleToggleCheck={t.handleToggleCheck}
                  loadTasks={t.loadTasks}
                  handleEditTask={t.handleEditTask}
                  handleDeleteTask={t.handleDeleteTask}
                />
              )}

              {t.viewMode === 'kanban' && (
                <KanbanView
                  getColumnTasks={t.getColumnTasks}
                  onDragEnd={t.onDragEnd}
                  handleOpenTask={t.handleOpenTask}
                  handleToggleCheck={t.handleToggleCheck}
                  employees={t.employees}
                  projects={t.projects}
                  loadTasks={t.loadTasks}
                  documentMap={t.documentMap}
                  handleEditTask={t.handleEditTask}
                  handleDeleteTask={t.handleDeleteTask}
                />
              )}

              {t.viewMode === 'list' && (
                <ListView
                  filteredTasks={t.filteredTasks}
                  projects={t.projects}
                  handleOpenTask={t.handleOpenTask}
                  handleToggleCheck={t.handleToggleCheck}
                />
              )}

              {t.viewMode === 'calendar' && (
                <CalendarView
                  currentDate={t.currentDate}
                  getCalendarDays={t.getCalendarDays}
                  getTasksForDate={t.getTasksForDate}
                  handleOpenTask={t.handleOpenTask}
                  nextMonth={t.nextMonth}
                  prevMonth={t.prevMonth}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* 2. Right sidebar (Filtros) */}
      <TaskSidebar
        sidebarCollapsed={t.sidebarCollapsed}
        setSidebarCollapsed={t.setSidebarCollapsed}
        filterProject={t.filterProject}
        setFilterProject={t.setFilterProject}
        filterArea={t.filterArea}
        setFilterArea={t.setFilterArea}
        filterPriority={t.filterPriority}
        setFilterPriority={t.setFilterPriority}
        filterStatus={t.filterStatus}
        setFilterStatus={t.setFilterStatus}
        onlyMyTasks={t.onlyMyTasks}
        setOnlyMyTasks={t.setOnlyMyTasks}
        projects={t.projects}
      />

      {/* 3. Create Task Form Modal Dialog */}
      <CreateTaskModal
        isCreateOpen={t.isCreateOpen}
        setIsCreateOpen={t.setIsCreateOpen}
        createForm={t.createForm}
        setCreateForm={t.setCreateForm}
        employees={t.employees}
        projects={t.projects}
        handleCreateSubmit={t.handleCreateSubmit}
        user={t.user}
      />

      {/* 4. Task detail drawer */}
      <TaskDetailDrawer
        task={t.selectedTask}
        isOpen={t.isDrawerOpen}
        onClose={t.handleDrawerClose}
        employees={t.employees}
        user={t.user}
        projects={t.projects}
        onTaskUpdated={t.loadTasks}
        initialEditMode={t.drawerEditMode}
      />
    </div>
  );
}
