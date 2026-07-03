import React from 'react';
import { Loader2, Archive, PackageCheck, Edit2 } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { RequirePermission } from '@/core/auth/AuthContext';
import { InventoryItemRow, InventoryCategoryRow } from '@/core/services/inventory';

interface CatalogTableProps {
  items: InventoryItemRow[];
  categories: InventoryCategoryRow[];
  latestTxMap: any;
  loading: boolean;
  selectedItemIds: string[];
  handleToggleSelectItem: (id: string) => void;
  handleToggleSelectAll: () => void;
  handleOpenEdit: (item: InventoryItemRow) => void;
  handleOpenDetail: (item: InventoryItemRow) => void;
}

export function CatalogTable({
  items,
  categories,
  latestTxMap,
  loading,
  selectedItemIds,
  handleToggleSelectItem,
  handleToggleSelectAll,
  handleOpenEdit,
  handleOpenDetail
}: CatalogTableProps) {

  const getStatusBadge = (stock: number, minStock: number) => {
    if (stock === 0) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">AGOTADO</span>;
    }
    if (stock <= minStock) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">BAJO STOCK</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-405 border border-emerald-500/20">DISPONIBLE</span>;
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-[#1c1c21] border border-zinc-800 rounded-lg">
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
        <span className="text-zinc-500 text-xs font-semibold">Cargando catálogo...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-[#1c1c21] border border-zinc-800 p-12 text-center rounded-lg">
        <Archive className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
        <h3 className="text-zinc-450 font-bold text-sm">Sin materiales</h3>
        <p className="text-zinc-500 text-xs mt-1">No se encontraron items que coincidan con la búsqueda o filtros.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#1c1c21] border border-zinc-800 rounded-lg overflow-hidden shadow-xl">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[#121214]/60 border-b border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            <th className="px-6 py-5">Material / SKU</th>
            <th className="px-6 py-5">Categoría</th>
            <th className="px-6 py-5">Stock Actual</th>
            <th className="px-6 py-5">Última Actividad</th>
            <th className="px-6 py-5">Estado</th>
            <th className="px-6 py-5 text-center w-24">
              <div className="flex items-center justify-center gap-1.5">
                <input
                  type="checkbox"
                  checked={items.length > 0 && selectedItemIds.length === items.length}
                  onChange={handleToggleSelectAll}
                  className="rounded border-zinc-800 bg-zinc-950 text-emerald-600 focus:ring-emerald-500/20 h-4 w-4 cursor-pointer"
                />
                <span className="text-[9px] text-zinc-550">Todos</span>
              </div>
            </th>
            <th className="px-6 py-5 text-right w-36">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800 text-xs">
          {items.map((item) => {
            const category = categories.find(c => c.id === item.category_id);
            const latestTx = latestTxMap[item.id];
            const isSelected = selectedItemIds.includes(item.id);
            return (
              <tr key={item.id} className={`hover:bg-zinc-800/20 transition-colors ${isSelected ? 'bg-amber-500/5' : ''}`}>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-20 rounded-md bg-zinc-950 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                      {item.image_urls?.[0] || item.image_url ? (
                        <img src={item.image_urls?.[0] || item.image_url || undefined} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <PackageCheck className="h-6 w-6 text-zinc-655" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm leading-snug">{item.name}</div>
                      <div className="text-[10px] text-zinc-555 font-mono mt-1 tracking-wider uppercase">{item.sku}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5 text-zinc-400 font-semibold">
                  {category ? category.name : 'Sin categoría'}
                </td>
                <td className="px-6 py-5 text-white font-bold">
                  {item.stock} <span className="text-zinc-550 font-normal text-xs">{item.unit}</span>
                </td>
                <td className="px-6 py-5">
                  {latestTx ? (
                    <div className="space-y-0.5">
                      <span className={`font-mono text-xs font-bold ${
                        latestTx.transaction_type === 'entrada' ? 'text-emerald-450' : 'text-rose-450'
                      }`}>
                        {latestTx.transaction_type === 'entrada' ? '+' : ''}{latestTx.quantity}
                      </span>
                      <div className="text-[10px] text-zinc-555 font-medium truncate max-w-[120px]" title={latestTx.reason}>
                        {latestTx.reason}
                      </div>
                    </div>
                  ) : (
                    <span className="text-zinc-600 italic text-[10px]">Sin movimientos</span>
                  )}
                </td>
                <td className="px-6 py-5">
                  {getStatusBadge(item.stock, item.min_stock)}
                </td>
                <td className="px-6 py-5 text-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelectItem(item.id)}
                    className="rounded border-zinc-800 bg-zinc-950 text-emerald-600 focus:ring-emerald-500/20 h-4 w-4 cursor-pointer"
                  />
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <RequirePermission action="inventory:write">
                      <Button
                        onClick={() => handleOpenEdit(item)}
                        size="sm"
                        className="bg-zinc-900 border border-zinc-800 hover:text-white text-zinc-450 hover:bg-zinc-800 text-[10px] p-2 h-8 w-8 rounded-lg cursor-pointer"
                        title="Editar Ficha"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </RequirePermission>
                    <Button
                      onClick={() => handleOpenDetail(item)}
                      size="sm"
                      className="bg-zinc-900 border border-zinc-800 hover:text-white text-zinc-450 hover:bg-zinc-800 text-[10px] px-3.5 h-8 rounded-lg font-bold cursor-pointer"
                    >
                      Ficha & Kardex
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
