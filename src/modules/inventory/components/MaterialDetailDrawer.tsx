'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  History, 
  Edit3, 
  Package, 
  Sliders, 
  Truck, 
  FileText, 
  Store, 
  Loader2, 
  ChevronUp, 
  ChevronDown,
  ArrowLeft,
  Settings
} from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { RequirePermission } from '@/core/auth/AuthContext';
import { 
  InventoryItemRow, 
  InventoryCategoryRow, 
  InventoryTransactionWithUser 
} from '@/core/services/inventory';
import { getApiUrl } from '@/core/utils/api';
import { supabase } from '@/core/database/supabase';

interface MaterialDetailDrawerProps {
  isDetailDrawerOpen: boolean;
  setIsDetailDrawerOpen: (open: boolean) => void;
  selectedItem: InventoryItemRow | null;
  itemTransactions: InventoryTransactionWithUser[];
  loadingTransactions: boolean;
  activeImgUrl: string | null;
  setActiveImgUrl: (url: string | null) => void;
  categories: InventoryCategoryRow[];
  handleStartEdit: () => void;
  openBulkAdjustment?: (overrideItems?: any[]) => void;
}

export function MaterialDetailDrawer({
  isDetailDrawerOpen,
  setIsDetailDrawerOpen,
  selectedItem,
  itemTransactions,
  loadingTransactions,
  activeImgUrl,
  setActiveImgUrl,
  categories,
  handleStartEdit,
  openBulkAdjustment
}: MaterialDetailDrawerProps) {
  // Tab control: 'info' | 'history'
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');

  // Supabase access token for images previsualización
  const [token, setToken] = useState<string | null>(null);

  // Load session token on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token || null);
    });
  }, []);

  // Reset tab to info when selected item changes
  useEffect(() => {
    if (selectedItem) {
      setActiveTab('info');
    }
  }, [selectedItem]);

  if (!isDetailDrawerOpen || !selectedItem) return null;

  // Helper to resolve and authorize relative image URLs in static-export
  const resolveImageUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('/api/storage/file/')) {
      return getApiUrl(`${url}${url.includes('?') ? '&' : '?'}token=${token || ''}`);
    }
    return url;
  };

  // Helper to calculate cheapest price dynamically
  const getCheapestPrice = () => {
    if (!selectedItem) return 0;
    if (!selectedItem.providers || selectedItem.providers.length === 0) return selectedItem.cost;
    const prices = selectedItem.providers.map(p => {
      const parts = p.split(' - $');
      if (parts.length === 2) return parseFloat(parts[1]) || selectedItem.cost;
      return selectedItem.cost;
    });
    return Math.min(...prices);
  };

  // Helper to parse provider string for display in the table/details
  const parseProviderForDisplay = (providerStr: string) => {
    const parts = providerStr.split(' - $');
    if (parts.length === 2) {
      return { name: parts[0].trim(), price: parseFloat(parts[1]) || 0 };
    }
    return { name: providerStr.trim(), price: selectedItem?.cost || 0 };
  };

  const category = categories.find(c => c.id === selectedItem.category_id);
  const cheapestPrice = getCheapestPrice();
  const resolvedMainImage = resolveImageUrl(activeImgUrl);
  const images = selectedItem.image_urls || [];

  // Stock values for progress bar
  const currentStock = selectedItem.stock || 0;
  const minStock = selectedItem.min_stock || 1;
  const isLowStock = currentStock < minStock;
  const maxBarValue = minStock * 2.5;
  const progressPercent = Math.min((currentStock / maxBarValue) * 100, 100);

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        onClick={() => setIsDetailDrawerOpen(false)} 
        className="fixed top-16 inset-x-0 bottom-0 bg-black/75 backdrop-blur-xs z-40 transition-opacity" 
      />

      {/* Main Drawer container - matched to w-full max-w-4xl (896px) */}
      <div className="fixed top-16 bottom-0 right-0 w-full max-w-4xl bg-[#051424] border-l border-zinc-800 shadow-2xl flex flex-col z-50 transform transition-transform duration-300 animate-in slide-in-from-right duration-300">
        
        {/* Sticky Header */}
        <header className="sticky top-0 bg-[#051424]/80 backdrop-blur-sm border-b border-zinc-800 p-4.5 flex justify-between items-center z-10 shrink-0">
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => setIsDetailDrawerOpen(false)}
              className="p-2 hover:bg-[#122131] rounded-full text-[#d4e4fa] transition-colors cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>
            <h2 className="font-mono text-base font-bold tracking-wider uppercase text-[#d4e4fa]">
              {activeTab === 'info' ? 'Detalle de Material' : 'Historial Kardex'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* History Toggle Button */}
            <button
              type="button"
              onClick={() => setActiveTab(prev => prev === 'history' ? 'info' : 'history')}
              className={`border border-zinc-800 text-[#d4e4fa] font-mono text-xs font-bold uppercase tracking-wider h-[36px] px-5 rounded hover:bg-[#122131] transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'history' ? 'bg-[#122131] border-[#fbbf24] text-[#fbbf24]' : ''
              }`}
            >
              <History className="h-5 w-5" />
              <span>Historial</span>
            </button>

            {/* Edit Button */}
            <RequirePermission action="inventory:write">
              <button
                type="button"
                onClick={handleStartEdit}
                className="bg-[#fbbf24] hover:bg-[#d97706] text-black font-mono text-xs font-bold uppercase tracking-wider h-[36px] px-5 rounded transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Edit3 className="h-5 w-5" />
                <span>Editar</span>
              </button>
            </RequirePermission>
          </div>
        </header>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[#051424] [&::-webkit-scrollbar-thumb]:bg-[#3f465c] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#adb4ce]">
          
          {activeTab === 'info' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Side: Media, title & description (lg:col-span-2) */}
              <div className="lg:col-span-2 space-y-6">
                {/* Title & SKU block */}
                <div className="space-y-1.5 pb-1">
                  <h1 className="text-2xl font-bold text-[#d4e4fa] tracking-tight leading-tight">
                    {selectedItem.name}
                  </h1>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className={`font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[2px] border ${
                      currentStock > 0
                        ? 'bg-[#1a365d] text-[#7dd3fc] border-[#1d4ed8]/30'
                        : 'bg-rose-950 text-rose-300 border-rose-800/30'
                    }`}>
                      {currentStock > 0 ? 'En Stock' : 'Agotado'}
                    </span>
                    <p className="font-mono text-sm text-[#d3c5ac]">{selectedItem.sku}</p>
                  </div>
                </div>

                {/* Image Section */}
                <div className="space-y-3.5">
                  <div className="bg-[#122131] border border-[#334155] rounded-xl p-1 h-[280px] flex items-center justify-center relative overflow-hidden shadow-inner">
                    {resolvedMainImage ? (
                      <img 
                        src={resolvedMainImage} 
                        alt={selectedItem.name} 
                        className="w-full h-full object-contain opacity-90 transition-opacity" 
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-[#d3c5ac]/50">
                        <Package className="h-16 w-16 mb-2" />
                        <span className="text-xs font-mono uppercase font-bold tracking-wider">Sin imagen</span>
                      </div>
                    )}
                  </div>

                  {/* Thumbnails list + 4th static camera slot */}
                  <div className="grid grid-cols-4 gap-2.5">
                    {images.slice(0, 3).map((url, idx) => {
                      const thumbUrl = resolveImageUrl(url);
                      const isActive = activeImgUrl === url;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveImgUrl(url)}
                          className={`aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                            isActive 
                              ? 'border-[#fbbf24] scale-95 ring-2 ring-[#fbbf24]/20' 
                              : 'border-[#334155] opacity-60 hover:opacity-100'
                          }`}
                        >
                          {thumbUrl && (
                            <img src={thumbUrl} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                          )}
                        </button>
                      );
                    })}
                    {/* Fill remaining real slots up to 3 */}
                    {Array.from({ length: Math.max(3 - images.slice(0, 3).length, 0) }).map((_, i) => (
                      <div 
                        key={`empty-${i}`} 
                        className="aspect-square rounded-lg border border-[#334155]/40 bg-[#122131]/40 flex items-center justify-center text-[#d3c5ac]/20 select-none"
                      >
                        <Package className="h-6 w-6" />
                      </div>
                    ))}
                    {/* 4th slot: Camera icon placeholder */}
                    <div className="aspect-square rounded-lg border border-[#334155] border-dashed flex items-center justify-center bg-[#122131]/60 text-[#d3c5ac]/40">
                      <Store className="h-6 w-6" />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-[#122131] border border-[#334155] rounded-xl p-5">
                  <h3 className="font-mono text-xs font-bold tracking-wider uppercase text-[#d3c5ac] mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#fbbf24]" />
                    <span>Descripción</span>
                  </h3>
                  <p className="text-sm text-[#d3c5ac] leading-relaxed">
                    {selectedItem.description || 'Sin descripción técnica registrada para este material.'}
                  </p>
                </div>

                {/* Suppliers */}
                <div className="bg-[#122131] border border-[#334155] rounded-xl p-5">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-mono text-xs font-bold tracking-wider uppercase text-[#d3c5ac] flex items-center gap-2">
                      <Store className="h-5 w-5 text-[#fbbf24]" />
                      <span>Proveedores</span>
                    </h3>
                  </div>
                  <div className="space-y-2.5">
                    {selectedItem.providers && selectedItem.providers.length > 0 ? (
                      selectedItem.providers.map((pStr, idx) => {
                        const parsed = parseProviderForDisplay(pStr);
                        return (
                          <div key={idx} className="flex justify-between items-center p-3 bg-[#1c2b3c]/30 rounded-lg border border-[#334155]/20">
                            <div className="flex items-center gap-2.5">
                              <Store className="h-5 w-5 text-[#d3c5ac]" />
                              <span className="text-sm font-semibold text-[#d4e4fa]">{parsed.name}</span>
                            </div>
                            <span className="font-mono text-sm font-bold text-emerald-400">
                              ${parsed.price.toFixed(2)}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-sm italic text-[#d3c5ac]/50 py-2">
                        Sin proveedores vinculados.
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Right Side: Inventory, Specs & Logistics (lg:col-span-1) */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* Stock summary card with styled progress bar */}
                <div className="bg-[#122131] border border-[#334155] rounded-xl p-5">
                  <h3 className="font-mono text-xs font-bold tracking-wider uppercase text-[#d3c5ac] mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5 text-[#fbbf24]" />
                    <span>Stock e Inventario</span>
                  </h3>
                  
                  <div className="grid grid-cols-3 gap-2 font-mono text-center mb-4">
                    <div>
                      <p className="text-[10px] font-bold text-[#d3c5ac]/70 uppercase tracking-wide">Actual</p>
                      <p className="text-2xl font-bold text-[#d4e4fa] mt-1">{currentStock.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#d3c5ac]/70 uppercase tracking-wide">Mínimo</p>
                      <p className="text-2xl font-bold text-[#d4e4fa] mt-1">{minStock.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#d3c5ac]/70 uppercase tracking-wide">Unidad</p>
                      <p className="text-2xl font-bold text-[#d4e4fa] mt-1 uppercase">{selectedItem.unit}</p>
                    </div>
                  </div>

                  {/* Dynamically colored progress bar */}
                  <div className="w-full bg-[#334155] h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isLowStock ? 'bg-rose-500' : 'bg-[#fbbf24]'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Specs */}
                <div className="bg-[#122131] border border-[#334155] rounded-xl p-5">
                  <h3 className="font-mono text-xs font-bold tracking-wider uppercase text-[#d3c5ac] mb-3 flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-[#fbbf24]" />
                    <span>Especificaciones</span>
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center pb-2 border-b border-[#334155]/40">
                      <span className="text-[#d3c5ac]">Categoría</span>
                      <span className="font-mono text-[#d4e4fa]">{category ? category.name : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-[#334155]/40">
                      <span className="text-[#d3c5ac]">Costo</span>
                      <span className="font-mono text-[#d4e4fa] font-bold">
                        ${selectedItem.cost.toFixed(2)}/{selectedItem.unit}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#d3c5ac]">Reorden</span>
                      <span className="font-mono text-amber-500 font-bold">
                        {selectedItem.min_stock} {selectedItem.unit}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Logistics */}
                <div className="bg-[#122131] border border-[#334155] rounded-xl p-5">
                  <h3 className="font-mono text-xs font-bold tracking-wider uppercase text-[#d3c5ac] mb-3 flex items-center gap-2">
                    <Truck className="h-5 w-5 text-[#fbbf24]" />
                    <span>Logística</span>
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center pb-2 border-b border-[#334155]/40">
                      <span className="text-[#d3c5ac]">Embalaje</span>
                      <span className="font-mono text-[#d4e4fa] uppercase font-semibold">
                        {selectedItem.packaging || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#d3c5ac]">Peso</span>
                      <span className="font-mono text-[#d4e4fa] font-bold">
                        {selectedItem.weight ? `${selectedItem.weight} kg` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            /* Kardex transaction history timeline tab */
            <div className="max-w-2xl mx-auto py-2 text-left">
              {loadingTransactions ? (
                <div className="py-20 flex justify-center items-center gap-2.5">
                  <Loader2 className="h-6 w-6 animate-spin text-[#fbbf24]" />
                  <span className="text-sm text-[#d3c5ac]">Cargando Kardex...</span>
                </div>
              ) : itemTransactions.length === 0 ? (
                <div className="py-12 text-center text-[#d3c5ac]/50 italic text-sm font-mono border border-dashed border-zinc-800 rounded-lg bg-[#122131]/30">
                  No hay movimientos registrados en Kardex para este material.
                </div>
              ) : (
                <div className="relative border-l border-[#334155]/60 ml-4 pl-6 space-y-7">
                  {itemTransactions.map((tx) => {
                    const dateStr = new Date(tx.created_at).toLocaleString([], {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    const isEntry = tx.transaction_type === 'entrada';

                    return (
                      <div key={tx.id} className="relative">
                        {/* Timeline dot */}
                        <div className="absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#122131] ring-4 ring-[#051424] flex items-center justify-center">
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            isEntry ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                          }`} />
                        </div>

                        {/* Event content */}
                        <div className="space-y-2">
                          <span className="text-[10px] bg-[#122131] border border-[#334155]/60 text-[#d3c5ac]/80 px-2.5 py-0.5 rounded font-mono">
                            {dateStr}
                          </span>
                          <div className="text-sm font-bold text-[#d4e4fa] leading-snug">
                            {isEntry 
                              ? `Ingreso de ${tx.quantity} ${selectedItem.unit}` 
                              : tx.transaction_type === 'salida'
                              ? `Salida de ${Math.abs(tx.quantity)} ${selectedItem.unit}`
                              : `Ajuste de stock: ${tx.quantity} ${selectedItem.unit}`
                            }
                          </div>
                          {tx.reason && <p className="text-sm text-[#d3c5ac]/85 leading-relaxed">{tx.reason}</p>}
                          <div className="flex items-center gap-1.5 text-xs text-[#d3c5ac]/60 font-mono">
                            <span>Por: {tx.profiles?.full_name || 'Sistema / API'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </>
  );
}
