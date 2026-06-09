'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getClientProfile, 
  ClientProfile, 
  ProjectRow 
} from '@/core/services/clients';
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  Activity, 
  Compass, 
  LayoutGrid, 
  Folder,
  Calendar,
  AlertTriangle,
  Loader2,
  Sparkles
} from 'lucide-react';
import { Button } from '@/core/components/ui/button';

interface ClientProfileModuleProps {
  clientId: string;
}

export default function ClientProfileModule({ clientId }: ClientProfileModuleProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getClientProfile(clientId);
        setProfile(data);
      } catch (err: any) {
        console.error('Error fetching client profile:', err);
        setError(err.message || 'Error al cargar el expediente del cliente.');
      } finally {
        setLoading(false);
      }
    };

    if (clientId) {
      fetchProfile();
    }
  }, [clientId]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
        <span className="text-zinc-500 text-sm font-medium">Buscando expediente relacional...</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 p-8 text-center rounded-2xl max-w-md mx-auto mt-12">
        <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto mb-4" />
        <h3 className="text-white font-bold text-lg">Error de Carga</h3>
        <p className="text-zinc-400 text-sm mt-2">{error || 'El cliente no existe o está inaccesible.'}</p>
        <Button 
          onClick={() => router.push('/?tab=clients')}
          className="mt-6 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl"
        >
          Volver a Clientes
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link & Actions header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/?tab=clients')}
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            style={{ minHeight: '40px', minWidth: '40px' }}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest">[EXPEDIENTE]</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                profile.status === 'activo' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/20' :
                profile.status === 'prospecto' ? 'bg-amber-950/50 text-amber-400 border border-amber-500/20' :
                'bg-zinc-800 text-zinc-400 border border-zinc-750'
              }`}>
                {profile.status}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide mt-1">{profile.name}</h1>
          </div>
        </div>
      </div>

      {/* Technical profile grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card of base metadata */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-5 rounded-2xl md:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2 pb-3 border-b border-zinc-800/60">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            Metadatos Técnicos
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <span className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Identificación Fiscal</span>
              <span className="block font-semibold text-white font-mono">{profile.document_id}</span>
            </div>
            <div className="space-y-1">
              <span className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Categoría</span>
              <span className="block font-semibold text-emerald-400">{profile.category}</span>
            </div>
            <div className="space-y-1">
              <span className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Consumo Promedio Mensual</span>
              <span className="block font-bold text-white text-base">
                {profile.avg_kwh_consumption?.toLocaleString() || 0} <span className="text-xs text-zinc-400 font-normal">kWh/mes</span>
              </span>
            </div>
            <div className="space-y-1">
              <span className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Teléfono</span>
              <span className="block font-semibold text-zinc-300 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-zinc-500" />
                {profile.phone || 'N/D'}
              </span>
            </div>
          </div>

          <div className="space-y-1 pt-2 border-t border-zinc-850">
            <span className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Dirección Física</span>
            <span className="block text-xs text-zinc-300 flex items-start gap-1.5">
              <MapPin className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
              {profile.address || 'Sin dirección registrada'}
            </span>
          </div>
        </div>

        {/* GPS Location Panel */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2 pb-3 border-b border-zinc-800/60">
              <Compass className="h-4 w-4 text-amber-500" />
              Ubicación GPS Campo
            </h3>
            <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
              Coordenadas de geolocalización registradas para el replanteo y montaje de paneles solares.
            </p>
            <div className="mt-4 bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-850 font-mono text-xs text-center text-white">
              {profile.gps_coordinates || 'Sin coordenadas GPS'}
            </div>
          </div>

          {profile.gps_coordinates && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.gps_coordinates)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-800 hover:bg-amber-600 hover:text-white text-zinc-300 text-xs font-bold rounded-xl transition-all duration-200 border border-zinc-750"
              style={{ minHeight: '48px' }}
            >
              <MapPin className="h-4 w-4 shrink-0" />
              <span>Ver en Google Maps</span>
            </a>
          )}
        </div>
      </div>

      {/* Associated Projects Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
          <Folder className="h-5 w-5 text-emerald-400" />
          Proyectos Solares Asociados
        </h2>

        {profile.projects.length === 0 ? (
          <div className="bg-zinc-900/40 border border-zinc-850 p-12 text-center rounded-xl">
            <LayoutGrid className="h-10 w-10 text-zinc-650 mx-auto mb-3" />
            <h3 className="text-zinc-400 font-bold text-sm">Ningún proyecto contratado</h3>
            <p className="text-zinc-500 text-xs mt-1">Este cliente actualmente no cuenta con proyectos solares registrados en el tenant.</p>
          </div>
        ) : (
          <>
            {/* PC Desktop View: Projects Grid-Table */}
            <div className="hidden md:block overflow-hidden bg-zinc-900 border border-zinc-850 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-950 border-b border-zinc-850 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                    <th className="p-4">Proyecto</th>
                    <th className="p-4">Ubicación</th>
                    <th className="p-4">Capacidad</th>
                    <th className="p-4">Fase</th>
                    <th className="p-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-sm text-zinc-300">
                  {profile.projects.map((proj) => (
                    <tr key={proj.id} className="hover:bg-zinc-850/20 transition-colors">
                      <td className="p-4 font-bold text-white">{proj.name}</td>
                      <td className="p-4 text-xs text-zinc-400">{proj.location || 'N/D'}</td>
                      <td className="p-4 text-xs font-mono text-zinc-300">{proj.capacity || 'N/D'}</td>
                      <td className="p-4 text-xs font-semibold text-emerald-400">{proj.phase}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          proj.status === 'completado' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/20' :
                          proj.status === 'en_progreso' ? 'bg-amber-950/50 text-amber-400 border border-amber-500/20' :
                          'bg-rose-950/50 text-rose-400 border border-rose-500/20'
                        }`}>
                          {proj.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View: Projects Cards */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {profile.projects.map((proj) => (
                <div key={proj.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-white text-sm truncate">{proj.name}</h4>
                      <p className="text-[10px] text-emerald-400 mt-1 uppercase font-semibold">Fase: {proj.phase}</p>
                    </div>
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                      proj.status === 'completado' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30' :
                      proj.status === 'en_progreso' ? 'bg-amber-950/80 text-amber-300 border-amber-500/30' :
                      'bg-rose-950/80 text-rose-300 border-rose-500/30'
                    }`}>
                      {proj.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-zinc-850">
                    <div className="space-y-0.5">
                      <span className="block text-[9px] text-zinc-500 uppercase font-mono">Ubicación</span>
                      <span className="block text-zinc-300 truncate">{proj.location || 'N/D'}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="block text-[9px] text-zinc-500 uppercase font-mono">Capacidad</span>
                      <span className="block text-zinc-300 font-mono truncate">{proj.capacity || 'N/D'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
