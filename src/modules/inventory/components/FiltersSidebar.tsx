import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { InventoryCategoryRow, InventoryTagRow } from '@/core/services/inventory';

interface FiltersSidebarProps {
  isFilterOpen: boolean;
  setIsFilterOpen: (open: boolean) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedTag: string;
  setSelectedTag: (tag: string) => void;
  filterLowStock: boolean;
  setFilterLowStock: (low: boolean) => void;
  categories: InventoryCategoryRow[];
  tags: InventoryTagRow[];
  setSearchQuery: (query: string) => void;
}

export function FiltersSidebar({
  isFilterOpen,
  setIsFilterOpen,
  selectedCategory,
  setSelectedCategory,
  selectedTag,
  setSelectedTag,
  filterLowStock,
  setFilterLowStock,
  categories,
  tags,
  setSearchQuery
}: FiltersSidebarProps) {
  if (!isFilterOpen) return null;

  return (
    <div className="w-full lg:w-[260px] bg-[#121214] border border-zinc-800 rounded-lg p-5 space-y-5 text-left shrink-0 flex flex-col justify-between self-stretch">
      <div className="space-y-5">
        <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
          <span className="text-xs font-bold font-mono tracking-widest text-white">FILTRO WMS</span>
          <button 
            onClick={() => setIsFilterOpen(false)}
            className="p-1 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-550 uppercase font-mono tracking-wider block">POR CATEGORÍA</label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-zinc-300 focus:border-emerald-500 outline-none font-semibold"
            >
              <option value="todos">Todo</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-550 uppercase font-mono tracking-wider block">POR ETIQUETA</label>
            <select
              value={selectedTag}
              onChange={e => setSelectedTag(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-zinc-300 focus:border-emerald-500 outline-none font-semibold"
            >
              <option value="todos">Todo</option>
              {tags.map(tag => (
                <option key={tag.id} value={tag.name}>{tag.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-555 uppercase tracking-wider font-mono block">CRITERIOS</label>
            <button
              onClick={() => setFilterLowStock(!filterLowStock)}
              className={`w-full py-2.5 px-4 rounded-lg text-xs font-bold border transition-all flex items-center justify-between ${
                filterLowStock 
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                  : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>Bajo Stock Crítico</span>
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={() => {
          setSelectedCategory('todos');
          setSelectedTag('todos');
          setFilterLowStock(false);
          setSearchQuery('');
        }}
        className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer mt-4"
      >
        Limpiar Filtros
      </button>
    </div>
  );
}
