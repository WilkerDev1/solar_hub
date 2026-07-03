import React from 'react';
import { Info, X, Trash2, Plus, Loader2, History, User, Edit2, Archive } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { RequirePermission } from '@/core/auth/AuthContext';
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
  if (!isDetailDrawerOpen || !selectedItem) return null;

  return (
    <>
      <div onClick={() => setIsDetailDrawerOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40" />
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-zinc-950 border-l border-zinc-900 shadow-2xl flex flex-col z-50 transform transition-transform duration-300">
        <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/20 shrink-0">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-emerald-400" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
              {isEditing ? 'Editar Ficha de Material' : 'Ficha Técnica & Kardex'}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <RequirePermission action="inventory:write">
              <Button
                onClick={() => {
                  if (isEditing) {
                    setIsEditing(false);
                  } else {
                    handleStartEdit();
                  }
                }}
                size="sm"
                className="bg-zinc-900 border border-zinc-800 text-[10px] h-8 font-bold text-zinc-350 hover:text-white hover:bg-zinc-800 rounded-lg cursor-pointer animate-none"
              >
                {isEditing ? 'Cancelar Edición' : 'Editar Ficha'}
              </Button>
            </RequirePermission>
            <button onClick={() => setIsDetailDrawerOpen(false)} className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-white transition-colors cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin scrollbar-thumb-zinc-900 text-left">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Nombre del Item *</label>
                <input
                  required
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Código SKU *</label>
                <input
                  required
                  type="text"
                  value={editForm.sku}
                  onChange={e => setEditForm({...editForm, sku: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Categoría</label>
                <select
                  value={editForm.category_id}
                  onChange={e => setEditForm({...editForm, category_id: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none font-semibold"
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
                  value={editForm.unit}
                  onChange={e => setEditForm({...editForm, unit: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none font-semibold"
                >
                  <option value="unidades">Unidades (pcs)</option>
                  <option value="metros">Metros (m)</option>
                  <option value="rollos">Rollos</option>
                  <option value="cajas">Cajas</option>
                  <option value="kilogramos">Kilogramos (kg)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Costo Unitario ($) *</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={editForm.cost}
                  onChange={e => setEditForm({...editForm, cost: Number(e.target.value)})}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Stock Mínimo</label>
                <input
                  type="number"
                  value={editForm.min_stock}
                  onChange={e => setEditForm({...editForm, min_stock: Number(e.target.value)})}
                  className="w-full bg-zinc-955 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none font-mono"
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
                  className="w-full bg-zinc-955 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Longitud (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editForm.length}
                  onChange={e => setEditForm({...editForm, length: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Peso (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editForm.weight}
                  onChange={e => setEditForm({...editForm, weight: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Proveedores (Separados por coma)</label>
              <input
                type="text"
                value={editForm.providers}
                onChange={e => setEditForm({...editForm, providers: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-855 rounded-lg p-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Descripción Técnica</label>
              <textarea
                value={editForm.description}
                onChange={e => setEditForm({...editForm, description: e.target.value})}
                className="w-full bg-zinc-955 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none h-16 resize-none"
              />
            </div>

            {/* Previsualización de imágenes subidas en edición */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider font-mono">Imágenes del Item</label>
              <div className="bg-zinc-950 border border-zinc-850 rounded-lg p-3 flex flex-wrap gap-2 items-center">
                {(editForm.image_urls || []).map((url: string, idx: number) => (
                  <div key={idx} className="relative h-16 w-16 bg-zinc-950 border border-zinc-800 rounded-md group overflow-hidden">
                    <img src={url} alt={`Preview ${idx}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setEditForm((prev: any) => ({
                        ...prev,
                        image_urls: prev.image_urls.filter((_: any, i: number) => i !== idx)
                      }))}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-rose-500 hover:text-rose-455 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                
                <label className="h-16 w-16 border border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-lg flex flex-col items-center justify-center text-zinc-550 hover:text-emerald-400 transition-all cursor-pointer">
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

            {/* Tags checkboxes */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Etiquetas del Item</label>
              <div className="bg-zinc-950 border border-zinc-850 rounded-lg p-3 flex flex-wrap gap-2.5 max-h-24 overflow-y-auto">
                {tags.map(t => {
                  const isChecked = editForm.selectedTags.includes(t.name);
                  return (
                    <label key={t.id} className="flex items-center gap-2 text-xs font-semibold text-zinc-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setEditForm({
                              ...editForm,
                              selectedTags: editForm.selectedTags.filter((x: string) => x !== t.name)
                            });
                          } else {
                            setEditForm({
                              ...editForm,
                              selectedTags: [...editForm.selectedTags, t.name]
                            });
                          }
                        }}
                        className="rounded border-zinc-800 bg-zinc-950 text-emerald-600 focus:ring-emerald-500/20 h-4 w-4"
                      />
                      <span>{t.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-850 flex justify-end gap-2 shrink-0">
              <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} className="text-zinc-400">
                Cancelar
              </Button>
              <Button type="submit" disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 rounded-lg">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Guardar Cambios
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-900 text-left">
            {/* Image Gallery */}
            {activeImgUrl ? (
              <div className="space-y-2">
                <div className="relative h-64 w-full bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden shadow-inner">
                  <img src={activeImgUrl} alt={selectedItem.name} className="h-full w-full object-contain" />
                </div>
                {/* Thumbnails */}
                {(selectedItem.image_urls || []).length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    {(selectedItem.image_urls || []).map((url, index) => (
                      <button
                        key={index}
                        onClick={() => setActiveImgUrl(url)}
                        className={`h-12 w-12 rounded-lg overflow-hidden border shrink-0 transition-all cursor-pointer ${
                          activeImgUrl === url ? 'border-emerald-500 scale-95' : 'border-zinc-800 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt={`Thumbnail ${index}`} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-44 w-full bg-zinc-900/20 border border-zinc-800 rounded-lg flex flex-col items-center justify-center text-zinc-650">
                <Archive className="h-10 w-10 mb-2" />
                <span className="text-xs font-semibold uppercase tracking-wider font-mono">Sin imágenes asociadas</span>
              </div>
            )}

            {/* Technical Specifications */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white tracking-wide">{selectedItem.name}</h2>
                <p className="text-zinc-550 font-mono text-[10px] mt-0.5">SKU: {selectedItem.sku}</p>
              </div>

              {selectedItem.description && (
                <p className="text-zinc-400 text-xs bg-zinc-900/40 p-3 rounded-lg border border-zinc-800/60 leading-relaxed">
                  {selectedItem.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-4 bg-zinc-900/20 border border-zinc-800 p-4 rounded-lg">
                <div className="flex justify-between py-1.5 border-b border-zinc-800 text-xs">
                  <span className="text-zinc-500">Costo Unitario</span>
                  <span className="font-bold text-zinc-300 font-mono">${selectedItem.cost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-800 text-xs">
                  <span className="text-zinc-500">Stock Actual</span>
                  <span className="font-bold text-emerald-400 font-mono">{selectedItem.stock} {selectedItem.unit}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-800 text-xs">
                  <span className="text-zinc-500">Embalaje</span>
                  <span className="font-bold text-zinc-355">{selectedItem.packaging || 'N/D'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-800 text-xs">
                  <span className="text-zinc-500">Min. Requerido</span>
                  <span className="font-bold text-zinc-355 font-mono">{selectedItem.min_stock} {selectedItem.unit}</span>
                </div>
                <div className="flex justify-between py-1.5 text-xs col-span-2">
                  <span className="text-zinc-500">Dimensiones Físicas</span>
                  <span className="font-bold text-zinc-355 font-mono">
                    {selectedItem.length ? `${selectedItem.length}m` : 'N/D'} / {selectedItem.weight ? `${selectedItem.weight}kg` : 'N/D'}
                  </span>
                </div>
              </div>

              {/* Tags & Providers */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Etiquetas</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedItem.tags && selectedItem.tags.length > 0 ? (
                      selectedItem.tags.map((t, i) => (
                        <span key={i} className="bg-zinc-900 border border-zinc-800 text-zinc-450 px-2 py-0.5 rounded text-[10px] font-semibold">
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="text-zinc-650 italic text-[10px]">Sin etiquetas</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Proveedores</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedItem.providers && selectedItem.providers.length > 0 ? (
                      selectedItem.providers.map((p, i) => (
                        <span key={i} className="bg-zinc-900 border border-zinc-800 text-zinc-450 px-2 py-0.5 rounded text-[10px] font-semibold">
                          {p}
                        </span>
                      ))
                    ) : (
                      <span className="text-zinc-650 italic text-[10px]">Sin proveedores</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Kardex Transactions List */}
            <div className="space-y-3.5 pt-6 border-t border-zinc-800">
              <div className="flex items-center gap-1.5">
                <History className="h-4 w-4 text-emerald-400" />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Registro de Kardex e Historial</span>
              </div>

              {loadingTransactions ? (
                <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-zinc-500 h-6 w-6" /></div>
              ) : itemTransactions.length === 0 ? (
                <p className="text-xs text-zinc-650 italic py-4 text-center">No hay registros de movimientos en Kardex para este material.</p>
              ) : (
                <div className="space-y-2.5">
                  {itemTransactions.map((tx) => (
                    <div key={tx.id} className="bg-zinc-900/30 border border-zinc-800/60 p-3.5 rounded-lg flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase ${
                            tx.transaction_type === 'entrada' ? 'text-emerald-400' : 'text-rose-450'
                          }`}>
                            {tx.transaction_type === 'entrada' ? 'ENTRADA' : 'SALIDA'}
                          </span>
                          <span className="text-[10px] text-zinc-600 font-mono">
                            {new Date(tx.created_at).toLocaleDateString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-405">{tx.reason}</p>
                        <div className="text-[9px] text-zinc-550 flex items-center gap-1">
                          <User className="h-3 w-3 shrink-0" />
                          <span>Auditado por: {tx.profiles?.full_name || 'Sistema / IA'}</span>
                        </div>
                      </div>
                      <div className={`text-sm font-bold font-mono ${
                        tx.transaction_type === 'entrada' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {tx.transaction_type === 'entrada' ? '+' : ''}{tx.quantity}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="p-4 border-t border-zinc-900 shrink-0 flex justify-between items-center bg-[#121214]/10">
          <RequirePermission action="inventory:write">
            {!isEditing ? (
              <Button
                onClick={handleStartEdit}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold h-9 px-4 rounded-lg cursor-pointer"
              >
                <Edit2 className="h-4 w-4 mr-1.5" /> Editar Ficha
              </Button>
            ) : (
              <Button
                onClick={handleSaveEdit}
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold h-9 px-4 rounded-lg cursor-pointer"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null} Guardar Cambios
              </Button>
            )}
          </RequirePermission>
          <Button onClick={() => setIsDetailDrawerOpen(false)} className="bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-lg h-9">
            Cerrar Ficha
          </Button>
        </div>
      </div>
    </>
  );
}
