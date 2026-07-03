import React from 'react';
import { Plus, X, Trash2, Loader2 } from 'lucide-react';
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
  if (!isAddModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-[#1c1c21] border border-zinc-800 rounded-lg w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-emerald-450">
            <Plus className="h-5 w-5" />
            <h3 className="font-bold text-sm uppercase tracking-wide">Alta de Material Físico</h3>
          </div>
          <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleCreateItem} className="p-6 overflow-y-auto space-y-4 text-left">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Nombre del Item *</label>
              <input
                required
                type="text"
                value={addForm.name}
                onChange={e => setAddForm({...addForm, name: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                placeholder="Ej. Inversor Fronius 10kW"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Código SKU *</label>
              <input
                required
                type="text"
                value={addForm.sku}
                onChange={e => setAddForm({...addForm, sku: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                placeholder="Ej. INV-FR-10KW"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Categoría</label>
              <select
                value={addForm.category_id}
                onChange={e => setAddForm({...addForm, category_id: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
              >
                <option value="">Selecciona una categoría</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Unidad de Medida</label>
              <select
                value={addForm.unit}
                onChange={e => setAddForm({...addForm, unit: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
              >
                <option value="unidades">Unidades (pcs)</option>
                <option value="metros">Metros (m)</option>
                <option value="rollos">Rollos</option>
                <option value="cajas">Cajas</option>
                <option value="kilogramos">Kilogramos (kg)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Costo Unitario ($) *</label>
              <input
                required
                type="number"
                step="0.01"
                value={addForm.cost}
                onChange={e => setAddForm({...addForm, cost: Number(e.target.value)})}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Stock Inicial</label>
              <input
                type="number"
                value={addForm.stock}
                onChange={e => setAddForm({...addForm, stock: Number(e.target.value)})}
                className="w-full bg-zinc-955 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Stock Mínimo</label>
              <input
                type="number"
                value={addForm.min_stock}
                onChange={e => setAddForm({...addForm, min_stock: Number(e.target.value)})}
                className="w-full bg-zinc-955 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Embalaje</label>
              <input
                type="text"
                value={addForm.packaging}
                onChange={e => setAddForm({...addForm, packaging: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                placeholder="Pallet / Caja"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Longitud (m)</label>
              <input
                type="number"
                step="0.1"
                value={addForm.length}
                onChange={e => setAddForm({...addForm, length: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                value={addForm.weight}
                onChange={e => setAddForm({...addForm, weight: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Proveedores (Separados por coma)</label>
            <input
              type="text"
              value={addForm.providers}
              onChange={e => setAddForm({...addForm, providers: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              placeholder="Ej. Trina Solar, Wilker Distribuidora"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Descripción técnica</label>
            <textarea
              value={addForm.description}
              onChange={e => setAddForm({...addForm, description: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 h-16 resize-none"
            />
          </div>

          {/* Previsualización de imágenes subidas */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Imágenes del Item</label>
            <div className="bg-zinc-950 border border-zinc-850 rounded-lg p-3 flex flex-wrap gap-2 items-center">
              {uploadedImages.map((url, idx) => (
                <div key={idx} className="relative h-16 w-16 bg-zinc-950 border border-zinc-800 rounded-md group overflow-hidden">
                  <img src={url} alt={`Preview ${idx}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-rose-500 hover:text-rose-455 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              
              <label className="h-16 w-16 bg-[#121214] border border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-lg flex flex-col items-center justify-center text-zinc-500 hover:text-white transition-colors cursor-pointer select-none">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
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

          {/* Tags checkboxes */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Etiquetas del Item</label>
            <div className="bg-zinc-950 border border-zinc-850 rounded-lg p-3 flex flex-wrap gap-2.5 max-h-24 overflow-y-auto">
              {tags.map(t => {
                const isChecked = addForm.selectedTags.includes(t.name);
                return (
                  <label key={t.id} className="flex items-center gap-2 text-xs font-semibold text-zinc-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (isChecked) {
                          setAddForm({...addForm, selectedTags: addForm.selectedTags.filter((x: string) => x !== t.name)});
                        } else {
                          setAddForm({...addForm, selectedTags: [...addForm.selectedTags, t.name]});
                        }
                      }}
                      className="rounded border-zinc-800 bg-zinc-950 text-emerald-600 focus:ring-emerald-500/20 h-4 w-4"
                    />
                    <span>{t.name}</span>
                  </label>
                );
              })}
              {tags.length === 0 && <span className="text-zinc-500 italic text-[11px]">No hay etiquetas configuradas.</span>}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800 flex justify-end gap-2 shrink-0">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)} className="text-zinc-400">
              Cancelar
            </Button>
            <Button type="submit" disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Guardar Material
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
