import React from 'react';
import { Settings, X, Trash2 } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { InventoryCategoryRow, InventoryTagRow } from '@/core/services/inventory';

interface ConfigWMSModalProps {
  isConfigModalOpen: boolean;
  setIsConfigModalOpen: (open: boolean) => void;
  configTab: 'categories' | 'tags' | 'providers';
  setConfigTab: (tab: 'categories' | 'tags' | 'providers') => void;
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  newTagName: string;
  setNewTagName: (name: string) => void;
  categories: InventoryCategoryRow[];
  tags: InventoryTagRow[];
  handleAddCategory: () => Promise<void>;
  handleDeleteCat: (id: string) => Promise<void>;
  handleAddTagAction: () => Promise<void>;
  handleDeleteTagAction: (id: string) => Promise<void>;
}

export function ConfigWMSModal({
  isConfigModalOpen,
  setIsConfigModalOpen,
  configTab,
  setConfigTab,
  newCategoryName,
  setNewCategoryName,
  newTagName,
  setNewTagName,
  categories,
  tags,
  handleAddCategory,
  handleDeleteCat,
  handleAddTagAction,
  handleDeleteTagAction
}: ConfigWMSModalProps) {
  if (!isConfigModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-[#1c1c21] border border-zinc-800 rounded-lg w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-white">
            <Settings className="h-5 w-5 text-zinc-400" />
            <h3 className="font-bold text-sm uppercase tracking-wide">Configuración del WMS</h3>
          </div>
          <button onClick={() => setIsConfigModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-zinc-800 px-4 bg-[#121214]/40">
          {(['categories', 'tags'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setConfigTab(tab)}
              className={`px-4 py-3 text-xs font-bold uppercase transition-colors border-b-2 ${
                configTab === tab
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab === 'categories' ? 'Categorías' : 'Etiquetas'}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-left">
          {configTab === 'categories' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nueva categoría..."
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  className="flex-1 bg-zinc-955 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 h-10"
                />
                <Button onClick={handleAddCategory} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 rounded-lg">
                  Añadir
                </Button>
              </div>

              <div className="border border-zinc-800 rounded-lg divide-y divide-zinc-800 max-h-60 overflow-y-auto bg-zinc-950/20">
                {categories.map(c => (
                  <div key={c.id} className="p-3.5 flex justify-between items-center hover:bg-zinc-800/10">
                    <span className="text-xs font-semibold text-white">{c.name}</span>
                    <button onClick={() => handleDeleteCat(c.id)} className="text-zinc-500 hover:text-rose-450 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {categories.length === 0 && <p className="text-xs italic text-zinc-500 p-4">No hay categorías configuradas.</p>}
              </div>
            </div>
          )}

          {configTab === 'tags' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nueva etiqueta..."
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  className="flex-1 bg-zinc-955 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 h-10"
                />
                <Button onClick={handleAddTagAction} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 rounded-lg">
                  Añadir
                </Button>
              </div>

              <div className="border border-zinc-800 rounded-lg divide-y divide-zinc-800 max-h-60 overflow-y-auto bg-zinc-950/20">
                {tags.map(t => (
                  <div key={t.id} className="p-3.5 flex justify-between items-center hover:bg-zinc-800/10">
                    <span className="text-xs font-semibold text-white">{t.name}</span>
                    <button onClick={() => handleDeleteTagAction(t.id)} className="text-zinc-500 hover:text-rose-455 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {tags.length === 0 && <p className="text-xs italic text-zinc-500 p-4">No hay etiquetas configuradas.</p>}
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-zinc-800 flex justify-end shrink-0">
          <Button onClick={() => setIsConfigModalOpen(false)} className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
