import React from 'react';
import { Sliders, X, Loader2 } from 'lucide-react';
import { Button } from '@/core/components/ui/button';

interface BulkAdjustmentModalProps {
  isBulkModalOpen: boolean;
  setIsBulkModalOpen: (open: boolean) => void;
  bulkList: any[];
  setBulkList: (list: any[]) => void;
  actionLoading: boolean;
  selectedItemIds: string[];
  handleSaveBulk: () => Promise<void>;
}

export function BulkAdjustmentModal({
  isBulkModalOpen,
  setIsBulkModalOpen,
  bulkList,
  setBulkList,
  actionLoading,
  selectedItemIds,
  handleSaveBulk
}: BulkAdjustmentModalProps) {
  if (!isBulkModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-[#1c1c21] border border-zinc-800 rounded-lg w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between shrink-0 font-sans">
          <div className="flex items-center gap-2 text-amber-400">
            <Sliders className="h-5 w-5" />
            <h3 className="font-bold text-sm uppercase tracking-wide">
              Conciliación Local y Ajuste Masivo {selectedItemIds.length > 0 ? `(${selectedItemIds.length} Seleccionados)` : '(Catálogo Completo)'}
            </h3>
          </div>
          <button onClick={() => setIsBulkModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 text-left">
          <p className="text-zinc-400 text-xs mb-4 leading-relaxed">
            Ingresa cantidades de ajuste y selecciona el método de acción para cada fila. Los cambios solo se aplicarán al presionar "Guardar Conciliación".
          </p>
          
          <div className="border border-zinc-800 rounded-lg overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-900/60 border-b border-zinc-800 font-bold uppercase text-zinc-400">
                  <th className="px-4 py-3 text-left">Material / SKU</th>
                  <th className="px-4 py-3 text-left">Stock Actual</th>
                  <th className="px-4 py-3 text-left w-24">Cantidad</th>
                  <th className="px-4 py-3 text-left w-36">Tipo Acción</th>
                  <th className="px-4 py-3 text-left">Motivo / Explicación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {bulkList.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-zinc-800/10">
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-white block">{row.name}</span>
                      <span className="text-[10px] font-mono text-zinc-500">{row.sku}</span>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-300 font-semibold font-mono">
                      {row.currentStock} {row.unit}
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        value={row.quantity === 0 ? '' : row.quantity}
                        placeholder="0"
                        onChange={e => {
                          const val = Math.max(0, Number(e.target.value));
                          const updated = [...bulkList];
                          updated[idx].quantity = val;
                          setBulkList(updated);
                        }}
                        className="bg-zinc-955 border border-zinc-850 rounded-lg p-1.5 w-20 text-center font-mono text-white focus:outline-none focus:border-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        value={row.transactionType}
                        onChange={e => {
                          const updated = [...bulkList];
                          updated[idx].transactionType = e.target.value;
                          setBulkList(updated);
                        }}
                        className="bg-zinc-955 border border-zinc-850 rounded-lg p-1.5 text-xs text-white focus:outline-none w-full font-semibold"
                      >
                        <option value="ajuste">Ajuste (Kardex)</option>
                        <option value="entrada">Entrada (Stock +)</option>
                        <option value="salida">Salida (Stock -)</option>
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        placeholder="Ej. Rotura física, Conteo anual..."
                        value={row.reason}
                        onChange={e => {
                          const updated = [...bulkList];
                          updated[idx].reason = e.target.value;
                          setBulkList(updated);
                        }}
                        className="w-full bg-zinc-955 border border-zinc-850 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-5 border-t border-zinc-800 flex justify-end gap-2 shrink-0">
          <Button variant="ghost" onClick={() => setIsBulkModalOpen(false)} className="text-zinc-400">
            Cancelar
          </Button>
          <Button onClick={handleSaveBulk} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 rounded-lg">
            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Guardar Conciliación
          </Button>
        </div>
      </div>
    </div>
  );
}
