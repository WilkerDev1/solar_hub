'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Edit3, Trash2, Plus, Loader2, History, User, 
  Archive, FileText, X, Settings, MoreHorizontal, ChevronUp, ChevronDown,
  Trash, PlusCircle
} from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { RequirePermission, useAuth } from '@/core/auth/AuthContext';
import { 
  InventoryItemRow, 
  InventoryCategoryRow, 
  InventoryTagRow, 
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

interface LocalNote {
  id: string;
  userName: string;
  userAvatar: string | null;
  createdAt: string;
  content: string;
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
  const { user } = useAuth();
  
  // Tab control: 'info' | 'history' | 'notes'
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'notes'>('info');

  // Status toggle
  const [isActive, setIsActive] = useState(true);

  // Local Notes state
  const [notes, setNotes] = useState<LocalNote[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');

  // Supabase access token for images previsualización
  const [token, setToken] = useState<string | null>(null);

  // Load session token on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token || null);
    });
  }, []);

  // Load notes on item change (no fake defaults!)
  useEffect(() => {
    if (selectedItem) {
      const stored = localStorage.getItem(`solar_hub_item_notes_${selectedItem.id}`);
      if (stored) {
        setNotes(JSON.parse(stored));
      } else {
        setNotes([]); // Clean empty slate!
      }
      setIsActive(selectedItem.stock > 0);
    }
  }, [selectedItem, isDetailDrawerOpen]);

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

  // Add new note to local list
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    const newNote: LocalNote = {
      id: Date.now().toString(),
      userName: user?.fullName || 'Operator Alpha',
      userAvatar: user?.avatarUrl || null,
      createdAt: new Date().toISOString(),
      content: newNoteContent.trim()
    };

    const updated = [newNote, ...notes];
    if (selectedItem) {
      localStorage.setItem(`solar_hub_item_notes_${selectedItem.id}`, JSON.stringify(updated));
    }
    setNotes(updated);
    setNewNoteContent('');
  };

  if (!isDetailDrawerOpen || !selectedItem) return null;

  const category = categories.find(c => c.id === selectedItem.category_id);
  const cheapestPrice = getCheapestPrice();
  const resolvedMainImage = resolveImageUrl(activeImgUrl);

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        onClick={() => setIsDetailDrawerOpen(false)} 
        className="fixed inset-0 bg-black/75 backdrop-blur-xs z-40 transition-opacity" 
      />

      {/* Main Drawer container */}
      <div className="fixed inset-y-0 right-0 w-full max-w-4xl bg-[#121318] border-l border-zinc-850 shadow-2xl flex flex-col z-50 transform transition-transform duration-300">
        
        {/* TOP STATUS BAR */}
        <div className="p-4 border-b border-zinc-850/80 flex justify-between items-center bg-[#15171d] shrink-0">
          {/* Back button */}
          <button 
            type="button"
            onClick={() => setIsDetailDrawerOpen(false)} 
            className="h-8 w-8 rounded-lg hover:bg-zinc-855 text-zinc-405 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {/* Right actions */}
          <div className="flex items-center gap-4">
            {/* Active Toggle Switch */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Active</span>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isActive ? 'bg-emerald-500' : 'bg-zinc-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Separator line */}
            <span className="h-4 w-px bg-zinc-800" />
            <RequirePermission action="inventory:write">
              <button
                type="button"
                onClick={handleStartEdit}
                className="px-3 py-1 text-[11px] font-bold font-mono uppercase tracking-wider rounded-md border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer"
              >
                Edit
              </button>

              <button
                type="button"
                onClick={() => {
                  alert('Clonando ficha de material: ' + selectedItem.name);
                }}
                className="px-3 py-1 text-[11px] font-bold font-mono uppercase tracking-wider rounded-md border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer"
              >
                Clone
              </button>
            </RequirePermission>

            <button 
              type="button"
              className="p-1 rounded hover:bg-zinc-850 text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* MATERIAL TITLE HEADER SECTION */}
        <div className="px-6 pt-5 pb-3 border-b border-zinc-850/50 bg-[#121318] shrink-0 text-left space-y-1">
          <h1 className="text-xl font-bold text-white tracking-wide">
            {selectedItem.name}
          </h1>
          <div className="flex items-center gap-2 text-xs text-zinc-450 font-mono">
            <span className="font-semibold text-zinc-400">SKU: {selectedItem.sku}</span>
            <span>•</span>
            <span>{category ? category.name : 'Sin categoría'}</span>
            <span>•</span>
            <span className="bg-zinc-900 border border-zinc-800 text-[9px] px-2 py-0.5 rounded text-zinc-400 font-semibold uppercase tracking-wider font-mono">
              Stocked Product
            </span>
          </div>
        </div>

        {/* TAB SWITCHER */}
        <div className="px-6 bg-[#121318] flex gap-2 border-b border-zinc-855 shrink-0">
          <button
            onClick={() => {
              setActiveTab('info');
            }}
            className={`py-3.5 px-1 text-[11px] font-bold font-mono uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeTab === 'info'
                ? 'border-emerald-500 text-emerald-400 font-extrabold'
                : 'border-transparent text-zinc-500 hover:text-zinc-355'
            }`}
          >
            General Information
          </button>
          <button
            onClick={() => {
              setActiveTab('history');
            }}
            className={`py-3.5 px-1 text-[11px] font-bold font-mono uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'border-emerald-500 text-emerald-400 font-extrabold'
                : 'border-transparent text-zinc-500 hover:text-zinc-355'
            }`}
          >
            History
          </button>
          <button
            onClick={() => {
              setActiveTab('notes');
            }}
            className={`py-3.5 px-1 text-[11px] font-bold font-mono uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeTab === 'notes'
                ? 'border-emerald-500 text-emerald-400 font-extrabold'
                : 'border-transparent text-zinc-500 hover:text-zinc-355'
            }`}
          >
            Notes
          </button>
        </div>

        {/* BODY CONTENT SCROLLABLE PANEL */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-900 bg-[#121318]">
          
          {/* ========================================================================= */}
          {/* TAB 1: GENERAL INFORMATION */}
          {/* ========================================================================= */}
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
                  
                  {/* Left Column (Images, Basic Info, Dimensions, Costs) */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* Image Carousel Panel */}
                    <div className="flex gap-4 items-start">
                      {/* Main Image */}
                      <div className="flex-1 aspect-[4/3] bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner relative">
                        {resolvedMainImage ? (
                          <img src={resolvedMainImage} alt={selectedItem.name} className="h-full w-full object-contain" />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-zinc-700">
                            <Archive className="h-12 w-12 mb-2" />
                            <span className="text-[10px] font-mono uppercase font-bold tracking-wider">Sin imagen</span>
                          </div>
                        )}
                      </div>

                      {/* Vertical thumbnails strip */}
                      {(selectedItem.image_urls || []).length > 0 && (
                        <div className="flex flex-col gap-2 shrink-0 items-center">
                          <button type="button" className="text-zinc-550 hover:text-white cursor-pointer"><ChevronUp className="h-4 w-4" /></button>
                          <div className="flex flex-col gap-2 max-h-[170px] overflow-y-auto pr-1 scrollbar-none">
                            {(selectedItem.image_urls || []).map((url, idx) => {
                              const thumbUrl = resolveImageUrl(url);
                              return (
                                <button
                                  key={idx}
                                  onClick={() => setActiveImgUrl(url)}
                                  className={`h-11 w-11 rounded-lg overflow-hidden border shrink-0 transition-all cursor-pointer ${
                                    activeImgUrl === url 
                                      ? 'border-emerald-500 scale-95 ring-2 ring-emerald-500/20' 
                                      : 'border-zinc-800 opacity-60 hover:opacity-100'
                                  }`}
                                >
                                  {thumbUrl && <img src={thumbUrl} alt={`Thumbnail ${idx}`} className="h-full w-full object-cover" />}
                                </button>
                              );
                            })}
                          </div>
                          <button type="button" className="text-zinc-550 hover:text-white cursor-pointer"><ChevronDown className="h-4 w-4" /></button>
                        </div>
                      )}
                    </div>

                    {/* Basic Information Card */}
                    <div className="bg-[#15171d]/60 border border-zinc-850/50 p-5 rounded-2xl space-y-3.5">
                      <h3 className="text-xs font-bold text-white font-mono uppercase tracking-widest border-b border-zinc-850/30 pb-2">
                        Basic Information
                      </h3>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
                        <div className="space-y-0.5">
                          <div className="text-[9.5px] font-bold text-zinc-550 uppercase tracking-wide font-mono">PRODUCT TYPE</div>
                          <div className="text-white font-medium">Stocked Product</div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-[9.5px] font-bold text-zinc-550 uppercase tracking-wide font-mono">CATEGORY</div>
                          <div className="text-white font-medium">{category ? category.name : 'N/A'}</div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-[9.5px] font-bold text-zinc-550 uppercase tracking-wide font-mono">SKU / CODE</div>
                          <div className="text-white font-mono">{selectedItem.sku}</div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-[9.5px] font-bold text-zinc-550 uppercase tracking-wide font-mono">UNIT</div>
                          <div className="text-white font-mono uppercase">{selectedItem.unit}</div>
                        </div>
                        {selectedItem.description && (
                          <div className="col-span-2 space-y-0.5 pt-1.5">
                            <div className="text-[9.5px] font-bold text-zinc-550 uppercase tracking-wide font-mono">DESCRIPTION</div>
                            <div className="text-zinc-350 leading-relaxed text-[11.5px]">{selectedItem.description}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dimensions & Measurement Card */}
                    <div className="bg-[#15171d]/60 border border-zinc-850/50 p-5 rounded-2xl space-y-3.5">
                      <h3 className="text-xs font-bold text-white font-mono uppercase tracking-widest border-b border-zinc-850/30 pb-2">
                        Measurement
                      </h3>
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div className="space-y-0.5">
                          <div className="text-[9.5px] font-bold text-zinc-550 uppercase tracking-wide font-mono">WIDTH / LENGTH</div>
                          <div className="text-white font-mono font-bold">
                            {selectedItem.length ? `${selectedItem.length} m` : 'N/A'}
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-[9.5px] font-bold text-zinc-550 uppercase tracking-wide font-mono">EMBALAJE</div>
                          <div className="text-white font-medium">
                            {selectedItem.packaging || 'N/A'}
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-[9.5px] font-bold text-zinc-550 uppercase tracking-wide font-mono">WEIGHT</div>
                          <div className="text-white font-mono font-bold">
                            {selectedItem.weight ? `${selectedItem.weight} kg` : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Purchase & Financial Information Card */}
                    <div className="bg-[#15171d]/60 border border-zinc-850/50 p-5 rounded-2xl space-y-4">
                      <h3 className="text-xs font-bold text-white font-mono uppercase tracking-widest border-b border-zinc-850/30 pb-2">
                        Valores Financieros de Adquisición
                      </h3>
                      <div className="grid grid-cols-3 gap-6 text-xs font-mono">
                        <div className="space-y-1">
                          <div className="text-[9.5px] font-bold text-zinc-550 uppercase tracking-wide">EST. MIN COST / UNIT</div>
                          <div className="text-white font-bold text-sm">
                            ${cheapestPrice.toFixed(2)}
                          </div>
                          <div className="text-[8px] text-zinc-500 uppercase tracking-wider">Costo Más Barato</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[9.5px] font-bold text-zinc-550 uppercase tracking-wide">TOTAL STOCK VALUE</div>
                          <div className="text-white font-bold text-sm">
                            ${(cheapestPrice * selectedItem.stock).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[8px] text-zinc-500 uppercase tracking-wider">Valor en Almacén</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[9.5px] font-bold text-zinc-550 uppercase tracking-wide">PUNTO REORDEN</div>
                          <div className="text-amber-500 font-bold text-sm">
                            {selectedItem.min_stock} {selectedItem.unit}
                          </div>
                          <div className="text-[8px] text-amber-550 uppercase tracking-wider">Mínimo Crítico</div>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Right Column (Sidebar - Stock & Providers list) */}
                  <div className="lg:col-span-1 space-y-6">
                    
                    {/* Stock Card */}
                    <div className="bg-[#15171d] border border-zinc-800 p-5 rounded-2xl space-y-4 shadow-xl">
                      <span className="text-xs font-bold text-white font-mono uppercase tracking-widest">Stock</span>
                      
                      <div className="text-center py-4 space-y-1">
                        <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                          QUANTITY AT HAND
                        </div>
                        <div className="text-4xl font-extrabold text-white font-mono">
                          {selectedItem.stock}
                        </div>
                        <div className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest">
                          {selectedItem.unit} disponibles
                        </div>
                      </div>

                      <RequirePermission action="inventory:write">
                        <button
                          type="button"
                          onClick={() => {
                            setIsDetailDrawerOpen(false);
                            if (openBulkAdjustment && selectedItem) {
                              openBulkAdjustment([selectedItem]);
                            }
                          }}
                          className="w-full h-10 border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 font-bold font-mono text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1"
                        >
                          Adjust Stock
                        </button>
                      </RequirePermission>
                    </div>

                    {/* Providers & Prices Card (Requirement 3: Removed Reorder points, kept suppliers) */}
                    <div className="bg-[#15171d] border border-zinc-800 p-5 rounded-2xl space-y-4 shadow-xl text-left">
                      <span className="text-xs font-bold text-white font-mono uppercase tracking-widest">Proveedores Vinculados</span>

                      <div className="space-y-3 pt-2">
                        {selectedItem.providers && selectedItem.providers.length > 0 ? (
                          selectedItem.providers.map((pStr, idx) => {
                            const parsed = parseProviderForDisplay(pStr);
                            return (
                              <div key={idx} className="flex justify-between items-center text-xs border-b border-zinc-850 pb-2">
                                <div className="space-y-0.5">
                                  <div className="font-bold text-white">{parsed.name}</div>
                                  <div className="text-[8.5px] text-zinc-500 font-mono uppercase">Proveedor registrado</div>
                                </div>
                                <span className="font-mono text-sm font-bold text-emerald-405">
                                  ${parsed.price.toFixed(2)}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-xs italic text-zinc-600 py-2 font-mono">
                            Sin proveedores vinculados.
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

              </div>
            )
          }

          {/* ========================================================================= */}
          {/* TAB 2: TRANSACTION HISTORY TIMELINE */}
          {/* ========================================================================= */}
          {activeTab === 'history' && (
            <div className="max-w-xl mx-auto py-4 text-left">
              {loadingTransactions ? (
                <div className="py-20 flex justify-center items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                  <span className="text-xs text-zinc-500">Cargando Kardex...</span>
                </div>
              ) : itemTransactions.length === 0 ? (
                <div className="py-12 text-center text-zinc-650 italic text-xs font-mono border border-dashed border-zinc-850 rounded">
                  No hay movimientos registrados en Kardex para este material.
                </div>
              ) : (
                <div className="relative border-l border-zinc-800 ml-4 pl-6 space-y-7">
                  {itemTransactions.map((tx) => {
                    const dateStr = new Date(tx.created_at).toLocaleString([], {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div key={tx.id} className="relative">
                        {/* Timeline dot */}
                        <div className="absolute -left-[31px] top-1 h-2.5 w-2.5 rounded-full bg-zinc-700 ring-4 ring-[#121318] flex items-center justify-center">
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            tx.transaction_type === 'entrada' ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'
                          }`} />
                        </div>

                        {/* Event content */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-450 px-2 py-0.5 rounded font-mono">
                            {dateStr}
                          </span>
                          <div className="text-xs font-bold text-white leading-snug">
                            {tx.transaction_type === 'entrada' 
                              ? `Ingreso de ${tx.quantity} ${selectedItem.unit}` 
                              : tx.transaction_type === 'salida'
                              ? `Salida de ${Math.abs(tx.quantity)} ${selectedItem.unit}`
                              : `Ajuste de stock: ${tx.quantity} ${selectedItem.unit}`
                            }
                          </div>
                          <p className="text-[11px] text-zinc-405 leading-relaxed font-sans">{tx.reason}</p>
                          <div className="flex items-center gap-1 text-[9.5px] text-zinc-550 font-mono">
                            <User className="h-3 w-3 shrink-0" />
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

          {/* ========================================================================= */}
          {/* TAB 3: NOTES & COMMENTS */}
          {/* ========================================================================= */}
          {activeTab === 'notes' && (
            <div className="max-w-xl mx-auto space-y-6 text-left">
              {/* Write note form */}
              <form onSubmit={handleAddNote} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-550 uppercase font-mono tracking-wider">
                    Add new notes
                  </label>
                  <textarea
                    placeholder="Add notes here..."
                    value={newNoteContent}
                    onChange={e => setNewNoteContent(e.target.value)}
                    className="w-full bg-[#15171d] border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-zinc-700 h-24 resize-none"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold uppercase tracking-wider px-4.5 h-8.5 rounded-lg cursor-pointer"
                >
                  Add Notes
                </Button>
              </form>

              {/* Notes Feed list (Requirement 5: No simulated default comments!) */}
              <div className="space-y-3">
                {notes.map((note) => {
                  const timeAgoStr = new Date(note.createdAt).toLocaleDateString([], {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div 
                      key={note.id}
                      className="bg-[#15171d]/60 border border-zinc-850 p-4 rounded-xl space-y-3 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-mono font-bold text-white uppercase overflow-hidden">
                            {note.userAvatar ? (
                              <img src={note.userAvatar} alt="Avatar" className="h-full w-full object-cover" />
                            ) : (
                              note.userName.substring(0, 2)
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white leading-tight">
                              {note.userName}
                            </div>
                            <div className="text-[8.5px] text-zinc-550 font-mono mt-0.5">
                              {timeAgoStr}
                            </div>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-zinc-350 leading-relaxed font-sans">
                        {note.content}
                      </p>
                    </div>
                  );
                })}

                {notes.length === 0 && (
                  <div className="py-12 text-center text-zinc-600 text-xs italic font-mono border border-dashed border-zinc-850 rounded">
                    No hay notas registradas para este material. Escribe una nota arriba para comenzar.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* BOTTOM DRAWER BAR */}
        <div className="p-4 border-t border-zinc-850 shrink-0 flex justify-between items-center bg-[#15171d] bg-opacity-40">
          <RequirePermission action="inventory:write">
            <Button
              onClick={handleStartEdit}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold uppercase tracking-wider h-9 px-4.5 rounded cursor-pointer"
            >
              <Edit3 className="h-4 w-4 mr-1.5" /> Edit Material
            </Button>
          </RequirePermission>
          <Button 
            onClick={() => setIsDetailDrawerOpen(false)} 
            className="bg-zinc-900 border border-zinc-800 text-zinc-455 hover:text-white font-mono text-[10px] font-bold uppercase tracking-wider h-9 px-4 rounded"
          >
            Close
          </Button>
        </div>

      </div>
    </>
  );
}
