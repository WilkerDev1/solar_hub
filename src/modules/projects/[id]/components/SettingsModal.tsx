'use client';

import React from 'react';
import { Settings, X, Loader2 } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { ProjectDetailContext } from '../hooks/useProjectDetail';

type Props = Pick<ProjectDetailContext,
  'isSettingsOpen' | 'setIsSettingsOpen' | 'settingsForm' | 'setSettingsForm' |
  'savingSettings' | 'handleSaveSettings' | 'employees'
>;

export default function SettingsModal({
  setIsSettingsOpen, settingsForm, setSettingsForm,
  savingSettings, handleSaveSettings, employees
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-950 border border-zinc-850 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-5 border-b border-zinc-850 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-white">
            <Settings className="h-5 w-5 text-zinc-400" />
            <h3 className="font-bold text-sm uppercase tracking-wide">Configuración de Obra</h3>
          </div>
          <button onClick={() => setIsSettingsOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSaveSettings} className="p-6 overflow-y-auto space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Nombre de la Obra *</label>
            <input
              required
              type="text"
              value={settingsForm.name}
              onChange={e => setSettingsForm({...settingsForm, name: e.target.value})}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Fase Operativa</label>
              <select
                value={settingsForm.phase}
                onChange={e => setSettingsForm({...settingsForm, phase: e.target.value})}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none font-semibold"
              >
                <option value="Diseno">Diseño</option>
                <option value="Permisos">Permisos</option>
                <option value="Construccion">Construcción</option>
                <option value="Operacion">Operación</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Estado</label>
              <select
                value={settingsForm.status}
                onChange={e => setSettingsForm({...settingsForm, status: e.target.value})}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none font-semibold"
              >
                <option value="en_progreso">En Progreso</option>
                <option value="demorado">Demorado</option>
                <option value="completado">Completado</option>
                <option value="archivado">Archivado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Capacidad Nominal (MWp/kWp)</label>
              <input
                type="text"
                value={settingsForm.capacity}
                onChange={e => setSettingsForm({...settingsForm, capacity: e.target.value})}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                placeholder="Ej. 1.2 MWp"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Coordenadas GPS</label>
              <input
                type="text"
                value={settingsForm.gps_coordinates}
                onChange={e => setSettingsForm({...settingsForm, gps_coordinates: e.target.value})}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                placeholder="Ej. -12.04637, -77.04279"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Ubicación / Dirección de Obra</label>
            <input
              type="text"
              value={settingsForm.location}
              onChange={e => setSettingsForm({...settingsForm, location: e.target.value})}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
              placeholder="Dirección física del proyecto..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">URL de Banner de Obra</label>
            <input
              type="text"
              value={settingsForm.banner_url}
              onChange={e => setSettingsForm({...settingsForm, banner_url: e.target.value})}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none font-mono"
              placeholder="https://images.unsplash.com/..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Descripción General</label>
            <textarea
              value={settingsForm.description}
              onChange={e => setSettingsForm({...settingsForm, description: e.target.value})}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none h-16 resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Colaboradores Asignados a la Obra</label>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2.5 max-h-32 overflow-y-auto">
              {employees.map(emp => {
                const isChecked = settingsForm.member_ids.includes(emp.id);
                return (
                  <label key={emp.id} className="flex items-center gap-2.5 text-xs font-semibold text-zinc-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (isChecked) {
                          setSettingsForm({...settingsForm, member_ids: settingsForm.member_ids.filter(x => x !== emp.id)});
                        } else {
                          setSettingsForm({...settingsForm, member_ids: [...settingsForm.member_ids, emp.id]});
                        }
                      }}
                      className="rounded border-zinc-800 bg-zinc-950 text-emerald-600 focus:ring-emerald-500/20 h-4 w-4 cursor-pointer"
                    />
                    <span>{emp.full_name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-850 flex justify-end gap-2 shrink-0">
            <Button type="button" variant="ghost" onClick={() => setIsSettingsOpen(false)} className="text-zinc-400">
              Cancelar
            </Button>
            <Button type="submit" disabled={savingSettings} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5">
              {savingSettings ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Guardar Configuración
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
