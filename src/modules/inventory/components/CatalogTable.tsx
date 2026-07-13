'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Archive, PackageCheck, MoreVertical } from 'lucide-react';
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
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Reset page when items filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [items]);

  const getCategoryBadge = (categoryName?: string) => {
    const name = categoryName?.toLowerCase() || '';
    if (name.includes('indust')) {
      return (
        <span className="px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-blue-500/10 text-blue-400 border border-blue-500/25 rounded-md">
          INDUSTRIAL
        </span>
      );
    }
    if (name.includes('comm') || name.includes('comerc')) {
      return (
        <span className="px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-purple-500/10 text-purple-400 border border-purple-500/25 rounded-md">
          COMMERCIAL
        </span>
      );
    }
    if (name.includes('resid') || name.includes('hogar')) {
      return (
        <span className="px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-md">
          RESIDENTIAL
        </span>
      );
    }
    if (name.includes('herram') || name.includes('tool') || name.includes('equip')) {
      return (
        <span className="px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-zinc-500/10 text-zinc-400 border border-zinc-500/25 rounded-md">
          TOOLS
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-zinc-800 text-zinc-400 border border-zinc-700/50 rounded-md">
        {categoryName?.toUpperCase() || 'GENERAL'}
      </span>
    );
  };

  const renderStockProgress = (stock: number, minStock: number) => {
    const targetStock = Math.max(minStock * 5, stock, 100);
    const percentage = Math.min(Math.round((stock / targetStock) * 100), 100);
    const isCritical = stock <= minStock;

    return (
      <div className="space-y-1.5 w-full max-w-[130px] text-left">
        <div className="flex items-center justify-between text-[10px] font-mono leading-none">
          <span className="text-white font-bold">
            {stock} <span className="text-zinc-500 font-normal">/ {targetStock}</span>
          </span>
          <span className={`font-bold ${isCritical ? 'text-amber-500' : 'text-zinc-400'}`}>
            {percentage}%
          </span>
        </div>
        <div className="w-full h-1 bg-zinc-950 border border-zinc-850 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-300 ${
              isCritical ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-[#1c1c21] border border-zinc-800 rounded-none">
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
        <span className="text-zinc-500 text-xs font-semibold">Cargando catálogo...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-[#1c1c21] border border-zinc-800 p-12 text-center rounded-none">
        <Archive className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
        <h3 className="text-zinc-450 font-bold text-sm">Sin materiales</h3>
        <p className="text-zinc-500 text-xs mt-1">No se encontraron items que coincidan con la búsqueda o filtros.</p>
      </div>
    );
  }

  // Pagination calculation
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = items.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="bg-[#1c1c21] border border-zinc-800 rounded-none overflow-hidden shadow-xl">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[#121214]/60 border-b border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-450">
            <th className="px-6 py-4 w-20">Imagen</th>
            <th className="px-6 py-4">SKU & Nombre</th>
            <th className="px-6 py-4">Categoría</th>
            <th className="px-6 py-4">Stock Actual</th>
            <th className="px-6 py-4">Métrica</th>
            <th className="px-6 py-4">Proveedor</th>
            <th className="px-6 py-4 text-center w-16">
              <input
                type="checkbox"
                checked={items.length > 0 && selectedItemIds.length === items.length}
                onChange={handleToggleSelectAll}
                className="rounded border-zinc-800 bg-zinc-950 text-emerald-600 focus:ring-emerald-500/20 h-3.5 w-3.5 cursor-pointer"
              />
            </th>
            <th className="px-6 py-4 text-right w-20">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/80 text-xs">
          {paginatedItems.map((item) => {
            const category = categories.find(c => c.id === item.category_id);
            const isSelected = selectedItemIds.includes(item.id);

            return (
              <tr 
                key={item.id} 
                className={`hover:bg-zinc-800/10 transition-colors ${
                  isSelected ? 'bg-amber-500/5' : ''
                }`}
              >
                {/* Imagen */}
                <td className="px-6 py-3">
                  <div className="h-10 w-10 bg-zinc-950 border border-zinc-850 rounded-none overflow-hidden flex items-center justify-center">
                    {item.image_urls?.[0] || item.image_url ? (
                      <img 
                        src={item.image_urls?.[0] || item.image_url || undefined} 
                        alt={item.name} 
                        className="h-full w-full object-cover" 
                      />
                    ) : (
                      <Archive className="h-4 w-4 text-zinc-650" />
                    )}
                  </div>
                </td>

                {/* SKU & Nombre */}
                <td className="px-6 py-3">
                  <div className="font-bold text-white text-xs leading-tight">
                    {item.name}
                  </div>
                  <div className="text-[9px] text-zinc-550 font-mono mt-0.5 tracking-wider uppercase">
                    {item.sku}
                  </div>
                </td>

                {/* Categoría */}
                <td className="px-6 py-3">
                  {getCategoryBadge(category?.name)}
                </td>

                {/* Stock Actual */}
                <td className="px-6 py-3">
                  {renderStockProgress(item.stock, item.min_stock)}
                </td>

                {/* Métrica */}
                <td className="px-6 py-3 text-zinc-400 font-mono uppercase">
                  {item.unit}
                </td>

                {/* Proveedor */}
                <td className="px-6 py-3 text-zinc-450 font-medium max-w-[130px] truncate" title={item.providers?.[0] || 'N/A'}>
                  {item.providers?.[0] || 'N/A'}
                </td>

                {/* Checkbox */}
                <td className="px-6 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelectItem(item.id)}
                    className="rounded border-zinc-800 bg-zinc-950 text-emerald-600 focus:ring-emerald-500/20 h-3.5 w-3.5 cursor-pointer"
                  />
                </td>

                {/* Acciones */}
                <td className="px-6 py-3 text-right relative">
                  <div className="flex justify-end items-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === item.id ? null : item.id);
                      }}
                      className="p-1 rounded hover:bg-zinc-850 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {activeMenuId === item.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-30 bg-transparent" 
                          onClick={() => setActiveMenuId(null)} 
                        />
                        <div className="absolute right-6 top-8 z-40 w-32 bg-zinc-900 border border-zinc-800 rounded shadow-2xl py-1 text-zinc-300 text-[10.5px] font-bold text-left font-mono uppercase tracking-wider">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              handleOpenDetail(item);
                            }}
                            className="w-full px-3 py-2 hover:bg-zinc-800 hover:text-white flex items-center gap-1.5"
                          >
                            Kardex & Ficha
                          </button>
                          <RequirePermission action="inventory:write">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                handleOpenEdit(item);
                              }}
                              className="w-full px-3 py-2 hover:bg-zinc-800 hover:text-white flex items-center gap-1.5 border-t border-zinc-850"
                            >
                              Editar Ficha
                            </button>
                          </RequirePermission>
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Pagination controls */}
      <div className="bg-[#121214]/60 border-t border-zinc-800 px-6 py-4 flex items-center justify-between">
        <span className="text-[10px] text-zinc-500 font-mono">
          Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, items.length)} de {items.length} materiales
        </span>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white px-3 py-1.5 text-[10px] font-bold text-zinc-400 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-all font-mono uppercase tracking-wider"
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                type="button"
                onClick={() => handlePageChange(page)}
                className={`px-2.5 py-1.5 text-[10px] font-bold rounded-md font-mono ${
                  currentPage === page
                    ? 'bg-amber-500 text-black'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white px-3 py-1.5 text-[10px] font-bold text-zinc-400 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-all font-mono uppercase tracking-wider"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
