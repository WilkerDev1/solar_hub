import ClientProfileModule from '@/modules/clients/[id]/page';
import { DashboardShell } from '@/app/page';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientProfilePage({ params }: PageProps) {
  const { id } = await params;

  return (
    <DashboardShell defaultTab="clients">
      <ClientProfileModule clientId={id} />
    </DashboardShell>
  );
}
