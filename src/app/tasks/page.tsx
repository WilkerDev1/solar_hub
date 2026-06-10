import { Suspense } from 'react';
import TasksModule from '@/modules/tasks/page';
import { DashboardShell } from '@/app/page';

export default function TasksPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-4">
        <span className="text-zinc-400 text-sm font-medium">Cargando tareas...</span>
      </div>
    }>
      <DashboardShell defaultTab="tasks">
        <TasksModule />
      </DashboardShell>
    </Suspense>
  );
}
