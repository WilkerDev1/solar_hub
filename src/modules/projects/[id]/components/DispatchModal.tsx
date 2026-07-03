'use client';

import React from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { ProjectDetailContext } from '../hooks/useProjectDetail';

type Props = Pick<ProjectDetailContext,
  'isDispatchModalOpen' | 'setIsDispatchModalOpen' | 'dispatchForm' | 'setDispatchForm' |
  'actionLoading' | 'handleDispatchSubmit' | 'inventoryItems'
>;

export default function DispatchModal({
  setIsDispatchModalOpen, dispatchForm, setDispatchForm,
  actionLoading, handleDispatchSubmit, inventoryItems
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-950 border border-zinc-850 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-5 border-b border-zinc-850 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-emerald-450">
            <Plus className="h-5 w-5" />
            <h3 className="font-bold text-sm uppercase tracking-wide">Despacho / Requisito BOM</h3>
          </div>
          <button onClick={() => setIsDispatchModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Sub-tabs */}
        <div className="flex border-b border-zinc-850 px-4 bg-zinc-900/30">
          <button
            onClick={() => setDispatchForm({...dispatchForm, actionType: 'dispatch'})}
            className={`px-4 py-3 text-xs font-bold uppercase border-b-2 ${
              dispatchForm.actionType === 'dispatch' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-500'
            }`}
          >
            Despachar a Obra
          </button>
          <button
            onClick={() => setDispatchForm({...dispatchForm, actionType: 'requirement'})}
            className={`px-4 py-3 text-xs font-bold uppercase border-b-2 ${
              dispatchForm.actionType === 'requirement' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-500'
            }`}
          >
            Añadir Requisito BOM
          </button>
        </div>

        <form onSubmit={handleDispatchSubmit} className="p-6 overflow-y-auto space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Seleccionar Insumo *</label>
            <select
              required
              value={dispatchForm.itemId}
              onChange={e => setDispatchForm({...dispatchForm, itemId: e.target.value})}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
            >
              <option value="">Selecciona un material global...</option>
              {inventoryItems.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} (SKU: {item.sku} • Stock: {item.stock} {item.unit})
                </option>
              ))}
            </select>
          </div>

          {dispatchForm.actionType === 'dispatch' ? (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Cantidad a Despachar *</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={dispatchForm.quantity}
                  onChange={e => setDispatchForm({...dispatchForm, quantity: Math.max(1, Number(e.target.value))})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Motivo del despacho / Guía remisión</label>
                <input
                  type="text"
                  placeholder="Ej. Guía N° 2034 / Envío paneles Trina"
                  value={dispatchForm.reason}
                  onChange={e => setDispatchForm({...dispatchForm, reason: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                />
              </div>
            </>
          ) : (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Cantidad Requerida Adicional *</label>
              <input
                required
                type="number"
                min="1"
                value={dispatchForm.requiredQuantity}
                onChange={e => setDispatchForm({...dispatchForm, requiredQuantity: Math.max(1, Number(e.target.value))})}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
              />
            </div>
          )}

          <div className="pt-4 border-t border-zinc-850 flex justify-end gap-2 shrink-0">
            <Button type="button" variant="ghost" onClick={() => setIsDispatchModalOpen(false)} className="text-zinc-400">
              Cancelar
            </Button>
            <Button type="submit" disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Ejecutar Cambios
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
