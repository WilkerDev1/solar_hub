'use client';

import React from 'react';
import { MapPin, User } from 'lucide-react';
import { ProjectDetailContext } from '../hooks/useProjectDetail';

type Props = Pick<ProjectDetailContext, 'project' | 'employees'>;

export default function OverviewTab({ project, employees }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

      {/* Left Column: Description & Banner */}
      <div className="md:col-span-2 space-y-6">
        {project.banner_url && (
          <div className="h-48 rounded-2xl overflow-hidden border border-zinc-900 relative">
            <img src={project.banner_url} alt="Project banner" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
          </div>
        )}

        <div className="bg-zinc-900/10 border border-zinc-900 p-6 rounded-2xl space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 font-mono">Ficha Descriptiva</h3>
          <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-line">
            {project.description || 'Sin descripción detallada registrada para esta obra.'}
          </p>
        </div>
      </div>

      {/* Right Column: Attributes & Team members list */}
      <div className="space-y-6">
        <div className="bg-zinc-900/30 border border-zinc-900 p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 font-mono flex items-center gap-1.5 pb-2.5 border-b border-zinc-900">
            <MapPin className="h-4 w-4 text-emerald-400" /> Atributos Técnicos
          </h3>
          <div className="space-y-3 text-xs leading-normal">
            <div className="flex justify-between py-1.5 border-b border-zinc-900">
              <span className="text-zinc-500 font-medium">Ubicación Física</span>
              <span className="font-bold text-zinc-350 text-right">{project.location || 'N/D'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-900 font-mono">
              <span className="text-zinc-500 font-medium">Coordenadas GPS</span>
              <span className="font-bold text-amber-400">{project.gps_coordinates || 'N/D'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-zinc-500 font-medium">Capacidad Nominal</span>
              <span className="font-bold text-zinc-350">{project.capacity || 'N/D'}</span>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/30 border border-zinc-900 p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 font-mono flex items-center gap-1.5 pb-2.5 border-b border-zinc-900">
            <User className="h-4 w-4 text-emerald-400" /> Equipo de Obra
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {project.member_ids && project.member_ids.length > 0 ? (
              project.member_ids.map((id: string) => {
                const emp = employees.find(e => e.id === id);
                if (!emp) return null;
                return (
                  <div key={id} className="flex items-center gap-2.5 bg-zinc-900/40 p-2 rounded-xl border border-zinc-900">
                    <div className="h-6 w-6 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-350">
                      {emp.full_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs text-zinc-300 font-bold">{emp.full_name}</span>
                  </div>
                );
              })
            ) : (
              <p className="text-xs italic text-zinc-500">Sin integrantes asignados a la obra.</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
