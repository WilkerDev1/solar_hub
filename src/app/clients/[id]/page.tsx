import { Suspense } from 'react';
import ClientProfileModule from '@/modules/clients/[id]/page';
import { DashboardShell } from '@/app/page';

export function generateStaticParams() { return [{ id: '1' }]; }

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientProfilePage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-4">
        <span className="text-zinc-400 text-sm font-medium">Cargando cliente...</span>
      </div>
    }>
      <DashboardShell defaultTab="clients">
        <ClientProfileModule clientId={id} />
      </DashboardShell>
    </Suspense>
  );
}
