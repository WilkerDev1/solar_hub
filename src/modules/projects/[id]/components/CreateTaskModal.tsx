'use client';

import React from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { ProjectDetailContext } from '../hooks/useProjectDetail';

type Props = Pick<ProjectDetailContext,
  'isCreateOpen' | 'setIsCreateOpen' | 'createForm' | 'setCreateForm' |
  'handleCreateSubmit' | 'employees'
>;

export default function CreateTaskModal({
  setIsCreateOpen, createForm, setCreateForm,
  handleCreateSubmit, employees
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-950 border border-zinc-850 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-5 border-b border-zinc-850 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-emerald-400">
            <Plus className="h-5 w-5" />
            <h3 className="font-bold text-sm uppercase tracking-wide">Crear Nueva Tarea en Obra</h3>
          </div>
          <button onClick={() => setIsCreateOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleCreateSubmit} className="p-6 overflow-y-auto space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Título de la Tarea *</label>
            <input
              required
              type="text"
              value={createForm.title}
              onChange={e => setCreateForm({...createForm, title: e.target.value})}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              placeholder="Ej. Realizar tendido de cable de cobre solar"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Descripción</label>
            <textarea
              value={createForm.description}
              onChange={e => setCreateForm({...createForm, description: e.target.value})}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 h-20 resize-none"
              placeholder="Instrucciones adicionales para la ejecución..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Origen / Módulo</label>
              <select
                value={createForm.origin}
                onChange={e => setCreateForm({...createForm, origin: e.target.value as any})}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
              >
                <option value="proyecto">Proyecto Solar (Core)</option>
                <option value="almacen">Almacén / Logística</option>
                <option value="administracion">Administrativo / Oficina</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Tipo Tarea</label>
              <select
                value={createForm.task_type}
                onChange={e => setCreateForm({...createForm, task_type: e.target.value as any})}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
              >
                <option value="check">Check (Acción Rápida)</option>
                <option value="entregable">Entregable (Firma/Doc)</option>
                <option value="reporte">Reporte de Campo</option>
                <option value="evidencia">Evidencia Fotográfica</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Asignar a Colaborador *</label>
            <select
              required
              value={createForm.assigned_to}
              onChange={e => setCreateForm({...createForm, assigned_to: e.target.value})}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
            >
              <option value="">Selecciona un colaborador</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Departamento</label>
              <select
                value={createForm.area}
                onChange={e => setCreateForm({...createForm, area: e.target.value as any})}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none font-semibold"
              >
                <option value="general">General</option>
                <option value="legal">Legal</option>
                <option value="almacen">Almacén</option>
                <option value="operaciones">Operaciones</option>
                <option value="administracion">Administración</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Prioridad</label>
              <select
                value={createForm.priority}
                onChange={e => setCreateForm({...createForm, priority: e.target.value as any})}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none font-semibold"
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Vencimiento</label>
              <input
                type="date"
                value={createForm.due_date}
                onChange={e => setCreateForm({...createForm, due_date: e.target.value})}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 py-2">
            <input
              type="checkbox"
              id="create-requires-audit-project"
              checked={createForm.requires_audit}
              onChange={e => setCreateForm({...createForm, requires_audit: e.target.checked})}
              className="rounded border-zinc-800 bg-zinc-900 text-emerald-600 focus:ring-emerald-500/20 h-4 w-4 cursor-pointer"
            />
            <label htmlFor="create-requires-audit-project" className="text-xs font-bold text-zinc-400 cursor-pointer select-none">
              Exigir Auditoría de Líder antes de finalizar la tarea.
            </label>
          </div>

          <div className="pt-4 border-t border-zinc-850 flex justify-end gap-2 shrink-0">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-zinc-400">
              Cancelar
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5">
              Crear Tarea
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
