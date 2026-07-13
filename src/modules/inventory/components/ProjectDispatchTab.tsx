'use client';

import React, { useState, useEffect } from 'react';
import { 
  Archive, Plus, Search, Loader2, ClipboardList, CheckCircle2, 
  ArrowLeft, QrCode, Trash2, Download, AlertTriangle, Layers, Info
} from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { supabase } from '@/core/database/supabase';
import { getApiUrl } from '@/core/utils/api';
import { InventoryItemRow, InventoryCategoryRow, dispatchMaterialToProject } from '@/core/services/inventory';

interface ProjectDispatchTabProps {
  items: InventoryItemRow[];
  categories: InventoryCategoryRow[];
  token: string | null;
  loadData: () => Promise<void>;
}

export function ProjectDispatchTab({
  items,
  categories,
  token,
  loadData
}: ProjectDispatchTabProps) {
  // Modes: 'passive' (dashboard) | 'active' (selection/dispatch wizard)
  const [viewMode, setViewMode] = useState<'passive' | 'active'>('passive');
  
  // Active dispatch states
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Map of itemId -> dispatchQuantity
  const [dispatchQuantities, setDispatchQuantities] = useState<{ [itemId: string]: number }>({});
  
  // Selection list of items
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  
  // Dispatch logs states
  const [recentDispatches, setRecentDispatches] = useState<any[]>([]);
  const [loadingDispatches, setLoadingDispatches] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ projectName: string; items: any[] } | null>(null);

  // Pagination for catalog inside active mode
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Fetch projects and dispatches on mount/mode switch
  useEffect(() => {
    fetchProjectsAndDispatches();
  }, [viewMode]);

  const fetchProjectsAndDispatches = async () => {
    setLoadingDispatches(true);
    try {
      // 1. Fetch projects
      const { data: projs } = await supabase
        .from('projects')
        .select('id, name, status');
      
      const projectsList = projs || [];
      setProjects(projectsList.filter(p => p.status !== 'terminada'));

      // 2. Fetch recent dispatches from inventory_transactions
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select(`
          *,
          inventory_items (
            name,
            sku
          )
        `)
        .not('project_id', 'is', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        // Group transactions close in time (15s window) into a single "Dispatch Order"
        const grouped: any[] = [];
        data.forEach(tx => {
          const txDate = new Date(tx.created_at).getTime();
          const match = grouped.find(g => 
            g.projectId === tx.project_id && 
            Math.abs(new Date(g.createdAt).getTime() - txDate) < 15000
          );
          
          const matchedProj = projectsList.find(p => p.id === tx.project_id);
          const projectName = matchedProj ? matchedProj.name : 'Proyecto Desconocido';

          if (match) {
            match.itemsCount += Math.abs(tx.quantity);
            match.itemsList.push(`${tx.inventory_items?.name || 'Item'} (${Math.abs(tx.quantity)} pcs)`);
          } else {
            grouped.push({
              id: `DSP-${tx.id.substring(0, 4).toUpperCase()}`,
              projectId: tx.project_id,
              projectName,
              itemsCount: Math.abs(tx.quantity),
              createdAt: tx.created_at,
              status: 'ENTREGADO',
              itemsList: [`${tx.inventory_items?.name || 'Item'} (${Math.abs(tx.quantity)} pcs)`]
            });
          }
        });
        setRecentDispatches(grouped);
      }
    } catch (err) {
      console.error('Error fetching projects and dispatches:', err);
    } finally {
      setLoadingDispatches(false);
    }
  };

  // Helper to resolve and authorize relative image URLs in static-export
  const resolveImageUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('/api/storage/file/')) {
      return getApiUrl(`${url}${url.includes('?') ? '&' : '?'}token=${token || ''}`);
    }
    return url;
  };

  // Filter catalog items
  const filteredCatalog = items.filter(item => {
    const q = searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q);
  });

  // Pagination catalog items
  const totalPages = Math.ceil(filteredCatalog.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCatalog = filteredCatalog.slice(startIndex, startIndex + itemsPerPage);

  const handleToggleSelect = (id: string) => {
    if (selectedItemIds.includes(id)) {
      setSelectedItemIds(selectedItemIds.filter(x => x !== id));
      // Reset dispatch qty
      const updatedQ = { ...dispatchQuantities };
      delete updatedQ[id];
      setDispatchQuantities(updatedQ);
    } else {
      setSelectedItemIds([...selectedItemIds, id]);
      setDispatchQuantities({ ...dispatchQuantities, [id]: 1 });
    }
  };

  const handleQtyChange = (id: string, qty: number, maxStock: number) => {
    const safeQty = Math.max(1, Math.min(qty, maxStock));
    setDispatchQuantities({
      ...dispatchQuantities,
      [id]: safeQty
    });
  };

  const handleExecuteDispatch = async () => {
    if (!selectedProjectId) {
      alert('Por favor selecciona un proyecto de destino.');
      return;
    }
    if (selectedItemIds.length === 0) {
      alert('Debes seleccionar al menos un material para despachar.');
      return;
    }

    const project = projects.find(p => p.id === selectedProjectId);
    const projectName = project ? project.name : 'Proyecto';

    setActionLoading(true);
    try {
      const dispatchedList: any[] = [];

      for (const id of selectedItemIds) {
        const item = items.find(x => x.id === id);
        const qty = dispatchQuantities[id] || 0;
        if (!item || qty <= 0) continue;

        // Perform RPC dispatch to project (decrements global stock and populates project BOM)
        await dispatchMaterialToProject({
          projectId: selectedProjectId,
          itemId: id,
          quantity: qty,
          reason: `Despacho masivo a obra ${projectName}`
        });

        dispatchedList.push({
          sku: item.sku,
          name: item.name,
          dispatchQuantity: qty,
          cost: item.cost
        });
      }

      // Save for CSV export
      setSuccessData({
        projectName,
        items: dispatchedList
      });

      // Reload global inventories
      await loadData();
      
      // Clear wizard states
      setSelectedItemIds([]);
      setDispatchQuantities({});
      setSelectedProjectId('');
      
      // Auto export CSV
      exportToCSV(dispatchedList, projectName);

      // Return to passive view
      setViewMode('passive');
    } catch (err: any) {
      alert('Error ejecutando el despacho: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const exportToCSV = (dispatchItems: any[], projName: string) => {
    const headers = ['SKU', 'Material', 'Cantidad Despachada', 'Costo Unitario', 'Valor Total'];
    const rows = dispatchItems.map(item => [
      `"${item.sku}"`,
      `"${item.name}"`,
      item.dispatchQuantity,
      item.cost.toFixed(2),
      (item.cost * item.dispatchQuantity).toFixed(2)
    ]);
    
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `despacho_${projName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to load a mockup approval request
  const loadMockupRequest = () => {
    // Select first few items and prefill quantities
    const firstTwo = items.slice(0, 2);
    if (firstTwo.length > 0) {
      const ids = firstTwo.map(x => x.id);
      setSelectedItemIds(ids);
      const qtys: any = {};
      firstTwo.forEach(x => {
        qtys[x.id] = Math.min(x.stock, 10);
      });
      setDispatchQuantities(qtys);
      setViewMode('active');
      alert('Cargada solicitud pendiente. Revisa cantidades y selecciona el proyecto destino para despachar.');
    }
  };

  const renderStockProgress = (stock: number, minStock: number) => {
    const targetStock = Math.max(minStock * 5, stock, 100);
    const percentage = Math.min(Math.round((stock / targetStock) * 100), 100);
    const isCritical = stock <= minStock;

    return (
      <div className="space-y-1 w-full max-w-[130px] text-left">
        <div className="flex items-center justify-between text-[10px] font-mono leading-none">
          <span className="text-white font-bold">{stock} pcs</span>
          <span className={`font-bold ${isCritical ? 'text-amber-500' : 'text-zinc-400'}`}>
            {percentage}%
          </span>
        </div>
        <div className="w-full h-1 bg-zinc-950 border border-zinc-850 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-300 ${
              isCritical ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  const getCategoryBadge = (categoryName?: string) => {
    const name = categoryName?.toLowerCase() || '';
    if (name.includes('indust')) {
      return <span className="px-2 py-0.5 text-[8.5px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">IND</span>;
    }
    if (name.includes('comm') || name.includes('comerc')) {
      return <span className="px-2 py-0.5 text-[8.5px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded">COM</span>;
    }
    return <span className="px-2 py-0.5 text-[8.5px] font-bold bg-zinc-800 text-zinc-450 rounded">GEN</span>;
  };

  return (
    <div className="space-y-6">
      
      {/* ========================================================================= */}
      {/* PASSIVE VIEW: DISPATCHES DASHBOARD */}
      {/* ========================================================================= */}
      {viewMode === 'passive' && (
        <div className="space-y-6 text-left">
          
          {/* Header Bar */}
          <div className="flex justify-between items-center bg-[#1c1c21] border border-zinc-800 p-4 shrink-0">
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono">Gestión de Despachos</h2>
              <p className="text-[11px] text-zinc-500 mt-0.5 font-medium leading-none">
                Control de salidas físicas y asignaciones de materiales a proyectos.
              </p>
            </div>
            
            <button
              onClick={() => {
                setSelectedItemIds([]);
                setDispatchQuantities({});
                setViewMode('active');
              }}
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold font-mono text-[10.5px] uppercase tracking-wider h-9 px-4 rounded-none flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
            >
              <Plus className="h-4 w-4 font-extrabold" /> Añadir Despacho
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Recent Dispatches Table (Left) */}
            <div className="lg:col-span-2 space-y-3 bg-[#1c1c21] border border-zinc-800 p-5 shadow-xl">
              <div className="flex items-center gap-1.5 border-b border-zinc-850 pb-2.5">
                <ClipboardList className="h-4.5 w-4.5 text-zinc-400" />
                <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Despachos Recientes</h3>
              </div>

              {loadingDispatches ? (
                <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-zinc-650 h-8 w-8" /></div>
              ) : recentDispatches.length === 0 ? (
                <div className="py-16 text-center text-zinc-600 text-xs italic font-mono border border-dashed border-zinc-850 rounded">
                  No hay despachos de proyectos registrados en el sistema.
                </div>
              ) : (
                <div className="border border-zinc-800 rounded overflow-x-auto bg-zinc-950/10">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-zinc-900/60 border-b border-zinc-800 text-[10px] font-bold text-zinc-450 uppercase tracking-wider">
                        <th className="px-4 py-3 text-left">ID</th>
                        <th className="px-4 py-3 text-left">Proyecto Destino</th>
                        <th className="px-4 py-3 text-left">Materiales Enviados</th>
                        <th className="px-4 py-3 text-left">Fecha/Hora</th>
                        <th className="px-4 py-3 text-right">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/80 font-mono text-zinc-300">
                      {recentDispatches.map((disp, idx) => (
                        <tr key={idx} className="hover:bg-zinc-800/10">
                          <td className="px-4 py-3 font-bold text-white">{disp.id}</td>
                          <td className="px-4 py-3 text-zinc-200 font-semibold font-sans">{disp.projectName}</td>
                          <td className="px-4 py-3 text-zinc-400 font-sans max-w-[200px] truncate" title={disp.itemsList.join(', ')}>
                            <strong className="text-white font-bold font-mono">{disp.itemsCount}</strong> unidades ({disp.itemsList.join(', ')})
                          </td>
                          <td className="px-4 py-3 text-zinc-500">
                            {new Date(disp.createdAt).toLocaleDateString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-extrabold px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                              {disp.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Sidebar Alerts / Mock queues (Right) */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Pendiente de Aprobación card */}
              <div className="bg-[#1c1c21] border border-zinc-800 p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
                    <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Pendiente de Aprobación</h3>
                  </div>
                  <span className="bg-amber-500/20 text-amber-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded font-mono">
                    1 Solicitud
                  </span>
                </div>
                
                <p className="text-zinc-500 text-[11px] leading-relaxed">
                  Los despachos de componentes de alto valor requieren validación secundaria por parte del encargado WMS.
                </p>

                <button
                  type="button"
                  onClick={loadMockupRequest}
                  className="w-full h-9 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold font-mono text-[10px] uppercase tracking-wider rounded transition-colors cursor-pointer flex items-center justify-center"
                >
                  Revisar Solicitudes
                </button>
              </div>

              {/* Materiales Preparados list */}
              <div className="bg-[#1c1c21] border border-zinc-800 p-5 space-y-4 shadow-xl">
                <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider border-b border-zinc-850 pb-2.5">
                  Materiales Preparados
                </h3>

                <div className="space-y-3 font-mono">
                  {/* Prepared item 1 */}
                  <div className="bg-zinc-950 p-3 border border-zinc-850 flex justify-between items-center text-xs">
                    <div>
                      <div className="text-[9px] text-zinc-500 uppercase font-bold">REO-8821</div>
                      <div className="text-white font-bold font-sans">Inverter Bank Type-C</div>
                      <div className="text-[9.5px] text-zinc-400 mt-0.5">Cant: <strong className="text-white">24</strong></div>
                    </div>
                    <span className="bg-[#121318] text-purple-400 border border-purple-500/10 text-[8.5px] px-2 py-0.5 rounded font-extrabold uppercase font-mono">
                      Zona B-4
                    </span>
                  </div>

                  {/* Prepared item 2 */}
                  <div className="bg-zinc-950 p-3 border border-zinc-850 flex justify-between items-center text-xs">
                    <div>
                      <div className="text-[9px] text-zinc-500 uppercase font-bold">REO-8822</div>
                      <div className="text-white font-bold font-sans">Monocrystalline Panels 400W</div>
                      <div className="text-[9.5px] text-zinc-400 mt-0.5">Cant: <strong className="text-white">120</strong></div>
                    </div>
                    <span className="bg-[#121318] text-purple-400 border border-purple-500/10 text-[8.5px] px-2 py-0.5 rounded font-extrabold uppercase font-mono">
                      Zona A-1
                    </span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* ACTIVE VIEW: WMS DISPATCH CREATOR WIZARD */}
      {/* ========================================================================= */}
      {viewMode === 'active' && (
        <div className="space-y-6 text-left">
          
          {/* Header navigation bar */}
          <div className="flex items-center gap-3 bg-[#1c1c21] border border-zinc-800 p-4 shrink-0">
            <button
              onClick={() => {
                setSelectedItemIds([]);
                setDispatchQuantities({});
                setViewMode('passive');
              }}
              className="h-8 w-8 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Volver"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Creación de Despacho Masivo</h2>
              <p className="text-[10px] text-zinc-500 font-mono">
                Selecciona materiales de la tabla e indica las cantidades destinadas a la obra.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Catalog table selector (Left) */}
            <div className="lg:col-span-2 space-y-4 bg-[#1c1c21] border border-zinc-800 p-5 shadow-xl">
              
              {/* Search tool */}
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar material, SKU..."
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50 h-10 font-semibold"
                />
              </div>

              {/* Items select table */}
              <div className="border border-zinc-800 rounded overflow-x-auto bg-zinc-950/10">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-zinc-900/60 border-b border-zinc-800 text-[10px] font-bold text-zinc-450 uppercase tracking-wider">
                      <th className="px-4 py-3 text-center w-12">Selec.</th>
                      <th className="px-4 py-3 w-16">Imagen</th>
                      <th className="px-4 py-3">Material / SKU</th>
                      <th className="px-4 py-3">Categoría</th>
                      <th className="px-4 py-3">Nivel de Stock</th>
                      <th className="px-4 py-3 text-right">Cant. Despacho</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {paginatedCatalog.map((item) => {
                      const isSelected = selectedItemIds.includes(item.id);
                      const imageUrl = resolveImageUrl(item.image_urls?.[0] || item.image_url);
                      const category = categories.find(c => c.id === item.category_id);

                      return (
                        <tr 
                          key={item.id} 
                          className={`hover:bg-zinc-800/10 transition-colors ${
                            isSelected ? 'bg-amber-500/5' : ''
                          }`}
                        >
                          {/* Checkbox checkbox */}
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(item.id)}
                              className="rounded border-zinc-800 bg-zinc-950 text-emerald-600 focus:ring-emerald-500/20 h-3.5 w-3.5 cursor-pointer"
                            />
                          </td>

                          {/* Image */}
                          <td className="px-4 py-3">
                            <div className="h-10 w-14 bg-zinc-950 border border-zinc-850 overflow-hidden flex items-center justify-center shrink-0">
                              {imageUrl ? (
                                <img src={imageUrl} alt={item.name} className="h-full w-full object-cover" />
                              ) : (
                                <Archive className="h-5 w-5 text-zinc-650" />
                              )}
                            </div>
                          </td>

                          {/* Name / SKU */}
                          <td className="px-4 py-3 text-left">
                            <div className="font-bold text-white">{item.name}</div>
                            <div className="text-[9.5px] text-zinc-550 font-mono mt-0.5 uppercase">{item.sku}</div>
                          </td>

                          {/* Category badge */}
                          <td className="px-4 py-3 text-left">
                            {getCategoryBadge(category?.name)}
                          </td>

                          {/* Stock Level Progress */}
                          <td className="px-4 py-3">
                            {renderStockProgress(item.stock, item.min_stock)}
                          </td>

                          {/* Qty dispatch input (enabled only when checked) */}
                          <td className="px-4 py-3 text-right">
                            <input
                              type="number"
                              disabled={!isSelected}
                              value={dispatchQuantities[item.id] || ''}
                              placeholder="0"
                              onChange={e => handleQtyChange(item.id, Number(e.target.value), item.stock)}
                              className={`bg-zinc-950 border border-zinc-850 rounded p-1 w-16 text-center font-mono text-xs focus:outline-none focus:border-emerald-500 ${
                                !isSelected ? 'opacity-30 cursor-not-allowed' : 'text-white font-bold'
                              }`}
                            />
                          </td>
                        </tr>
                      );
                    })}

                    {paginatedCatalog.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-zinc-600 text-xs italic font-mono">
                          No se encontraron materiales en el catálogo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-zinc-850 pt-4">
                  <span className="text-[10px] text-zinc-550 font-mono">
                    Página {currentPage} de {totalPages}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white px-2.5 py-1 text-[10px] font-bold text-zinc-400 rounded disabled:opacity-50 transition-all font-mono uppercase tracking-wider cursor-pointer"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white px-2.5 py-1 text-[10px] font-bold text-zinc-400 rounded disabled:opacity-50 transition-all font-mono uppercase tracking-wider cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Selection Sidebar (Right) */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Dispatch target configuration */}
              <div className="bg-[#1c1c21] border border-zinc-800 p-5 space-y-4 shadow-xl">
                <span className="text-xs font-bold text-white font-mono uppercase tracking-widest block border-b border-zinc-850 pb-2">
                  Destino del Envío
                </span>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Proyecto / Obra Asignada *</label>
                  <select
                    value={selectedProjectId}
                    onChange={e => setSelectedProjectId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded p-2 text-xs text-white focus:outline-none font-semibold cursor-pointer"
                  >
                    <option value="">Seleccionar Proyecto</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Banner notice warning */}
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3 text-[10px] flex gap-2 font-medium">
                  <Info className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>Estos materiales se descontarán del stock global y se asignarán al BOM del proyecto seleccionado.</span>
                </div>

                {/* Submit button */}
                <button
                  type="button"
                  onClick={handleExecuteDispatch}
                  disabled={actionLoading || selectedItemIds.length === 0 || !selectedProjectId}
                  className="w-full h-10 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-black font-extrabold font-mono text-[10.5px] uppercase tracking-wider rounded transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin text-black" /> : null}
                  Despachar a Proyecto
                </button>
              </div>

              {/* Selected items summary */}
              <div className="bg-[#1c1c21] border border-zinc-800 p-5 space-y-4 shadow-xl text-left">
                <span className="text-xs font-bold text-white font-mono uppercase tracking-widest block border-b border-zinc-850 pb-2">
                  Resumen de Envío ({selectedItemIds.length})
                </span>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {selectedItemIds.map(id => {
                    const item = items.find(x => x.id === id);
                    if (!item) return null;
                    const imageUrl = resolveImageUrl(item.image_urls?.[0] || item.image_url);
                    const qty = dispatchQuantities[id] || 0;

                    return (
                      <div key={id} className="flex gap-2 items-center bg-zinc-950 p-2 border border-zinc-850 text-xs">
                        <div className="h-8 w-11 bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
                          {imageUrl ? (
                            <img src={imageUrl} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <Archive className="h-4 w-4 text-zinc-650" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-white truncate">{item.name}</div>
                          <div className="text-[9px] text-zinc-550 font-mono">Cant: {qty}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleSelect(id)}
                          className="text-zinc-500 hover:text-rose-500 p-1 cursor-pointer shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}

                  {selectedItemIds.length === 0 && (
                    <div className="text-xs italic text-zinc-600 font-mono py-2">
                      Ningún material seleccionado.
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
