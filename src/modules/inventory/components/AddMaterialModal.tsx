import React, { useState } from 'react';
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
  ChevronDown
} from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { InventoryCategoryRow, InventoryTagRow } from '@/core/services/inventory';

interface AddMaterialModalProps {
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  categories: InventoryCategoryRow[];
  tags: InventoryTagRow[];
  addForm: any;
  setAddForm: (form: any) => void;
  uploadedImages: string[];
  setUploadedImages: React.Dispatch<React.SetStateAction<string[]>>;
  uploadingImage: boolean;
  actionLoading: boolean;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleCreateItem: (e: React.FormEvent) => Promise<void>;
}

export function AddMaterialModal({
  isAddModalOpen,
  setIsAddModalOpen,
  categories,
  tags,
  addForm,
  setAddForm,
  uploadedImages,
  setUploadedImages,
  uploadingImage,
  actionLoading,
  handleImageUpload,
  handleCreateItem
}: AddMaterialModalProps) {
  const [newProviderInput, setNewProviderInput] = useState('');

  if (!isAddModalOpen) return null;

  // Helper to parse comma-separated providers into array for tag display
  const providersArray = addForm.providers
    ? addForm.providers.split(',').map((p: string) => p.trim()).filter((p: string) => p.length > 0)
    : [];

  const handleAddProvider = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = newProviderInput.trim();
      if (!val) return;
      if (!providersArray.includes(val)) {
        const updated = [...providersArray, val].join(', ');
        setAddForm({ ...addForm, providers: updated });
      }
      setNewProviderInput('');
    }
  };

  const handleRemoveProvider = (name: string) => {
    const updated = providersArray.filter((p: string) => p !== name).join(', ');
    setAddForm({ ...addForm, providers: updated });
  };

  return (
    <div className="fixed inset-0 bg-[#051424]/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* Modal Container */}
      <main className="relative w-full max-w-4xl max-h-[90vh] bg-[#1E293B] border border-[#475569] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#334155] bg-[#1c2b3c] shrink-0">
          <div className="flex items-center gap-2">
            <Package className="text-[#fbbf24] h-7 w-7" />
            <h1 className="text-lg font-semibold tracking-tight text-[#d4e4fa]">Nuevo Material de Inventario</h1>
          </div>
          <button 
            type="button"
            onClick={() => setIsAddModalOpen(false)} 
            className="text-[#d3c5ac] hover:text-[#d4e4fa] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Form Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[#122131] [&::-webkit-scrollbar-thumb]:bg-[#3f465c] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#adb4ce]">
          <form onSubmit={handleCreateItem} className="space-y-6">
            
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
                      value={addForm.name}
                      onChange={e => setAddForm({ ...addForm, name: e.target.value })}
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
                      value={addForm.sku}
                      onChange={e => setAddForm({ ...addForm, sku: e.target.value })}
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
                      value={addForm.category_id}
                      onChange={e => setAddForm({ ...addForm, category_id: e.target.value })}
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
                      value={addForm.description}
                      onChange={e => setAddForm({ ...addForm, description: e.target.value })}
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
                      type="number"
                      step="0.01"
                      value={addForm.cost || ''}
                      onChange={e => setAddForm({ ...addForm, cost: Number(e.target.value) })}
                      placeholder="0.00"
                      className="block w-full pl-10 pr-3 py-2 bg-[#051424] border border-[#4f4633] rounded text-sm text-[#d4e4fa] placeholder-[#d3c5ac]/50 focus:outline-none focus:border-[#fbbf24] focus:ring-1 focus:ring-[#fbbf24] font-mono transition-colors"
                    />
                  </div>
                </div>

                {/* Stock Inicial */}
                <div>
                  <label className="block font-mono text-[11px] font-bold tracking-wider uppercase text-[#d4e4fa] mb-1">
                    Stock Inicial
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Package className="h-4.5 w-4.5 text-[#d3c5ac]" />
                    </div>
                    <input
                      type="number"
                      value={addForm.stock || ''}
                      onChange={e => setAddForm({ ...addForm, stock: Number(e.target.value) })}
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
                      value={addForm.min_stock || ''}
                      onChange={e => setAddForm({ ...addForm, min_stock: Number(e.target.value) })}
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
                      value={addForm.packaging || 'caja'}
                      onChange={e => setAddForm({ ...addForm, packaging: e.target.value })}
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
                      value={addForm.unit}
                      onChange={e => setAddForm({ ...addForm, unit: e.target.value })}
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
                      value={addForm.length || ''}
                      onChange={e => setAddForm({ ...addForm, length: e.target.value })}
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
                      value={addForm.weight || ''}
                      onChange={e => setAddForm({ ...addForm, weight: e.target.value })}
                      placeholder="0.0"
                      className="block w-full pl-10 pr-3 py-2 bg-[#051424] border border-[#4f4633] rounded text-sm text-[#d4e4fa] placeholder-[#d3c5ac]/50 focus:outline-none focus:border-[#fbbf24] focus:ring-1 focus:ring-[#fbbf24] font-mono transition-colors"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4: Proveedores y Etiquetas */}
            <section className="bg-[#122131] p-4 rounded-lg border border-[#334155] space-y-4">
              <h2 className="font-mono text-[11px] font-bold tracking-wider uppercase text-[#d3c5ac] flex items-center gap-2">
                <Store className="h-4 w-4" /> Proveedores y Etiquetas
              </h2>
              
              <div className="space-y-4">
                {/* Proveedores */}
                <div>
                  <label className="block font-mono text-[11px] font-bold tracking-wider uppercase text-[#d4e4fa] mb-1">
                    Proveedores
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Store className="h-4.5 w-4.5 text-[#d3c5ac]" />
                    </div>
                    <input
                      type="text"
                      value={newProviderInput}
                      onChange={e => setNewProviderInput(e.target.value)}
                      onKeyDown={handleAddProvider}
                      placeholder="Añadir proveedor y presionar Enter..."
                      className="block w-full pl-10 pr-3 py-2 bg-[#051424] border border-[#4f4633] rounded text-sm text-[#d4e4fa] placeholder-[#d3c5ac]/55 focus:outline-none focus:border-[#fbbf24] focus:ring-1 focus:ring-[#fbbf24] transition-colors"
                    />
                  </div>
                  
                  {providersArray.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {providersArray.map((prov: string, idx: number) => (
                        <span 
                          key={idx} 
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#334155] text-xs font-semibold text-[#d4e4fa] border border-[#475569] shadow-sm animate-in fade-in zoom-in-95 duration-150"
                        >
                          {prov}
                          <button
                            type="button"
                            onClick={() => handleRemoveProvider(prov)}
                            className="text-[#d3c5ac] hover:text-[#ffb4ab] transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-[#d3c5ac]/60 font-mono italic mt-1">
                      No hay proveedores configurados. Escribe arriba y presiona Enter para añadir.
                    </div>
                  )}
                </div>

                {/* Etiquetas checkboxes */}
                <div>
                  <label className="block font-mono text-[11px] font-bold tracking-wider uppercase text-[#d4e4fa] mb-1">
                    Etiquetas del Ítem
                  </label>
                  <div className="w-full min-h-[60px] border border-dashed border-[#4f4633] rounded p-3 flex flex-wrap gap-3 items-center bg-[#051424]">
                    {tags.length > 0 ? (
                      tags.map(t => {
                        const isChecked = addForm.selectedTags.includes(t.name);
                        return (
                          <label key={t.id} className="flex items-center gap-2 text-xs font-semibold text-[#d4e4fa] cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setAddForm({
                                    ...addForm,
                                    selectedTags: addForm.selectedTags.filter((x: string) => x !== t.name)
                                  });
                                } else {
                                  setAddForm({
                                    ...addForm,
                                    selectedTags: [...addForm.selectedTags, t.name]
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
              </div>
            </section>

            {/* Section 5: Multimedia */}
            <section className="bg-[#122131] p-4 rounded-lg border border-[#334155] space-y-4">
              <h2 className="font-mono text-[11px] font-bold tracking-wider uppercase text-[#d3c5ac] flex items-center gap-2">
                <Upload className="h-4 w-4" /> Imágenes del Ítem
              </h2>
              
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mb-4">
                  {uploadedImages.map((url, idx) => (
                    <div key={idx} className="relative aspect-square bg-[#051424] border border-[#4f4633] rounded group overflow-hidden shadow-md">
                      <img src={url} alt={`Preview ${idx}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-red-500 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
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
                onClick={() => setIsAddModalOpen(false)}
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
                Guardar Material
              </button>
            </div>
            
          </form>
        </div>
      </main>
    </div>
  );
}
