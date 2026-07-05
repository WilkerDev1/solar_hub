'use client';

import React, { useState } from 'react';
import { 
  Plus, X, User, Briefcase, Flag, Calendar, 
  ShieldAlert, Search, SlidersHorizontal, CheckSquare, FileText, ChevronDown 
} from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { ProjectDetailContext } from '../hooks/useProjectDetail';
import { useAuth } from '@/core/auth/AuthContext';

type Props = Pick<ProjectDetailContext,
  'isCreateOpen' | 'setIsCreateOpen' | 'createForm' | 'setCreateForm' |
  'handleCreateSubmit' | 'employees'
>;

export default function CreateTaskModal({
  isCreateOpen,
  setIsCreateOpen,
  createForm,
  setCreateForm,
  handleCreateSubmit,
  employees
}: Props) {
  const { user } = useAuth();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activePopover, setActivePopover] = useState<'assignee' | 'area' | 'priority' | 'due_date' | 'options' | null>(null);
  const [empSearch, setEmpSearch] = useState('');

  if (!isCreateOpen) return null;

  // Helpers to get display values
  const assignedEmp = employees.find(emp => emp.id === createForm.assigned_to);

  // Filtered lists
  const filteredEmployees = employees.filter(emp => 
    emp.full_name.toLowerCase().includes(empSearch.toLowerCase())
  );

  const togglePopover = (popover: typeof activePopover) => {
    setActivePopover(activePopover === popover ? null : popover);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Directly trigger form submit
      const mockFormEvent = {
        preventDefault: () => {}
      } as React.FormEvent;
      handleCreateSubmit(mockFormEvent);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      {/* Click outside backdrop for popovers */}
      {activePopover && (
        <div 
          className="fixed inset-0 z-40 bg-transparent" 
          onClick={() => setActivePopover(null)} 
        />
      )}

      <div className="bg-zinc-950 border border-zinc-850 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl relative z-50">
        <div className="p-4 border-b border-zinc-850 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-emerald-400">
            <Plus className="h-4.5 w-4.5" />
            <h3 className="font-bold text-xs uppercase tracking-wide">Crear Nueva Tarea en Obra</h3>
          </div>
          <button 
            type="button"
            onClick={() => setIsCreateOpen(false)} 
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <form onSubmit={handleCreateSubmit} className="p-5 overflow-y-auto space-y-4 text-left flex-1 min-h-0">
          {/* Title Input - Prominent */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono tracking-wider">
              ¿Qué se debe hacer? *
            </label>
            <input
              required
              type="text"
              value={createForm.title}
              onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
              onKeyDown={handleKeyDown}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 focus:bg-zinc-900 placeholder-zinc-650 font-semibold"
              placeholder="Escribe el título de la tarea..."
              autoFocus
            />
          </div>

          {/* Description Input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono tracking-wider">
              Descripción (Opcional)
            </label>
            <textarea
              value={createForm.description}
              onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 focus:bg-zinc-900 placeholder-zinc-650 h-20 resize-none"
              placeholder="Agrega notas o instrucciones detalladas sobre la ejecución..."
            />
          </div>

          {/* Summary of active values if they exist */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {assignedEmp && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-300">
                <User className="h-2.5 w-2.5 text-emerald-500" />
                {assignedEmp.full_name}
              </span>
            )}
            {createForm.area && createForm.area !== 'general' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-300">
                <Briefcase className="h-2.5 w-2.5 text-indigo-500" />
                {createForm.area.charAt(0).toUpperCase() + createForm.area.slice(1)}
              </span>
            )}
            {createForm.priority && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-900 border border-zinc-800 ${
                createForm.priority === 'alta' ? 'text-rose-455' :
                createForm.priority === 'media' ? 'text-yellow-400' : 'text-zinc-400'
              }`}>
                <Flag className="h-2.5 w-2.5" />
                Prioridad {createForm.priority.charAt(0).toUpperCase() + createForm.priority.slice(1)}
              </span>
            )}
            {createForm.due_date && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-300">
                <Calendar className="h-2.5 w-2.5 text-amber-500" />
                Vence: {createForm.due_date}
              </span>
            )}
            {createForm.task_type === 'entregable' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-955/85 border border-emerald-800 text-emerald-400">
                <FileText className="h-2.5 w-2.5" />
                Entregable (Firma/Doc)
              </span>
            )}
            {createForm.requires_audit && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-400">
                <ShieldAlert className="h-2.5 w-2.5 text-emerald-500" />
                Auditoría
              </span>
            )}
          </div>

          {/* Toggle advanced fields button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-widest font-mono transition-colors focus:outline-none"
            >
              <SlidersHorizontal className="h-3 w-3" />
              {showAdvanced ? 'Ocultar detalles de tarjeta' : 'Agregar detalles a la tarjeta'}
            </button>
          </div>

          {/* Collapsable details toolbar */}
          {showAdvanced && (
            <div className="pt-3 border-t border-zinc-900 space-y-3">
              <label className="text-[9px] font-bold text-zinc-500 uppercase font-mono tracking-wider block">
                Atributos de Tarea (Trello-Style)
              </label>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. Colaborador Button + Popover */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => togglePopover('assignee')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-[11px] font-bold text-zinc-300 hover:text-white transition-all rounded-lg"
                  >
                    <User className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Colaborador</span>
                    <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
                  </button>

                  {activePopover === 'assignee' && (
                    <div className="absolute left-0 mt-1.5 w-64 bg-zinc-900 border border-zinc-850 rounded-xl p-3 shadow-2xl z-50 flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 px-2 py-1 rounded-lg">
                        <Search className="h-3.5 w-3.5 text-zinc-500" />
                        <input
                          type="text"
                          placeholder="Buscar colaborador..."
                          value={empSearch}
                          onChange={e => setEmpSearch(e.target.value)}
                          className="bg-transparent border-none text-[11px] text-white focus:outline-none focus:ring-0 w-full"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
                        <button
                          type="button"
                          onClick={() => {
                            setCreateForm({ ...createForm, assigned_to: user?.id || '' });
                            setActivePopover(null);
                          }}
                          className="w-full text-left text-[11px] font-semibold p-2 hover:bg-zinc-800 rounded-lg text-emerald-400 flex items-center justify-between"
                        >
                          <span>Asignar a mí mismo</span>
                          <User className="h-3 w-3" />
                        </button>
                        {filteredEmployees.map(emp => (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => {
                              setCreateForm({ ...createForm, assigned_to: emp.id });
                              setActivePopover(null);
                            }}
                            className={`w-full text-left text-[11px] font-semibold p-2 hover:bg-zinc-800 rounded-lg block truncate ${
                              createForm.assigned_to === emp.id ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-300'
                            }`}
                          >
                            {emp.full_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Departamento Button + Popover */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => togglePopover('area')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-[11px] font-bold text-zinc-300 hover:text-white transition-all rounded-lg"
                  >
                    <Briefcase className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Departamento</span>
                    <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
                  </button>

                  {activePopover === 'area' && (
                    <div className="absolute left-0 mt-1.5 w-48 bg-zinc-900 border border-zinc-855 rounded-xl p-2 shadow-2xl z-50 flex flex-col gap-1">
                      {[
                        { key: 'general', label: 'General' },
                        { key: 'operaciones', label: 'Operaciones' },
                        { key: 'almacen', label: 'Almacén' },
                        { key: 'administracion', label: 'Administración' },
                        { key: 'legal', label: 'Legal' }
                      ].map(item => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setCreateForm({ ...createForm, area: item.key as any });
                            setActivePopover(null);
                          }}
                          className={`w-full text-left text-[11px] font-semibold p-2 hover:bg-zinc-850 rounded-lg block truncate ${
                            createForm.area === item.key ? 'bg-zinc-850 text-emerald-400' : 'text-zinc-300'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Prioridad Button + Popover */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => togglePopover('priority')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-[11px] font-bold text-zinc-300 hover:text-white transition-all rounded-lg"
                  >
                    <Flag className="h-3.5 w-3.5 text-rose-505" />
                    <span>Prioridad</span>
                    <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
                  </button>

                  {activePopover === 'priority' && (
                    <div className="absolute left-0 mt-1.5 w-40 bg-zinc-900 border border-zinc-855 rounded-xl p-2 shadow-2xl z-50 flex flex-col gap-1">
                      {[
                        { key: 'baja', label: 'Baja', color: 'text-zinc-400' },
                        { key: 'media', label: 'Media', color: 'text-yellow-400' },
                        { key: 'alta', label: 'Alta', color: 'text-rose-455' }
                      ].map(item => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setCreateForm({ ...createForm, priority: item.key as any });
                            setActivePopover(null);
                          }}
                          className={`w-full text-left text-[11px] font-semibold p-2 hover:bg-zinc-855 rounded-lg flex items-center justify-between ${
                            createForm.priority === item.key ? 'bg-zinc-855 text-emerald-400' : 'text-zinc-300'
                          }`}
                        >
                          <span>{item.label}</span>
                          <span className={`h-2 w-2 rounded-full bg-current ${item.color}`} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Vencimiento Button + Popover */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => togglePopover('due_date')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-[11px] font-bold text-zinc-300 hover:text-white transition-all rounded-lg"
                  >
                    <Calendar className="h-3.5 w-3.5 text-amber-500" />
                    <span>Vencimiento</span>
                    <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
                  </button>

                  {activePopover === 'due_date' && (
                    <div className="absolute left-0 mt-1.5 w-56 bg-zinc-900 border border-zinc-855 rounded-xl p-3 shadow-2xl z-50 flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Seleccionar Fecha</label>
                      <input
                        type="date"
                        value={createForm.due_date}
                        onChange={e => setCreateForm({ ...createForm, due_date: e.target.value })}
                        className="bg-zinc-950 border border-zinc-800 text-xs text-white rounded-lg p-2 focus:outline-none focus:border-emerald-500 w-full"
                      />
                      <div className="flex justify-between items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setCreateForm({ ...createForm, due_date: '' });
                            setActivePopover(null);
                          }}
                          className="text-[9.5px] font-bold text-rose-500 hover:underline"
                        >
                          Limpiar
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivePopover(null)}
                          className="text-[9.5px] font-bold text-emerald-400 hover:underline"
                        >
                          Confirmar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Opciones Button (Task type & requires audit) + Popover */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => togglePopover('options')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-[11px] font-bold text-zinc-300 hover:text-white transition-all rounded-lg"
                  >
                    <CheckSquare className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Tipo y Configuración</span>
                    <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
                  </button>

                  {activePopover === 'options' && (
                    <div className="absolute right-0 md:left-0 mt-1.5 w-60 bg-zinc-900 border border-zinc-855 rounded-xl p-3.5 shadow-2xl z-50 flex flex-col gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase font-mono block">Tipo de Tarea</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setCreateForm({ ...createForm, task_type: 'check' })}
                            className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                              createForm.task_type === 'check' 
                                ? 'bg-zinc-950 border-emerald-600 text-emerald-400 font-bold' 
                                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 text-xs'
                            }`}
                          >
                            <CheckSquare className="h-4 w-4 mb-1" />
                            <span className="text-[9.5px]">Check Rápido</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCreateForm({ ...createForm, task_type: 'entregable' })}
                            className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                              createForm.task_type === 'entregable' 
                                ? 'bg-zinc-950 border-emerald-600 text-emerald-400 font-bold' 
                                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 text-xs'
                            }`}
                          >
                            <FileText className="h-4 w-4 mb-1" />
                            <span className="text-[9.5px]">Entregable</span>
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-zinc-800 flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="popover-project-requires-audit"
                          checked={createForm.requires_audit}
                          onChange={e => setCreateForm({ ...createForm, requires_audit: e.target.checked })}
                          className="rounded border-zinc-800 bg-zinc-950 text-emerald-600 focus:ring-emerald-500/20 h-4 w-4 cursor-pointer"
                        />
                        <label 
                          htmlFor="popover-project-requires-audit" 
                          className="text-[10px] font-bold text-zinc-400 cursor-pointer select-none leading-tight"
                        >
                          Exigir Auditoría de Líder
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quick instructions text */}
          <div className="text-[10px] text-zinc-650 font-medium font-sans pt-1 select-none">
            💡 Presiona <kbd className="bg-zinc-900 border border-zinc-800 px-1 py-0.5 rounded font-mono text-[9px] text-zinc-400">Enter</kbd> en el título para crear la tarea al instante con valores predeterminados.
          </div>

          {/* Buttons Footer */}
          <div className="pt-4 border-t border-zinc-850 flex justify-end gap-2 shrink-0">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setIsCreateOpen(false)} 
              className="text-zinc-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5"
            >
              Crear Tarea
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
