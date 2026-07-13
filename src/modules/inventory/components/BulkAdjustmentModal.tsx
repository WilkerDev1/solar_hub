'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sliders, X, Loader2, PlusCircle, MinusCircle, CheckSquare, 
  Archive, FileText, CheckCircle2, ChevronRight, Info
} from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { supabase } from '@/core/database/supabase';
import { getApiUrl } from '@/core/utils/api';
import { processBulkStockAdjustments, dispatchMaterialToProject } from '@/core/services/inventory';

interface BulkAdjustmentModalProps {
  isBulkModalOpen: boolean;
  setIsBulkModalOpen: (open: boolean) => void;
  bulkList: any[];
  setBulkList: (list: any[]) => void;
  actionLoading: boolean;
  selectedItemIds: string[];
  handleSaveBulk: () => Promise<void>; // Fallback trigger
  loadData: () => Promise<void>; // Refresh inventory table
  setSelectedItemIds: (ids: string[]) => void; // Clear selections
}

export function BulkAdjustmentModal({
  isBulkModalOpen,
  setIsBulkModalOpen,
  bulkList,
  setBulkList,
  actionLoading: parentActionLoading,
  selectedItemIds,
  handleSaveBulk,
  loadData,
  setSelectedItemIds
}: BulkAdjustmentModalProps) {
  // Wizard state: 'choose' | 'adjust'
  const [step, setStep] = useState<'choose' | 'adjust'>('choose');
  
  // Selection mode: 'entrada' | 'salida' | 'proyecto'
  const [adjustmentType, setAdjustmentType] = useState<'entrada' | 'salida' | 'proyecto'>('entrada');
  
  // Global comments & project settings
  const [globalReason, setGlobalReason] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [token, setToken] = useState<string | null>(null);

  // Local quantities adjustments
  const [localQuantities, setLocalQuantities] = useState<{ [itemId: string]: number }>({});
  const [localLoading, setLocalLoading] = useState(false);
  const [successItems, setSuccessItems] = useState<any[] | null>(null);

  // Fetch projects list and session token on modal open
  useEffect(() => {
    if (isBulkModalOpen) {
      setStep('choose');
      setGlobalReason('');
      setSelectedProjectId('');
      setSuccessItems(null);
      
      // Initialize local quantities to 0
      const qtys: any = {};
      bulkList.forEach(item => {
        qtys[item.id] = 0;
      });
      setLocalQuantities(qtys);

      // Fetch projects
      supabase
        .from('projects')
        .select('id, name, status')
        .neq('status', 'terminada')
        .then(({ data }) => {
          if (data) setProjects(data);
        });

      // Get session token
      supabase.auth.getSession().then(({ data: { session } }) => {
        setToken(session?.access_token || null);
      });
    }
  }, [isBulkModalOpen, bulkList]);

  // Helper to resolve absolute URL with token
  const resolveImageUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('/api/storage/file/')) {
      return getApiUrl(`${url}${url.includes('?') ? '&' : '?'}token=${token || ''}`);
    }
    return url;
  };

  const handleChooseType = (type: 'entrada' | 'salida' | 'proyecto') => {
    setAdjustmentType(type);
    setStep('adjust');
  };

  const handleQtyChange = (itemId: string, val: number, maxStock?: number) => {
    let safeVal = Math.max(0, val);
    if (adjustmentType !== 'entrada' && maxStock !== undefined) {
      safeVal = Math.min(safeVal, maxStock);
    }
    setLocalQuantities({
      ...localQuantities,
      [itemId]: safeVal
    });
  };

  const handleConfirmAction = async () => {
    const activeItems = bulkList.filter(item => (localQuantities[item.id] || 0) > 0);
    
    if (activeItems.length === 0) {
      alert('Por favor ingresa un número de stock mayor a 0 para al menos un material.');
      return;
    }

    if (adjustmentType === 'proyecto' && !selectedProjectId) {
      alert('Por favor selecciona un proyecto de destino.');
      return;
    }

    setLocalLoading(true);
    try {
      const reasonText = globalReason.trim() || (
        adjustmentType === 'entrada' ? 'Entrada masiva de stock' :
        adjustmentType === 'salida' ? 'Salida masiva de stock' : 'Asignación masiva a obra'
      );

      const itemsForCSV: any[] = [];

      if (adjustmentType === 'proyecto') {
        const project = projects.find(p => p.id === selectedProjectId);
        const projectName = project ? project.name : 'Proyecto';

        // Execute dispatch sequentially
        for (const item of activeItems) {
          const qty = localQuantities[item.id] || 0;
          await dispatchMaterialToProject({
            projectId: selectedProjectId,
            itemId: item.id,
            quantity: qty,
            reason: reasonText
          });
          itemsForCSV.push({
            sku: item.sku,
            name: item.name,
            qty,
            cost: item.cost
          });
        }

        // Trigger CSV download
        exportToCSV(itemsForCSV, projectName);
      } else {
        // general bulk adjustment
        const adjustments = activeItems.map(item => ({
          itemId: item.id,
          quantity: adjustmentType === 'salida' ? -Math.abs(localQuantities[item.id] || 0) : Math.abs(localQuantities[item.id] || 0),
          transactionType: adjustmentType,
          reason: reasonText
        }));

        await processBulkStockAdjustments(adjustments);
      }

      // Success callback
      alert('Transacción completada exitosamente.');
      await loadData();
      setSelectedItemIds([]);
      setIsBulkModalOpen(false);
    } catch (err: any) {
      alert('Error ejecutando la transacción: ' + err.message);
    } finally {
      setLocalLoading(false);
    }
  };

  const exportToCSV = (dispatchItems: any[], projectName: string) => {
    const headers = ['SKU', 'Material', 'Cantidad Despachada', 'Costo Unitario', 'Valor Total'];
    const rows = dispatchItems.map(item => [
      `"${item.sku}"`,
      `"${item.name}"`,
      item.qty,
      item.cost.toFixed(2),
      (item.cost * item.qty).toFixed(2)
    ]);
    
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `despacho_${projectName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isBulkModalOpen) return null;

  const activeCount = bulkList.filter(item => (localQuantities[item.id] || 0) > 0).length;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-[#1c1c21] border border-zinc-800 rounded-none w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between shrink-0 font-sans">
          <div className="flex items-center gap-2 text-amber-500">
            <Sliders className="h-5 w-5" />
            <h3 className="font-bold text-sm uppercase tracking-wide font-mono">
              Ajuste Masivo de Inventario
            </h3>
          </div>
          <button onClick={() => setIsBulkModalOpen(false)} className="text-zinc-550 hover:text-white transition-colors cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* STEP 1: CHOOSE ADJUSTMENT OPTION TYPE SCREEN */}
        {step === 'choose' && (
          <div className="p-8 overflow-y-auto flex-1 flex flex-col items-center justify-center space-y-6 text-center">
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">Selecciona el tipo de ajuste</h2>
              <p className="text-zinc-400 text-xs mt-1">
                Elige cómo deseas procesar la modificación masiva para los {bulkList.length} materiales seleccionados.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
              
              {/* Option 1: Entrada de stock */}
              <div 
                onClick={() => handleChooseType('entrada')}
                className="bg-[#121318] border border-zinc-850 hover:border-emerald-500/50 p-6 rounded-lg text-center cursor-pointer transition-all hover:bg-zinc-900/30 group active:scale-98"
              >
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
                  <PlusCircle className="h-6 w-6 text-emerald-400" />
                </div>
                <h4 className="text-sm font-bold text-white tracking-wide">Entrada de Stock</h4>
                <p className="text-zinc-500 text-[11px] mt-1.5 leading-relaxed">Reposición general</p>
              </div>

              {/* Option 2: Salida de stock */}
              <div 
                onClick={() => handleChooseType('salida')}
                className="bg-[#121318] border border-zinc-850 hover:border-rose-500/50 p-6 rounded-lg text-center cursor-pointer transition-all hover:bg-zinc-900/30 group active:scale-98"
              >
                <div className="h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
                  <MinusCircle className="h-6 w-6 text-rose-455" />
                </div>
                <h4 className="text-sm font-bold text-white tracking-wide">Salida de Stock</h4>
                <p className="text-zinc-500 text-[11px] mt-1.5 leading-relaxed">Pérdida o merma</p>
              </div>

              {/* Option 3: Salida a proyectos */}
              <div 
                onClick={() => handleChooseType('proyecto')}
                className="bg-[#121318] border border-zinc-850 hover:border-amber-500/50 p-6 rounded-lg text-center cursor-pointer transition-all hover:bg-zinc-900/30 group active:scale-98"
              >
                <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
                  <CheckSquare className="h-6 w-6 text-amber-400" />
                </div>
                <h4 className="text-sm font-bold text-white tracking-wide">Salida a Proyectos</h4>
                <p className="text-zinc-500 text-[11px] mt-1.5 leading-relaxed">Asignar a obra</p>
              </div>

            </div>

            <button 
              onClick={() => setIsBulkModalOpen(false)}
              className="text-xs font-mono font-bold text-zinc-500 hover:text-white uppercase tracking-wider cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* STEP 2: TABLE ADJUSTMENT SCREEN WITH SIDEBAR */}
        {step === 'adjust' && (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            
            {/* Left side: Materials table */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-left border-r border-zinc-850">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setStep('choose')}
                  className="text-xs text-emerald-450 hover:text-emerald-400 font-mono font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  &larr; Cambiar Tipo
                </button>
                <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                  Modo: {adjustmentType === 'entrada' ? 'ENTRADA STOCK' : adjustmentType === 'salida' ? 'SALIDA STOCK' : 'DESPACHO PROYECTOS'}
                </span>
              </div>

              <div className="border border-zinc-800 rounded overflow-x-auto bg-zinc-950/10">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-zinc-900/60 border-b border-zinc-800 font-bold uppercase text-zinc-450 tracking-wider">
                      <th className="px-4 py-3 text-left w-16">Imagen</th>
                      <th className="px-4 py-3 text-left">Material / SKU</th>
                      <th className="px-4 py-3 text-left">Stock Actual</th>
                      <th className="px-4 py-3 text-right w-32">
                        {adjustmentType === 'entrada' ? 'Ingreso (+)' : adjustmentType === 'salida' ? 'Egreso (-)' : 'Despacho'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {bulkList.map((row) => {
                      const imageUrl = resolveImageUrl(row.image_urls?.[0] || row.image_url);
                      return (
                        <tr key={row.id} className="hover:bg-zinc-800/10">
                          {/* Image */}
                          <td className="px-4 py-2.5">
                            <div className="h-10 w-14 bg-zinc-950 border border-zinc-850 rounded overflow-hidden flex items-center justify-center shrink-0">
                              {imageUrl ? (
                                <img src={imageUrl} alt={row.name} className="h-full w-full object-cover" />
                              ) : (
                                <Archive className="h-5 w-5 text-zinc-650" />
                              )}
                            </div>
                          </td>

                          {/* Material SKU */}
                          <td className="px-4 py-2.5">
                            <span className="font-semibold text-white block">{row.name}</span>
                            <span className="text-[10px] font-mono text-zinc-500 uppercase">{row.sku}</span>
                          </td>

                          {/* Current Stock */}
                          <td className="px-4 py-2.5 text-zinc-300 font-semibold font-mono">
                            {row.currentStock} {row.unit}
                          </td>

                          {/* Quantity Input */}
                          <td className="px-4 py-2.5 text-right">
                            <input
                              type="number"
                              min="0"
                              max={adjustmentType !== 'entrada' ? row.currentStock : undefined}
                              value={localQuantities[row.id] || ''}
                              placeholder="0"
                              onChange={e => handleQtyChange(row.id, Number(e.target.value), row.currentStock)}
                              className="bg-zinc-950 border border-zinc-850 rounded p-1.5 w-24 text-center font-mono text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right side: Sidebar details */}
            <div className="w-full md:w-80 bg-[#15171d] p-6 flex flex-col justify-between shrink-0 text-left border-t md:border-t-0 border-zinc-800">
              
              <div className="space-y-5">
                <span className="text-xs font-bold text-white font-mono uppercase tracking-widest block border-b border-zinc-800 pb-2">
                  Detalles de la Operación
                </span>

                {/* Project Selection (shown only on Salida a Proyectos) */}
                {adjustmentType === 'proyecto' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Proyecto de Destino *</label>
                    <select
                      value={selectedProjectId}
                      onChange={e => setSelectedProjectId(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded p-2 text-xs text-white focus:outline-none font-semibold cursor-pointer"
                    >
                      <option value="">Selecciona Proyecto</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Comment / explanation text area */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Comentario / Razón del ajuste</label>
                  <textarea
                    placeholder="Escriba el motivo del ajuste..."
                    value={globalReason}
                    onChange={e => setGlobalReason(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded p-2.5 text-xs text-white placeholder-zinc-700 focus:outline-none h-24 resize-none"
                  />
                </div>

                {adjustmentType === 'proyecto' && (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3 text-[9.5px] rounded flex gap-1.5 font-medium leading-relaxed">
                    <Info className="h-4 w-4 shrink-0 text-amber-500" />
                    <span>Estos materiales se descontarán del stock global y se asignarán al BOM del proyecto. Al finalizar se descargará automáticamente el CSV.</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs border-t border-zinc-800 pt-3">
                  <span className="text-zinc-500">Items modificados:</span>
                  <span className="font-bold text-white font-mono">{activeCount} / {bulkList.length}</span>
                </div>
              </div>

              <div className="space-y-2 pt-6 shrink-0">
                <Button 
                  onClick={handleConfirmAction} 
                  disabled={localLoading || activeCount === 0 || (adjustmentType === 'proyecto' && !selectedProjectId)}
                  className="w-full h-10 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-black font-extrabold font-mono text-[10.5px] uppercase tracking-wider rounded transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  {localLoading ? <Loader2 className="h-4 w-4 animate-spin text-black" /> : null}
                  Confirmar Transacción
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setIsBulkModalOpen(false)} 
                  className="w-full text-zinc-405 font-mono text-[10px] font-bold uppercase tracking-wider"
                >
                  Cancelar
                </Button>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
