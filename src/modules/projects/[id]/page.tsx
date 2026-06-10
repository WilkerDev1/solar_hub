'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Folder, 
  MapPin, 
  Zap, 
  Activity, 
  CheckCircle, 
  Clock, 
  Upload, 
  FileText, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';
import { supabase } from '@/core/database/supabase';
import { Button } from '@/core/components/ui/button';
import { DashboardShell } from '@/app/page';

interface ProjectDetail {
  id: string;
  name: string;
  location: string | null;
  capacity: string | null;
  phase: string;
  status: string;
  gps_coordinates: string | null;
  clients: {
    id: string;
    name: string;
  } | null;
}

export default function ProjectDetailModule({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string; date: string }[]>([
    { name: 'plano_distribucion_v1.pdf', size: '4.2 MB', date: '2026-06-09' }
  ]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const loadProjectDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchErr } = await supabase
          .from('projects')
          .select(`
            *,
            clients (
              id,
              name
            )
          `)
          .eq('id', projectId)
          .single();

        if (fetchErr) throw fetchErr;
        setProject(data as any);
      } catch (err: any) {
        console.error('Error loading project details:', err);
        setError(err.message || 'Proyecto no encontrado.');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      loadProjectDetail();
    }
  }, [projectId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploading(true);
      const file = e.target.files[0];
      setTimeout(() => {
        setUploadedFiles([
          ...uploadedFiles,
          { 
            name: file.name, 
            size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`, 
            date: new Date().toISOString().split('T')[0] 
          }
        ]);
        setUploading(false);
        alert(`Archivo "${file.name}" cargado exitosamente como evidencia de entregable.`);
      }, 1500);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
        <span className="text-zinc-500 text-sm font-medium">Cargando detalles del proyecto...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-6 rounded-xl flex items-center space-x-3 text-sm max-w-lg mx-auto mt-12">
        <AlertCircle className="h-6 w-6 text-rose-400" />
        <span>{error || 'Proyecto no encontrado.'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-800 pb-5">
        <button
          onClick={() => router.push('/?tab=projects')}
          className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors shrink-0"
          style={{ minHeight: '40px', minWidth: '40px' }}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">{project.name}</h1>
          <p className="text-zinc-400 text-xs mt-0.5">
            Fase: <strong className="text-emerald-400">{project.phase}</strong> • Cliente: <strong className="text-white">{project.clients?.name || 'N/D'}</strong>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Technical Profile Card */}
        <div className="lg:col-span-1 bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2 pb-3 border-b border-zinc-800/60">
            <Folder className="h-4 w-4 text-emerald-400" />
            Atributos Técnicos
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-zinc-850/40">
              <span className="text-zinc-500 uppercase font-mono text-[9px]">Capacidad contratada</span>
              <span className="font-bold text-zinc-300 font-mono">{project.capacity || 'N/D'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-850/40">
              <span className="text-zinc-500 uppercase font-mono text-[9px]">Ubicación física</span>
              <span className="font-bold text-zinc-300 text-right">{project.location || 'N/D'}</span>
            </div>
            {project.gps_coordinates && (
              <div className="flex justify-between py-1 border-b border-zinc-850/40">
                <span className="text-zinc-500 uppercase font-mono text-[9px]">Coordenadas GPS</span>
                <span className="font-bold text-amber-400 font-mono">{project.gps_coordinates}</span>
              </div>
            )}
            <div className="flex justify-between py-1">
              <span className="text-zinc-500 uppercase font-mono text-[9px]">Estado Operativo</span>
              <span className={`font-bold uppercase ${
                project.status === 'completado' ? 'text-emerald-400' :
                project.status === 'en_progreso' ? 'text-amber-400' : 'text-rose-400'
              }`}>{project.status.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        {/* Evidence Dropzone & Files Checklist */}
        <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl space-y-6">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              <Upload className="h-4 w-4 text-emerald-400" />
              Subida de Evidencia y Entregables
            </h3>
            <p className="text-zinc-400 text-xs mt-1">
              Carga planos unifilares, certificados y actas firmadas para la auditoría inmutable de la obra.
            </p>
          </div>

          {/* Interactive Mock Dropzone */}
          <div className="border-2 border-dashed border-zinc-800 hover:border-emerald-500/40 rounded-xl p-8 text-center bg-zinc-950/20 transition-colors relative">
            <input 
              type="file" 
              onChange={handleFileUpload} 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              disabled={uploading}
            />
            {uploading ? (
              <div className="space-y-2">
                <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mx-auto" />
                <p className="text-xs text-zinc-400">Subiendo archivo de evidencia...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 text-zinc-650 mx-auto" />
                <p className="text-xs text-zinc-300 font-semibold">Seleccionar archivo o arrastrar aquí</p>
                <p className="text-[10px] text-zinc-500">PDF, PNG, JPG hasta 10 MB</p>
              </div>
            )}
          </div>

          {/* Uploaded files listing */}
          <div className="space-y-3">
            <span className="text-zinc-500 text-xs font-mono uppercase tracking-wider block">Archivos Cargados ({uploadedFiles.length})</span>
            
            <div className="space-y-2">
              {uploadedFiles.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-zinc-950/60 border border-zinc-850 rounded-xl">
                  <div className="flex items-center space-x-3 min-w-0">
                    <FileText className="h-5 w-5 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-white truncate">{f.name}</span>
                      <span className="block text-[9px] text-zinc-500 mt-0.5 font-mono">{f.size} • {f.date}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-500/10">
                    Verificado
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
