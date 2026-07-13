'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Edit3, Trash2, Plus, Loader2, History, User, 
  Archive, FileText, Check, Settings, Eye, HelpCircle, 
  MoreHorizontal, ChevronUp, ChevronDown, CheckSquare, PlusCircle
} from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { RequirePermission, useAuth } from '@/core/auth/AuthContext';
import { 
  InventoryItemRow, 
  InventoryCategoryRow, 
  InventoryTagRow, 
  InventoryTransactionWithUser 
} from '@/core/services/inventory';

interface MaterialDetailDrawerProps {
  isDetailDrawerOpen: boolean;
  setIsDetailDrawerOpen: (open: boolean) => void;
  selectedItem: InventoryItemRow | null;
  itemTransactions: InventoryTransactionWithUser[];
  loadingTransactions: boolean;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  activeImgUrl: string | null;
  setActiveImgUrl: (url: string | null) => void;
  editForm: any;
  setEditForm: (form: any) => void;
  uploadingImage: boolean;
  actionLoading: boolean;
  categories: InventoryCategoryRow[];
  tags: InventoryTagRow[];
  handleStartEdit: () => void;
  handleSaveEdit: (e: React.FormEvent) => Promise<void>;
  handleEditImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
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
  isEditing,
  setIsEditing,
  activeImgUrl,
  setActiveImgUrl,
  editForm,
  setEditForm,
  uploadingImage,
  actionLoading,
  categories,
  tags,
  handleStartEdit,
  handleSaveEdit,
  handleEditImageUpload
}: MaterialDetailDrawerProps) {
  const { user } = useAuth();
  
  // Tab control: 'info' | 'history' | 'notes'
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'notes'>('info');

  // Status toggle
  const [isActive, setIsActive] = useState(true);

  // Local Notes state
  const [notes, setNotes] = useState<LocalNote[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');

  // Load local notes on item change
  useEffect(() => {
    if (selectedItem) {
      const stored = localStorage.getItem(`solar_hub_item_notes_${selectedItem.id}`);
      if (stored) {
        setNotes(JSON.parse(stored));
      } else {
        // Default initial notes
        setNotes([
          {
            id: '1',
            userName: 'Johnson Corn',
            userAvatar: null,
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
            content: 'Material verificado en control de calidad. Óptimas condiciones para instalación de inversores.'
          },
          {
            id: '2',
            userName: 'Emily John Stones',
            userAvatar: null,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            content: 'Se requiere mantener bajo techo seco para prevenir oxidación en conectores de cobre.'
          }
        ]);
      }
      setIsActive(selectedItem.stock > 0);
    }
  }, [selectedItem, isDetailDrawerOpen]);

  // Save notes helper
  const saveNotes = (updatedNotes: LocalNote[]) => {
    if (selectedItem) {
      localStorage.setItem(`solar_hub_item_notes_${selectedItem.id}`, JSON.stringify(updatedNotes));
      setNotes(updatedNotes);
    }
  };

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
    saveNotes(updated);
    setNewNoteContent('');
  };

  if (!isDetailDrawerOpen || !selectedItem) return null;

  const category = categories.find(c => c.id === selectedItem.category_id);

  // Split stock dynamically to simulate warehouses for aesthetics
  const totalStock = selectedItem.stock;
  const whBDG = Math.round(totalStock * 0.5);
  const whJKT = Math.round(totalStock * 0.25);
  const whMLG = Math.round(totalStock * 0.15);
  const whSBY = Math.max(totalStock - (whBDG + whJKT + whMLG), 0);

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        onClick={() => setIsDetailDrawerOpen(false)} 
        className="fixed inset-0 bg-black/75 backdrop-blur-xs z-40 transition-opacity" 
      />

      {/* Main Drawer container */}
      <div className="fixed inset-y-0 right-0 w-full max-w-4xl bg-[#121318] border-l border-zinc-850 shadow-2xl flex flex-col z-50 transform transition-transform duration-300">
        
        {/* TOP STATUS BAR BAR */}
        <div className="p-4 border-b border-zinc-850/80 flex justify-between items-center bg-[#15171d] shrink-0">
          {/* Back button */}
          <button 
            type="button"
            onClick={() => setIsDetailDrawerOpen(false)} 
            className="h-8 w-8 rounded-lg hover:bg-zinc-850 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
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
                onClick={() => {
                  if (isEditing) {
                    setIsEditing(false);
                  } else {
                    handleStartEdit();
                  }
                }}
                className={`px-3 py-1 text-[11px] font-bold font-mono uppercase tracking-wider rounded-md border transition-all cursor-pointer ${
                  isEditing 
                    ? 'border-rose-500/30 bg-rose-500/5 text-rose-455 hover:bg-rose-500/10'
                    : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10'
                }`}
              >
                {isEditing ? 'Cancel' : 'Edit'}
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
          <h1 className="text-2xl font-bold text-white tracking-wide">
            {isEditing ? editForm.name : selectedItem.name}
          </h1>
          <div className="flex items-center gap-2 text-xs text-zinc-450 font-mono">
            <span className="font-semibold text-zinc-400">SKU: {isEditing ? editForm.sku : selectedItem.sku}</span>
            <span>•</span>
            <span>{category ? category.name : 'Sin categoría'}</span>
            <span>•</span>
            <span className="bg-zinc-900 border border-zinc-800 text-[10px] px-2 py-0.5 rounded text-zinc-400 font-semibold uppercase tracking-wider">
              Stocked Product
            </span>
          </div>
        </div>

        {/* TAB SWITCHER */}
        <div className="px-6 bg-[#121318] flex gap-2 border-b border-zinc-850/50 shrink-0">
          <button
            onClick={() => {
              setIsEditing(false);
              setActiveTab('info');
            }}
            className={`py-3.5 px-1 text-[11px] font-bold font-mono uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeTab === 'info'
                ? 'border-emerald-500 text-emerald-400 font-extrabold'
                : 'border-transparent text-zinc-500 hover:text-zinc-350'
            }`}
          >
            General Information
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
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
              setIsEditing(false);
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
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-900">
          
          {/* ========================================================================= */}
          {/* TAB 1: GENERAL INFORMATION */}
          {/* ========================================================================= */}
          {activeTab === 'info' && (
            <>
              {isEditing ? (
                /* Editing mode form styled inside the modern cards */
                <form onSubmit={handleSaveEdit} className="space-y-6 text-left">
                  <div className="bg-[#15171d] border border-zinc-800/80 p-5 space-y-4 shadow-lg">
                    <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Identificación y Categoría</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Nombre del Material *</label>
                        <input
                          required
                          type="text"
                          value={editForm.name}
                          onChange={e => setEditForm({...editForm, name: e.target.value})}
                          className="w-full bg-zinc-950 border border-zinc-850 rounded p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Código SKU *</label>
                        <input
                          required
                          type="text"
                          value={editForm.sku}
                          onChange={e => setEditForm({...editForm, sku: e.target.value})}
                          className="w-full bg-zinc-950 border border-zinc-850 rounded p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Categoría</label>
                        <select
                          value={editForm.category_id}
                          onChange={e => setEditForm({...editForm, category_id: e.target.value})}
                          className="w-full bg-zinc-950 border border-zinc-850 rounded p-2.5 text-xs text-white focus:outline-none font-semibold cursor-pointer"
                        >
                          <option value="">Selecciona categoría</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Unidad de Medida</label>
                        <select
                          value={editForm.unit}
                          onChange={e => setEditForm({...editForm, unit: e.target.value})}
                          className="w-full bg-zinc-950 border border-zinc-850 rounded p-2.5 text-xs text-white focus:outline-none font-semibold cursor-pointer"
                        >
                          <option value="unidades">Unidades (pcs)</option>
                          <option value="metros">Metros (m)</option>
                          <option value="rollos">Rollos</option>
                          <option value="cajas">Cajas</option>
                          <option value="kilogramos">Kilogramos (kg)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#15171d] border border-zinc-800/80 p-5 space-y-4 shadow-lg">
                    <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Especificaciones de Dimensiones y Costos</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Costo Unitario ($) *</label>
                        <input
                          required
                          type="number"
                          step="0.01"
                          value={editForm.cost}
                          onChange={e => setEditForm({...editForm, cost: Number(e.target.value)})}
                          className="w-full bg-zinc-950 border border-zinc-850 rounded p-2.5 text-xs text-white focus:outline-none font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Punto de Reorden (Min. Requerido)</label>
                        <input
                          type="number"
                          value={editForm.min_stock}
                          onChange={e => setEditForm({...editForm, min_stock: Number(e.target.value)})}
                          className="w-full bg-zinc-950 border border-zinc-850 rounded p-2.5 text-xs text-white focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Embalaje</label>
                        <input
                          type="text"
                          value={editForm.packaging}
                          onChange={e => setEditForm({...editForm, packaging: e.target.value})}
                          className="w-full bg-zinc-955 border border-zinc-850 rounded p-2.5 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Longitud (m)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editForm.length}
                          onChange={e => setEditForm({...editForm, length: e.target.value})}
                          className="w-full bg-zinc-950 border border-zinc-850 rounded p-2.5 text-xs text-white focus:outline-none font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Peso (kg)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editForm.weight}
                          onChange={e => setEditForm({...editForm, weight: e.target.value})}
                          className="w-full bg-zinc-950 border border-zinc-850 rounded p-2.5 text-xs text-white focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#15171d] border border-zinc-800/80 p-5 space-y-4 shadow-lg">
                    <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Multimedia y Datos Técnicos</h3>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Proveedores (Separados por coma)</label>
                      <input
                        type="text"
                        value={editForm.providers}
                        onChange={e => setEditForm({...editForm, providers: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-855 rounded p-2.5 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Descripción Técnica</label>
                      <textarea
                        value={editForm.description}
                        onChange={e => setEditForm({...editForm, description: e.target.value})}
                        className="w-full bg-zinc-955 border border-zinc-850 rounded p-2.5 text-xs text-white focus:outline-none h-16 resize-none"
                      />
                    </div>

                    {/* Image uploads preview */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Imágenes del Material</label>
                      <div className="bg-zinc-950 border border-zinc-850 rounded p-3 flex flex-wrap gap-2.5 items-center">
                        {(editForm.image_urls || []).map((url: string, idx: number) => (
                          <div key={idx} className="relative h-16 w-16 bg-zinc-900 border border-zinc-800 rounded group overflow-hidden">
                            <img src={url} alt={`Preview ${idx}`} className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setEditForm((prev: any) => ({
                                ...prev,
                                image_urls: prev.image_urls.filter((_: any, i: number) => i !== idx)
                              }))}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-500 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        
                        <label className="h-16 w-16 border border-dashed border-zinc-800 hover:border-emerald-500/50 rounded flex flex-col items-center justify-center text-zinc-500 hover:text-emerald-400 transition-all cursor-pointer">
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleEditImageUpload}
                            className="hidden"
                            disabled={uploadingImage}
                          />
                          {uploadingImage ? (
                            <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                          ) : (
                            <>
                              <Plus className="h-4 w-4" />
                              <span className="text-[8px] font-bold uppercase mt-1">Subir</span>
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-850 flex justify-end gap-2 shrink-0">
                    <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} className="text-zinc-400 font-mono text-[10px] uppercase font-bold tracking-wider">
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] uppercase font-bold tracking-wider px-5 rounded">
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Guardar Cambios
                    </Button>
                  </div>
                </form>
              ) : (
                /* Sleek 2-column details view */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
                  
                  {/* Left Column (Images, Basic Info, Dimensions, Costs) */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* Image Carousel Panel */}
                    <div className="flex gap-4 items-start">
                      {/* Main Image */}
                      <div className="flex-1 aspect-[4/3] bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner relative">
                        {activeImgUrl ? (
                          <img src={activeImgUrl} alt={selectedItem.name} className="h-full w-full object-contain" />
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
                            {(selectedItem.image_urls || []).map((url, idx) => (
                              <button
                                key={idx}
                                onClick={() => setActiveImgUrl(url)}
                                className={`h-11 w-11 rounded-lg overflow-hidden border shrink-0 transition-all cursor-pointer ${
                                  activeImgUrl === url 
                                    ? 'border-emerald-500 scale-95 ring-2 ring-emerald-500/20' 
                                    : 'border-zinc-800 opacity-60 hover:opacity-100'
                                }`}
                              >
                                <img src={url} alt={`Thumbnail ${idx}`} className="h-full w-full object-cover" />
                              </button>
                            ))}
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
                          <div className="text-[9.5px] font-bold text-zinc-550 uppercase tracking-wide font-mono">TOTAL BE PACKED</div>
                          <div className="text-white font-medium">Stocked Product</div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-[9.5px] font-bold text-zinc-550 uppercase tracking-wide font-mono">CATEGORY</div>
                          <div className="text-white font-medium">{category ? category.name : 'N/A'}</div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-[9.5px] font-bold text-zinc-550 uppercase tracking-wide font-mono">BARCODE / SKU</div>
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
                    <div className="bg-[#15171d]/60 border border-zinc-850/50 p-5 rounded-2xl space-y-3.5">
                      <h3 className="text-xs font-bold text-white font-mono uppercase tracking-widest border-b border-zinc-850/30 pb-2">
                        Purchase Information
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="space-y-0.5">
                          <div className="text-[9.5px] font-bold text-zinc-550 uppercase tracking-wide font-mono">PURCHASE COST</div>
                          <div className="text-white font-mono font-bold text-sm">
                            ${selectedItem.cost.toFixed(2)}
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-[9.5px] font-bold text-zinc-550 uppercase tracking-wide font-mono">PRIMARY VENDOR</div>
                          <div className="text-white font-medium">
                            {selectedItem.providers?.[0] || 'Sin proveedor'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sales Information (Value metrics) Card */}
                    <div className="bg-[#15171d]/60 border border-zinc-850/50 p-5 rounded-2xl space-y-4">
                      <h3 className="text-xs font-bold text-white font-mono uppercase tracking-widest border-b border-zinc-850/30 pb-2">
                        Sales Information & Valuation
                      </h3>
                      <div className="grid grid-cols-3 gap-6 text-xs font-mono">
                        <div className="space-y-1">
                          <div className="text-[9.5px] font-bold text-zinc-550 uppercase tracking-wide">EST. VALUE / UNIT</div>
                          <div className="text-white font-bold text-sm">
                            ${selectedItem.cost.toFixed(2)}
                          </div>
                          <div className="text-[8px] text-zinc-500 uppercase tracking-wider">Margin (35%)</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[9.5px] font-bold text-zinc-550 uppercase tracking-wide">TOTAL STOCK VALUE</div>
                          <div className="text-white font-bold text-sm">
                            ${(selectedItem.cost * selectedItem.stock).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[8px] text-zinc-500 uppercase tracking-wider">Asset Valuation</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[9.5px] font-bold text-zinc-550 uppercase tracking-wide">TOTAL MARGIN (35%)</div>
                          <div className="text-emerald-450 font-bold text-sm">
                            ${(selectedItem.cost * selectedItem.stock * 0.35).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[8px] text-emerald-550 uppercase tracking-wider">Est. Profit</div>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Right Column (Sidebar - Stock & Reorder Points) */}
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
                            // Set selected items list to this item only and open bulk adjustment
                            alert('Abriendo ajuste rápido de Kardex para este material...');
                          }}
                          className="w-full h-10 border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 font-bold font-mono text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1"
                        >
                          Adjust Stock
                        </button>
                      </RequirePermission>

                      {/* Warehouse stock split */}
                      <div className="space-y-2 pt-2 border-t border-zinc-850 text-xs font-mono">
                        <div className="flex justify-between items-center text-[11px] py-1">
                          <span className="text-zinc-450">Warehouse <strong className="text-amber-500 font-bold">•BDG</strong></span>
                          <span className="text-white font-bold">{whBDG}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] py-1">
                          <span className="text-zinc-450">Warehouse <strong className="text-blue-400 font-bold">•JKT</strong></span>
                          <span className="text-white font-bold">{whJKT}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] py-1">
                          <span className="text-zinc-450">Warehouse <strong className="text-purple-400 font-bold">•MLG</strong></span>
                          <span className="text-white font-bold">{whMLG}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] py-1">
                          <span className="text-zinc-450">Warehouse <strong className="text-emerald-400 font-bold">•SBY</strong></span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-white font-bold">{whSBY}</span>
                            {whSBY <= selectedItem.min_stock && (
                              <span className="bg-rose-500/20 text-rose-455 text-[8.5px] px-1 py-0.5 rounded font-extrabold uppercase scale-90">
                                low
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Reorder Points Card */}
                    <div className="bg-[#15171d] border border-zinc-800 p-5 rounded-2xl space-y-4 shadow-xl text-left">
                      <span className="text-xs font-bold text-white font-mono uppercase tracking-widest">Reorder Points</span>

                      <div className="space-y-4 pt-2 font-mono">
                        {/* BDG Reorder details */}
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-1.5 text-zinc-300 font-bold">
                            <Archive className="h-3.5 w-3.5 text-zinc-550" />
                            <span>Warehouse <strong className="text-amber-500">•BDG</strong></span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-[10.5px] bg-[#121318] p-2.5 rounded-lg border border-zinc-850">
                            <div>
                              <div className="text-[8.5px] text-zinc-500 uppercase font-bold">REORDER POINT</div>
                              <div className="text-white font-bold mt-0.5">{selectedItem.min_stock}</div>
                            </div>
                            <div>
                              <div className="text-[8.5px] text-zinc-500 uppercase font-bold">REORDER QTY</div>
                              <div className="text-white font-bold mt-0.5">{selectedItem.min_stock * 2}</div>
                            </div>
                          </div>
                        </div>

                        {/* JKT Reorder details */}
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-1.5 text-zinc-300 font-bold">
                            <Archive className="h-3.5 w-3.5 text-zinc-550" />
                            <span>Warehouse <strong className="text-blue-400">•JKT</strong></span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[10.5px] bg-[#121318] p-2.5 rounded-lg border border-zinc-850">
                            <div>
                              <div className="text-[8.5px] text-zinc-500 uppercase font-bold">REORDER METHOD</div>
                              <div className="text-white font-bold mt-0.5">Purchase Order</div>
                            </div>
                            <div>
                              <div className="text-[8.5px] text-zinc-500 uppercase font-bold">VENDOR</div>
                              <div className="text-white font-bold mt-0.5 truncate max-w-[80px]" title={selectedItem.providers?.[0] || 'N/A'}>
                                {selectedItem.providers?.[0] || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              )}
            </>
          )}

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
                <div className="py-12 text-center text-zinc-650 italic text-xs font-mono">
                  No hay movimientos registrados en Kardex para este material.
                </div>
              ) : (
                <div className="relative border-l border-zinc-800 ml-4 pl-6 space-y-7">
                  {itemTransactions.map((tx, idx) => {
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
                          <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">{tx.reason}</p>
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
                    className="w-full bg-[#15171d] border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 h-24 resize-none"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold uppercase tracking-wider px-4.5 h-8.5 rounded-lg cursor-pointer"
                >
                  Add Notes
                </Button>
              </form>

              {/* Notes Feed list */}
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
                            <div className="text-[8.5px] text-zinc-500 font-mono mt-0.5">
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
              </div>
            </div>
          )}

        </div>

        {/* BOTTOM DRAWER BAR */}
        <div className="p-4 border-t border-zinc-850 shrink-0 flex justify-between items-center bg-[#15171d] bg-opacity-40">
          <RequirePermission action="inventory:write">
            {!isEditing ? (
              <Button
                onClick={handleStartEdit}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold uppercase tracking-wider h-9 px-4.5 rounded cursor-pointer"
              >
                <Edit3 className="h-4 w-4 mr-1.5" /> Edit Material
              </Button>
            ) : (
              <Button
                onClick={handleSaveEdit}
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold uppercase tracking-wider h-9 px-4.5 rounded cursor-pointer"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null} Save Changes
              </Button>
            )}
          </RequirePermission>
          <Button 
            onClick={() => setIsDetailDrawerOpen(false)} 
            className="bg-zinc-900 border border-zinc-800 text-zinc-450 hover:text-white font-mono text-[10px] font-bold uppercase tracking-wider h-9 px-4 rounded"
          >
            Close
          </Button>
        </div>

      </div>
    </>
  );
}
