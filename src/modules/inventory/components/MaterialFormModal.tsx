import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  Loader2, 
  Package, 
  Info, 
  Tag, 
  Barcode, 
  FolderOpen, 
  DollarSign, 
  Layers, 
  Weight, 
  Store, 
  Upload, 
  Save, 
  FileText, 
  Ruler,
  AlertTriangle,
  ChevronDown,
  PlusCircle
} from 'lucide-react';
import { InventoryCategoryRow, InventoryTagRow } from '@/core/services/inventory';
import { getGlobalProviders } from './ConfigWMSModal';

interface MaterialFormModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  mode: 'add' | 'edit';
  categories: InventoryCategoryRow[];
  tags: InventoryTagRow[];
  form: any;
  setForm: (form: any) => void;
  uploadedImages?: string[]; // for 'add' mode
  setUploadedImages?: React.Dispatch<React.SetStateAction<string[]>>; // for 'add' mode
  uploadingImage: boolean;
  actionLoading: boolean;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleSubmit: (e: React.FormEvent, overrideForm?: any) => Promise<void>;
}

export function MaterialFormModal({
  isOpen,
  setIsOpen,
  mode,
  categories,
  tags,
  form,
  setForm,
  uploadedImages,
  setUploadedImages,
  uploadingImage,
  actionLoading,
  handleImageUpload,
  handleSubmit
}: MaterialFormModalProps) {
  const [localProvidersList, setLocalProvidersList] = useState<{ name: string; price: number }[]>([]);

  // Sync initial form values to local list when opening
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && form.providers) {
        const list = form.providers.split(',').map((p: string) => {
          const parts = p.trim().split(' - $');
          if (parts.length === 2) {
            return { name: parts[0].trim(), price: parseFloat(parts[1]) || 0 };
          }
          return { name: p.trim(), price: form.cost || 0 };
        }).filter((x: any) => x.name.length > 0);
        setLocalProvidersList(list);
      } else {
        setLocalProvidersList([]);
      }
    }
  }, [isOpen, mode]);

  // Keep form.cost and form.providers synced with local providers list changes
  useEffect(() => {
    if (!isOpen) return;
    const formatted = localProvidersList.map(x => `${x.name} - $${x.price.toFixed(2)}`);
    const cheapest = localProvidersList.length > 0
      ? Math.min(...localProvidersList.map(x => x.price))
      : form.cost;

    setForm((prev: any) => ({
      ...prev,
      providers: formatted.join(', '),
      cost: cheapest
    }));
  }, [localProvidersList, isOpen]);

  if (!isOpen) return null;

  const handleAddProviderRow = () => {
    const globalProviders = getGlobalProviders();
    const firstAvailable = globalProviders.find(
      g => !localProvidersList.some(p => p.name === g)
    ) || globalProviders[0] || 'Proveedor Genérico';

    setLocalProvidersList([...localProvidersList, { name: firstAvailable, price: 0 }]);
  };

  const handleUpdateProviderRow = (idx: number, field: 'name' | 'price', val: any) => {
    const updated = [...localProvidersList];
    updated[idx] = { ...updated[idx], [field]: val };
    setLocalProvidersList(updated);
  };

  const handleRemoveProviderRow = (idx: number) => {
    setLocalProvidersList(localProvidersList.filter((_, i) => i !== idx));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = localProvidersList.map(x => `${x.name} - $${x.price.toFixed(2)}`);
    const cheapest = localProvidersList.length > 0
      ? Math.min(...localProvidersList.map(x => x.price))
      : form.cost;

    const finalForm = {
      ...form,
      providers: formatted.join(', '),
      cost: cheapest
    };

    await handleSubmit(e, finalForm);
  };

  const imagesToRender = mode === 'add' ? (uploadedImages || []) : (form.image_urls || []);

  const handleRemoveImage = (idx: number) => {
    if (mode === 'add' && setUploadedImages) {
      setUploadedImages(prev => prev.filter((_, i) => i !== idx));
    } else {
      setForm((prev: any) => ({
        ...prev,
        image_urls: (prev.image_urls || []).filter((_: any, i: number) => i !== idx)
      }));
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        onClick={() => setIsOpen(false)} 
        className="fixed top-16 inset-x-0 bottom-0 bg-black/75 backdrop-blur-xs z-[55] transition-opacity" 
      />

      {/* Main Drawer container */}
      <div className="fixed top-16 bottom-0 right-0 w-full max-w-4xl bg-[#1E293B] border-l border-zinc-800 shadow-2xl flex flex-col z-[60] transform transition-transform duration-300 animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#334155] bg-[#1c2b3c] shrink-0">
          <div className="flex items-center gap-2">
            <Package className="text-[#fbbf24] h-7 w-7" />
            <h1 className="text-lg font-semibold tracking-tight text-[#d4e4fa]">
              {mode === 'add' ? 'Nuevo Material de Inventario' : 'Editar Material de Inventario'}
            </h1>
          </div>
          <button 
            type="button"
            onClick={() => setIsOpen(false)} 
            className="text-[#d3c5ac] hover:text-[#d4e4fa] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Form Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[#122131] [&::-webkit-scrollbar-thumb]:bg-[#3f465c] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#adb4ce]">
          <form onSubmit={handleFormSubmit} className="space-y-6">
            
            {/* Section 1: Información Básica */}
            <section className="bg-[#122131] p-4 rounded-lg border border-[#334155] space-y-4">
              <h2 className="font-mono text-[11px] font-bold tracking-wider uppercase text-[#d3c5ac] flex items-center gap-2">
                <Info className="h-4 w-4" /> Información Básica
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nombre del Ítem */}
                <div className="col-span-1 md:col-span-2">
                  <label className="block font-mono text-[11px] font-bold tracking-wider uppercase text-[#d4e4fa] mb-1">
                    Nombre del Ítem *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Tag className="h-4.5 w-4.5 text-[#d3c5ac]" />
                    </div>
                    <input
                      required
                      type="text"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="Ej. Inversor Fronius 10kW"
                      className="block w-full pl-10 pr-3 py-2 bg-[#051424] border border-[#4f4633] rounded text-sm text-[#d4e4fa] placeholder-[#d3c5ac]/50 focus:outline-none focus:border-[#fbbf24] focus:ring-1 focus:ring-[#fbbf24] transition-colors"
                    />
                  </div>
                </div>

                {/* Código SKU */}
                <div>
                  <label className="block font-mono text-[11px] font-bold tracking-wider uppercase text-[#d4e4fa] mb-1">
                    Código SKU *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Barcode className="h-4.5 w-4.5 text-[#d3c5ac]" />
                    </div>
                    <input
                      required
                      type="text"
                      value={form.sku}
                      onChange={e => setForm({ ...form, sku: e.target.value })}
                      placeholder="Ej. INV-FR-10KW"
                      className="block w-full pl-10 pr-3 py-2 bg-[#051424] border border-[#4f4633] rounded text-sm text-[#d4e4fa] placeholder-[#d3c5ac]/50 focus:outline-none focus:border-[#fbbf24] focus:ring-1 focus:ring-[#fbbf24] font-mono transition-colors"
                    />
                  </div>
                </div>

                {/* Categoría */}
                <div>
                  <label className="block font-mono text-[11px] font-bold tracking-wider uppercase text-[#d4e4fa] mb-1">
                    Categoría *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FolderOpen className="h-4.5 w-4.5 text-[#d3c5ac]" />
                    </div>
                    <select
                      required
                      value={form.category_id}
                      onChange={e => setForm({ ...form, category_id: e.target.value })}
                      className="block w-full pl-10 pr-3 py-2 bg-[#051424] border border-[#4f4633] rounded text-sm text-[#d4e4fa] focus:outline-none focus:border-[#fbbf24] focus:ring-1 focus:ring-[#fbbf24] font-semibold cursor-pointer appearance-none transition-colors"
                    >
                      <option value="" disabled>Selecciona una categoría</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#d3c5ac]">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Descripción Técnica */}
                <div className="col-span-1 md:col-span-2">
                  <label className="block font-mono text-[11px] font-bold tracking-wider uppercase text-[#d4e4fa] mb-1">
                    Descripción Técnica
                  </label>
                  <div className="relative">
                    <div className="absolute top-2.5 left-3 pointer-events-none">
                      <FileText className="h-4.5 w-4.5 text-[#d3c5ac]" />
                    </div>
                    <textarea
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      placeholder="Ej. Inversor trifásico de alta eficiencia con monitoreo inteligente..."
                      className="block w-full pl-10 pr-3 py-2 bg-[#051424] border border-[#4f4633] rounded text-sm text-[#d4e4fa] placeholder-[#d3c5ac]/50 focus:outline-none focus:border-[#fbbf24] focus:ring-1 focus:ring-[#fbbf24] h-20 resize-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Especificaciones Técnicas */}
            <section className="bg-[#122131] p-4 rounded-lg border border-[#334155] space-y-4">
              <h2 className="font-mono text-[11px] font-bold tracking-wider uppercase text-[#d3c5ac] flex items-center gap-2">
                <Layers className="h-4 w-4" /> Especificaciones Técnicas
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Costo Unitario */}
                <div>
                  <label className="block font-mono text-[11px] font-bold tracking-wider uppercase text-[#d4e4fa] mb-1">
                    Costo Unitario ($) *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-4.5 w-4.5 text-[#d3c5ac]" />
                    </div>
                    <input
                      required
                      disabled={localProvidersList.length > 0}
                      type="number"
                      step="0.01"
                      value={form.cost || ''}
                      onChange={e => setForm({ ...form, cost: Number(e.target.value) })}
                      placeholder="0.00"
                      className={`block w-full pl-10 pr-3 py-2 bg-[#051424] border border-[#4f4633] rounded text-sm text-[#d4e4fa] placeholder-[#d3c5ac]/50 focus:outline-none focus:border-[#fbbf24] focus:ring-1 focus:ring-[#fbbf24] font-mono transition-colors ${
                        localProvidersList.length > 0 ? 'opacity-75 cursor-not-allowed bg-[#122131]' : ''
                      }`}
                    />
                  </div>
                  {localProvidersList.length > 0 && (
                    <span className="text-[9.5px] text-[#fbbf24] font-mono mt-0.5 block">
                      Autocalculado (mínimo de proveedores)
                    </span>
                  )}
                </div>

                {/* Stock Inicial */}
                <div>
                  <label className="block font-mono text-[11px] font-bold tracking-wider uppercase text-[#d4e4fa] mb-1">
                    {mode === 'add' ? 'Stock Inicial' : 'Stock Actual'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Package className="h-4.5 w-4.5 text-[#d3c5ac]" />
                    </div>
                    <input
                      type="number"
                      value={form.stock || ''}
                      onChange={e => setForm({ ...form, stock: Number(e.target.value) })}
                      placeholder="0"
                      className="block w-full pl-10 pr-3 py-2 bg-[#051424] border border-[#4f4633] rounded text-sm text-[#d4e4fa] placeholder-[#d3c5ac]/50 focus:outline-none focus:border-[#fbbf24] focus:ring-1 focus:ring-[#fbbf24] font-mono transition-colors"
                    />
                  </div>
                </div>

                {/* Stock Mínimo */}
                <div>
                  <label className="block font-mono text-[11px] font-bold tracking-wider uppercase text-[#d4e4fa] mb-1">
                    Stock Mínimo
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <AlertTriangle className="h-4.5 w-4.5 text-[#ffb4ab]" />
                    </div>
                    <input
                      type="number"
                      value={form.min_stock || ''}
                      onChange={e => setForm({ ...form, min_stock: Number(e.target.value) })}
                      placeholder="0"
                      className="block w-full pl-10 pr-3 py-2 bg-[#051424] border border-[#4f4633] rounded text-sm text-[#d4e4fa] placeholder-[#d3c5ac]/50 focus:outline-none focus:border-[#fbbf24] focus:ring-1 focus:ring-[#fbbf24] font-mono transition-colors"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3: Logística y Empaque */}
            <section className="bg-[#122131] p-4 rounded-lg border border-[#334155] space-y-4">
              <h2 className="font-mono text-[11px] font-bold tracking-wider uppercase text-[#d3c5ac] flex items-center gap-2">
                <Ruler className="h-4 w-4" /> Logística y Empaque
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Tipo de Embalaje */}
                <div>
                  <label className="block font-mono text-[11px] font-bold tracking-wider uppercase text-[#d4e4fa] mb-1">
                    Tipo de Embalaje
                  </label>
                  <div className="relative">
                    <select
                      value={form.packaging || 'caja'}
                      onChange={e => setForm({ ...form, packaging: e.target.value })}
                      className="block w-full px-3 py-2 bg-[#051424] border border-[#4f4633] rounded text-sm text-[#d4e4fa] focus:outline-none focus:border-[#fbbf24] focus:ring-1 focus:ring-[#fbbf24] font-semibold cursor-pointer appearance-none transition-colors"
                    >
                      <option value="caja">Caja Individual</option>
                      <option value="pallet">Pallet</option>
                      <option value="granel">Granel</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#d3c5ac]">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Unidad de Medida */}
                <div>
                  <label className="block font-mono text-[11px] font-bold tracking-wider uppercase text-[#d4e4fa] mb-1">
                    Unidad de Medida
                  </label>
                  <div className="relative">
                    <select
                      value={form.unit}
                      onChange={e => setForm({ ...form, unit: e.target.value })}
                      className="block w-full px-3 py-2 bg-[#051424] border border-[#4f4633] rounded text-sm text-[#d4e4fa] focus:outline-none focus:border-[#fbbf24] focus:ring-1 focus:ring-[#fbbf24] font-semibold cursor-pointer appearance-none transition-colors"
                    >
                      <option value="unidades">Unidades (pcs)</option>
                      <option value="metros">Metros (m)</option>
                      <option value="rollos">Rollos</option>
                      <option value="cajas">Cajas</option>
                      <option value="kilogramos">Kilogramos (kg)</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#d3c5ac]">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Largo / Volumen (m) */}
                <div>
                  <label className="block font-mono text-[11px] font-bold tracking-wider uppercase text-[#d4e4fa] mb-1">
                    Longitud (m)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Ruler className="h-4.5 w-4.5 text-[#d3c5ac]" />
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      value={form.length || ''}
                      onChange={e => setForm({ ...form, length: e.target.value })}
                      placeholder="0.0"
                      className="block w-full pl-10 pr-3 py-2 bg-[#051424] border border-[#4f4633] rounded text-sm text-[#d4e4fa] placeholder-[#d3c5ac]/50 focus:outline-none focus:border-[#fbbf24] focus:ring-1 focus:ring-[#fbbf24] font-mono transition-colors"
                    />
                  </div>
                </div>

                {/* Peso (kg) */}
                <div>
                  <label className="block font-mono text-[11px] font-bold tracking-wider uppercase text-[#d4e4fa] mb-1">
                    Peso (kg)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Weight className="h-4.5 w-4.5 text-[#d3c5ac]" />
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      value={form.weight || ''}
                      onChange={e => setForm({ ...form, weight: e.target.value })}
                      placeholder="0.0"
                      className="block w-full pl-10 pr-3 py-2 bg-[#051424] border border-[#4f4633] rounded text-sm text-[#d4e4fa] placeholder-[#d3c5ac]/50 focus:outline-none focus:border-[#fbbf24] focus:ring-1 focus:ring-[#fbbf24] font-mono transition-colors"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4: Proveedores y Etiquetas */}
            <section className="bg-[#122131] p-4 rounded-lg border border-[#334155] space-y-4">
              <div className="flex justify-between items-center border-b border-[#334155]/40 pb-2">
                <h2 className="font-mono text-[11px] font-bold tracking-wider uppercase text-[#d3c5ac] flex items-center gap-2">
                  <Store className="h-4 w-4" /> Proveedores y Precios de Adquisición
                </h2>
                <button
                  type="button"
                  onClick={handleAddProviderRow}
                  className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 font-mono uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <PlusCircle className="h-4 w-4" /> Añadir Proveedor
                </button>
              </div>
              
              <div className="space-y-3">
                {localProvidersList.map((row, idx) => {
                  const globalList = getGlobalProviders();
                  return (
                    <div key={idx} className="flex items-center gap-3 bg-[#051424] p-3 border border-[#4f4633] rounded">
                      {/* Supplier Selector */}
                      <div className="flex-1 space-y-1 text-left">
                        <label className="text-[9px] font-bold text-[#d3c5ac]/70 uppercase font-mono">Proveedor</label>
                        <div className="relative">
                          <select
                            value={row.name}
                            onChange={e => handleUpdateProviderRow(idx, 'name', e.target.value)}
                            className="w-full bg-[#121318] border border-zinc-800 rounded p-1.5 text-xs text-white focus:outline-none focus:border-[#fbbf24] font-semibold cursor-pointer appearance-none"
                          >
                            {globalList.map(prov => (
                              <option key={prov} value={prov}>{prov}</option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-[#d3c5ac]">
                            <ChevronDown className="h-3 w-3" />
                          </div>
                        </div>
                      </div>

                      {/* Purchase Price Input */}
                      <div className="w-32 space-y-1 text-left">
                        <label className="text-[9px] font-bold text-[#d3c5ac]/70 uppercase font-mono">Precio Unitario ($)</label>
                        <input
                          required
                          type="number"
                          step="0.01"
                          value={row.price || ''}
                          onChange={e => handleUpdateProviderRow(idx, 'price', parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#121318] border border-zinc-800 rounded p-1.5 text-xs text-white focus:outline-none focus:border-[#fbbf24] font-mono font-bold"
                          placeholder="0.00"
                        />
                      </div>

                      {/* Remove row button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveProviderRow(idx)}
                        className="mt-5 p-1.5 hover:bg-zinc-900 rounded text-rose-500 hover:text-rose-455 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}

                {localProvidersList.length === 0 && (
                  <div className="py-6 text-center text-[#d3c5ac]/50 text-xs italic font-mono border border-dashed border-[#4f4633] rounded">
                    No hay proveedores vinculados a este material. Haz clic en "Añadir Proveedor" arriba.
                  </div>
                )}
              </div>

              {/* Etiquetas checkboxes */}
              <div className="pt-2 border-t border-[#334155]/40 space-y-2">
                <label className="block font-mono text-[11px] font-bold tracking-wider uppercase text-[#d4e4fa]">
                  Etiquetas del Ítem
                </label>
                <div className="w-full min-h-[60px] border border-dashed border-[#4f4633] rounded p-3 flex flex-wrap gap-3 items-center bg-[#051424]">
                  {tags.length > 0 ? (
                    tags.map(t => {
                      const isChecked = form.selectedTags?.includes(t.name);
                      return (
                        <label key={t.id} className="flex items-center gap-2 text-xs font-semibold text-[#d4e4fa] cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const currentTags = form.selectedTags || [];
                              if (isChecked) {
                                setForm({
                                  ...form,
                                  selectedTags: currentTags.filter((x: string) => x !== t.name)
                                });
                              } else {
                                setForm({
                                  ...form,
                                  selectedTags: [...currentTags, t.name]
                                });
                              }
                            }}
                            className="rounded border-[#4f4633] bg-[#051424] text-[#fbbf24] focus:ring-[#fbbf24]/20 h-4 w-4"
                          />
                          <span>{t.name}</span>
                        </label>
                      );
                    })
                  ) : (
                    <div className="w-full text-center text-[#d3c5ac]/70 text-xs italic font-mono">
                      No hay etiquetas configuradas.
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Section 5: Multimedia */}
            <section className="bg-[#122131] p-4 rounded-lg border border-[#334155] space-y-4">
              <h2 className="font-mono text-[11px] font-bold tracking-wider uppercase text-[#d3c5ac] flex items-center gap-2">
                <Upload className="h-4 w-4" /> Imágenes del Ítem
              </h2>
              
              {imagesToRender.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mb-4">
                  {imagesToRender.map((url: string, idx: number) => {
                    // Resolve relative API URLs if necessary (primarily for edit mode)
                    const previewUrl = url.startsWith('/api/storage/file/')
                      ? `/api/storage/file/${url.split('/file/')[1]}` 
                      : url;
                    
                    return (
                      <div key={idx} className="relative aspect-square bg-[#051424] border border-[#4f4633] rounded group overflow-hidden shadow-md">
                        <img src={previewUrl} alt={`Preview ${idx}`} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-red-500 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <label className="w-full border-2 border-dashed border-[#4f4633] rounded-lg p-6 flex flex-col items-center justify-center bg-[#051424] hover:bg-[#122131] transition-colors cursor-pointer group select-none">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImage}
                />
                <div className="h-12 w-12 rounded-full bg-[#273647] flex items-center justify-center mb-3 group-hover:bg-[#334155] transition-colors">
                  {uploadingImage ? (
                    <Loader2 className="h-6 w-6 animate-spin text-[#fbbf24]" />
                  ) : (
                    <Upload className="h-6 w-6 text-[#d3c5ac]" />
                  )}
                </div>
                <p className="text-sm font-semibold text-[#d4e4fa] mb-1">Arrastra imágenes aquí o haz clic para subir</p>
                <p className="text-xs text-[#d3c5ac]/70 font-mono">Formatos soportados: JPG, PNG, WEBP (Máx. 5MB)</p>
              </label>
            </section>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-[#334155] flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded border border-[#4f4633] text-[#d4e4fa] font-semibold hover:bg-[#273647] transition-colors flex items-center gap-2 cursor-pointer text-sm"
              >
                <X className="h-4.5 w-4.5" />
                Cancelar
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 rounded bg-[#fbbf24] hover:bg-[#FCD34D] text-black font-semibold shadow-md flex items-center gap-2 cursor-pointer transition-colors text-sm disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin text-black" />
                ) : (
                  <Save className="h-4.5 w-4.5" />
                )}
                {mode === 'add' ? 'Guardar Material' : 'Guardar Cambios'}
              </button>
            </div>
            
          </form>
        </div>
      </div>
    </>
  );
}
