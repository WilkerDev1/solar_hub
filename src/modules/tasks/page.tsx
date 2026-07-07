'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTasks } from './hooks/useTasks';
import TaskFilterSidebar from '@/core/components/TaskFilterSidebar';
import KanbanView from './components/KanbanView';
import ListView from './components/ListView';
import CalendarView from './components/CalendarView';
import KeepView from './components/KeepView';
import PlannerView from './components/PlannerView';
import CreateTaskModal from './components/CreateTaskModal';
import TaskDetailDrawer from '@/core/components/TaskDetailDrawer';
import { 
  ClipboardList, LayoutGrid, List, Calendar, StickyNote, Plus, Loader2, AlertCircle, SlidersHorizontal, CalendarRange
} from 'lucide-react';
import { Button } from '@/core/components/ui/button';

export default function TasksModule() {
  const t = useTasks();

  const scrollRef = useRef<HTMLDivElement>(null);

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
      className="flex h-[calc(100vh-5.5rem)] -m-6 overflow-hidden relative"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {/* Dimmed backdrop overlay when mobile sidebar is open */}
      {!t.sidebarCollapsed && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 z-45 transition-opacity duration-300"
          onClick={() => t.setSidebarCollapsed(true)}
        />
      )}

      {/* 1. Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#121315] overflow-hidden">
        {/* Top Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-700/60 pb-5 shrink-0 px-6 pt-6 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-emerald-400" />
              Consola Operativa de Tareas
            </h1>
            <p className="hidden md:block text-zinc-450 text-xs mt-1">
              Tablero interactivo de seguimiento, control de revisiones e historial de tareas del equipo.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* View Toggles */}
            <div className="bg-[#1e1e24] border border-zinc-700 p-0.5 rounded-xl flex">
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
                className={`hidden lg:flex p-2 rounded-lg text-xs font-bold transition-all items-center justify-center ${
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
                className={`hidden lg:flex p-2 rounded-lg text-xs font-bold transition-all items-center justify-center ${
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
              <button
                onClick={() => t.setViewMode('planner')}
                className={`hidden lg:flex p-2 rounded-lg text-xs font-bold transition-all items-center justify-center ${
                  t.viewMode === 'planner' 
                    ? 'bg-zinc-800 text-white shadow-inner' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Vista Planificador"
              >
                <CalendarRange className="h-4 w-4" />
              </button>
            </div>

            {/* If in Keep view, show keep-specific layout toggle */}
            {t.viewMode === 'keep' && (
              <button
                onClick={() => t.setKeepLayout(t.keepLayout === 'grid' ? 'list' : 'grid')}
                className="p-2 bg-[#1e1e24] border border-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all"
                title={t.keepLayout === 'grid' ? "Ver modo ampliado (Lista)" : "Ver modo galería (Cuadrícula)"}
              >
                {t.keepLayout === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
              </button>
            )}

            {/* Menu Button to toggle filters on Mobile */}
            <button
              onClick={() => t.setSidebarCollapsed(!t.sidebarCollapsed)}
              className="lg:hidden p-2 bg-[#1e1e24] border border-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all h-10 w-10 flex items-center justify-center shrink-0"
              title="Filtros"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>

            <Button onClick={() => t.setIsCreateOpen(true)} className="hidden lg:flex bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 px-4 rounded-xl">
              <Plus className="h-4 w-4 mr-1.5" /> Nueva Tarea
            </Button>
          </div>
        </div>

        {/* Dynamic Inner Viewport */}
        <div 
          ref={scrollRef}
          className={`flex-1 min-h-0 px-6 pb-6 pr-5 ${
            t.viewMode === 'kanban' 
              ? 'overflow-hidden' 
              : 'overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-900'
          }`}
        >
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
                  onQuickCreate={t.handleQuickCreate}
                />
              )}

              {t.viewMode === 'planner' && (
                <PlannerView
                  filteredTasks={t.filteredTasks}
                  employees={t.employees}
                  projects={t.projects}
                  documentMap={t.documentMap}
                  handleOpenTask={t.handleOpenTask}
                  handleToggleCheck={t.handleToggleCheck}
                  loadTasks={t.loadTasks}
                  handleEditTask={t.handleEditTask}
                  handleDeleteTask={t.handleDeleteTask}
                  user={t.user}
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

      {/* Mobile Floating Action Button (FAB) for New Task - Top Right */}
      <button
        onClick={() => t.setIsCreateOpen(true)}
        className="lg:hidden fixed top-20 right-4 z-40 bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-full shadow-2xl border border-emerald-500/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
        title="Nueva Tarea"
      >
        <Plus className="h-5.5 w-5.5" />
      </button>

      <TaskFilterSidebar
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
