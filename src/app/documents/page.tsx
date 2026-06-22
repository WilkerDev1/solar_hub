import { Suspense } from 'react';
import DocumentsModule from '@/modules/documents/page';
import { DashboardShell } from '@/app/page';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Documentos — Solar Hub',
  description: 'Explorador de archivos y documentos de la empresa',
};

export default function DocumentsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
        <span className="text-zinc-400 text-sm font-medium">Cargando documentos...</span>
      </div>
    }>
      <DashboardShell defaultTab="documents">
        <DocumentsModule />
      </DashboardShell>
    </Suspense>
  );
}
