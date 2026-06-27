import { Suspense } from 'react';
import ProjectDetailModule from '@/modules/projects/[id]/page';
import { DashboardShell } from '@/app/page';

export function generateStaticParams() { return [{ id: '1' }]; }

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-4">
        <span className="text-zinc-400 text-sm font-medium">Cargando proyecto...</span>
      </div>
    }>
      <DashboardShell defaultTab="projects">
        <ProjectDetailModule projectId={id} />
      </DashboardShell>
    </Suspense>
  );
}
