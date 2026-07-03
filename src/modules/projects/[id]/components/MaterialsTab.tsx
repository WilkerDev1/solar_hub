'use client';

import React from 'react';
import {
  Package, CheckCircle, ArrowRight, FileText, FileSpreadsheet,
  Plus, Loader2
} from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { RequirePermission } from '@/core/auth/AuthContext';
import { ProjectDetailContext } from '../hooks/useProjectDetail';

type Props = Pick<ProjectDetailContext,
  'materials' | 'loadingMaterials' | 'dispatchHistory' | 'loadingHistory' |
  'setIsDispatchModalOpen' | 'setDispatchForm' | 'dispatchForm' |
  'handleExportCSV'
>;

export default function MaterialsTab({
  materials, loadingMaterials, dispatchHistory, loadingHistory,
  setIsDispatchModalOpen, setDispatchForm, dispatchForm,
  handleExportCSV
}: Props) {
  return (
    <div className="space-y-6">

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-800 border border-zinc-700 p-4 rounded-none flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Total Insumos BOM</span>
            <p className="text-lg font-bold text-white mt-0.5">{materials.length}</p>
          </div>
          <Package className="h-5 w-5 text-zinc-500" />
        </div>

        <div className="bg-zinc-800 border border-zinc-700 p-4 rounded-none flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Abastecimiento Completo</span>
            <p className="text-lg font-bold text-emerald-400 mt-0.5">
              {materials.filter(m => m.quantity >= m.required_quantity).length}
            </p>
          </div>
          <CheckCircle className="h-5 w-5 text-emerald-400" />
        </div>

        <div className="bg-zinc-800 border border-zinc-700 p-4 rounded-none flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Cant. Despachada</span>
            <p className="text-lg font-bold text-blue-400 mt-0.5">
              {materials.reduce((acc, m) => acc + m.quantity, 0)}
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-blue-400" />
        </div>

        <div className="bg-zinc-800 border border-zinc-700 p-4 rounded-none flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Presupuesto Ejecutado</span>
            <p className="text-lg font-bold text-amber-500 mt-0.5">
              ${materials.reduce((acc, m) => acc + (m.quantity * (m.inventory_items?.cost || 0)), 0).toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </p>
          </div>
          <FileText className="h-5 w-5 text-amber-500" />
        </div>
      </div>

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-800 border border-zinc-700 p-4 rounded-none">
        <div>
          <h4 className="text-sm font-bold text-white">Lista de Materiales de Obra (BOM)</h4>
          <p className="text-[10px] text-zinc-500 mt-0.5">Control comparativo de insumos Requeridos vs En Sitio en almacén físico.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleExportCSV} className="bg-zinc-900 border border-zinc-700 text-zinc-300 font-bold text-xs h-9 px-3 rounded-none flex items-center gap-1 cursor-pointer">
            <FileSpreadsheet className="h-4 w-4" /> Exportar CSV
          </Button>
          <RequirePermission action="inventory:use_material">
            <Button
              onClick={() => {
                setDispatchForm({ itemId: '', quantity: 1, requiredQuantity: 1, actionType: 'requirement', reason: '' });
                setIsDispatchModalOpen(true);
              }}
              className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-xs h-9 px-3 rounded-none flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Añadir Material BOM
            </Button>
            <Button
              onClick={() => {
                setDispatchForm({ itemId: '', quantity: 1, requiredQuantity: 1, actionType: 'dispatch', reason: '' });
                setIsDispatchModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-3 rounded-none flex items-center gap-1 cursor-pointer"
            >
              <ArrowRight className="h-4 w-4" /> Despachar Lote
            </Button>
          </RequirePermission>
        </div>
      </div>

      {loadingMaterials ? (
        <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-zinc-500 h-6 w-6" /></div>
      ) : materials.length === 0 ? (
        <div className="border border-zinc-700 rounded-none p-10 text-center italic text-zinc-500">
          No se han registrado requerimientos de materiales en la BOM de este proyecto.
        </div>
      ) : (
        <div className="bg-zinc-800 border border-zinc-700 rounded-none overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-900/60 border-b border-zinc-700 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                <th className="px-6 py-4 w-16">Miniatura</th>
                <th className="px-6 py-4">Insumo / SKU</th>
                <th className="px-6 py-4 text-center">Progreso Abastecimiento</th>
                <th className="px-6 py-4 text-center">Requerido</th>
                <th className="px-6 py-4 text-center">En Sitio (Obra)</th>
                <th className="px-6 py-4">Medida</th>
                <th className="px-6 py-4">Costo Total</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700">
              {materials.map(m => {
                const item = m.inventory_items;
                if (!item) return null;

                const isComplete = m.quantity >= m.required_quantity;
                const isPartial = m.quantity < m.required_quantity && m.quantity > 0;
                const isMissing = m.quantity === 0;
                const pct = m.required_quantity > 0 ? Math.min(100, Math.round((m.quantity / m.required_quantity) * 100)) : 100;

                return (
                  <tr key={m.id} className="hover:bg-zinc-900/20">
                    <td className="px-6 py-3">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="h-10 w-10 object-cover rounded-none border border-zinc-700" />
                      ) : (
                        <div className="h-10 w-10 bg-zinc-900 border border-zinc-700 rounded-none flex items-center justify-center text-zinc-500">
                          <Package className="h-4 w-4" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3 text-left">
                      <span className="font-bold text-white block">{item.name}</span>
                      <span className="text-[10px] font-mono text-zinc-500">{item.sku}</span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex flex-col space-y-1 max-w-[120px] mx-auto">
                        <div className="flex justify-between text-[10px] font-mono font-bold text-zinc-400">
                          <span>{pct}%</span>
                          <span className={isComplete ? "text-emerald-450" : isPartial ? "text-amber-450" : "text-rose-455"}>
                            {isComplete ? "OK" : isPartial ? "PARCIAL" : "PTE"}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-950 rounded-none overflow-hidden">
                          <div
                            className={`h-full rounded-none transition-all duration-500 ${
                              isComplete ? 'bg-emerald-500' : isPartial ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center font-semibold font-mono text-zinc-300">
                      {m.required_quantity}
                    </td>
                    <td className="px-6 py-3 text-center font-semibold font-mono text-white">
                      {m.quantity}
                    </td>
                    <td className="px-6 py-3 text-zinc-400 capitalize">{item.unit}</td>
                    <td className="px-6 py-3 font-mono font-bold text-zinc-300">
                      ${(item.cost * m.quantity).toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </td>
                    <td className="px-6 py-3 text-right">
                      <RequirePermission action="inventory:use_material">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setDispatchForm({ itemId: m.item_id, quantity: 1, requiredQuantity: 1, actionType: 'dispatch', reason: '' });
                              setIsDispatchModalOpen(true);
                            }}
                            className="px-2 py-1 rounded-none bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 hover:border-emerald-500 text-[10px] font-bold transition-all cursor-pointer"
                            title="Despachar unidades a obra"
                          >
                            Despachar
                          </button>
                          <button
                            onClick={() => {
                              setDispatchForm({ itemId: m.item_id, quantity: 1, requiredQuantity: 1, actionType: 'requirement', reason: '' });
                              setIsDispatchModalOpen(true);
                            }}
                            className="px-2 py-1 rounded-none bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-[10px] font-bold transition-all cursor-pointer"
                            title="Modificar requerimiento BOM"
                          >
                            Requisito
                          </button>
                        </div>
                      </RequirePermission>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Dispatch Logs History */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-none p-5 space-y-4 text-left">
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono flex items-center gap-1.5 pb-2 border-b border-zinc-700">
          📋 Historial Reciente de Despacho de Materiales
        </h4>

        {loadingHistory ? (
          <div className="py-4 flex justify-center"><Loader2 className="animate-spin text-zinc-500 h-5 w-5" /></div>
        ) : dispatchHistory.length === 0 ? (
          <p className="text-xs italic text-zinc-500">No se registran movimientos de stock para esta obra aún.</p>
        ) : (
          <div className="space-y-3.5 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-900">
            {dispatchHistory.map((log) => (
              <div key={log.id} className="bg-zinc-900 border border-zinc-750 p-3 rounded-none flex items-center justify-between text-xs hover:border-zinc-700 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{log.inventory_items?.name}</span>
                    <span className="bg-zinc-950 text-zinc-400 font-mono text-[9px] px-1.5 py-0.5 rounded-none border border-zinc-700">{log.inventory_items?.sku}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {new Date(log.created_at).toLocaleDateString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Detalle: <strong className="text-zinc-300 font-bold">{log.reason}</strong>
                  </p>
                </div>
                <div className="text-right shrink-0 flex items-center gap-3">
                  <div>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase font-mono block">Responsable</span>
                    <span className="font-semibold text-zinc-300">{log.profiles?.full_name || 'Desconocido'}</span>
                  </div>
                  <div className="bg-rose-500/10 text-rose-455 font-bold border border-rose-500/20 px-2.5 py-1 rounded-none text-center font-mono">
                    {log.quantity} {log.inventory_items?.unit}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
