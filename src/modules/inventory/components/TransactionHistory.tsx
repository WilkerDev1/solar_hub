'use client';

import React, { useState, useEffect } from 'react';
import { getAllInventoryTransactions, InventoryTransactionWithUser } from '@/core/services/inventory';
import { Loader2, Search, ArrowDownRight, ArrowUpRight, Sliders, Calendar, User, FileText } from 'lucide-react';
import { Button } from '@/core/components/ui/button';

interface ExtendedTransaction extends InventoryTransactionWithUser {
  inventory_items: {
    name: string;
    sku: string;
  } | null;
}

export function TransactionHistory() {
  const [transactions, setTransactions] = useState<ExtendedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await getAllInventoryTransactions();
      setTransactions(data as ExtendedTransaction[]);
    } catch (e) {
      console.error('Error fetching inventory transactions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const getTransactionTypeBadge = (type: string) => {
    switch (type) {
      case 'entrada':
        return (
          <span className="flex items-center gap-1 w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-450 border border-emerald-500/20">
            <ArrowUpRight className="h-3 w-3" /> Entrada
          </span>
        );
      case 'salida':
        return (
          <span className="flex items-center gap-1 w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ArrowDownRight className="h-3 w-3" /> Salida
          </span>
        );
      case 'ajuste':
      default:
        return (
          <span className="flex items-center gap-1 w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-405 border border-amber-500/20">
            <Sliders className="h-3 w-3" /> Ajuste
          </span>
        );
    }
  };

  // Filters
  const filtered = transactions.filter(tx => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;

    const itemName = tx.inventory_items?.name?.toLowerCase() || '';
    const itemSku = tx.inventory_items?.sku?.toLowerCase() || '';
    const creator = tx.profiles?.full_name?.toLowerCase() || '';
    const reason = tx.reason?.toLowerCase() || '';

    return itemName.includes(q) || itemSku.includes(q) || creator.includes(q) || reason.includes(q);
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-[#1c1c21] border border-zinc-800 rounded-none">
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
        <span className="text-zinc-500 text-xs font-semibold">Cargando historial de movimientos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Filter Toolbar */}
      <div className="bg-[#1c1c21] border border-zinc-800 p-4 rounded-none flex items-center gap-3 w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por material, SKU, responsable o motivo..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-zinc-950 border border-zinc-850 rounded-none pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-colors h-10 font-semibold"
          />
        </div>
        <Button 
          onClick={loadTransactions} 
          variant="outline" 
          className="bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white h-10 text-xs font-bold"
        >
          Actualizar
        </Button>
      </div>

      {/* Movements Table */}
      {filtered.length === 0 ? (
        <div className="bg-[#1c1c21] border border-zinc-800 p-12 text-center rounded-none">
          <Calendar className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
          <h3 className="text-zinc-450 font-bold text-sm">Sin movimientos</h3>
          <p className="text-zinc-500 text-xs mt-1">No se encontraron registros de inventario.</p>
        </div>
      ) : (
        <div className="bg-[#1c1c21] border border-zinc-800 rounded-none overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[#121214]/60 border-b border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <th className="px-6 py-4.5">Fecha y Hora</th>
                  <th className="px-6 py-4.5">Material / SKU</th>
                  <th className="px-6 py-4.5">Tipo</th>
                  <th className="px-6 py-4.5">Cantidad</th>
                  <th className="px-6 py-4.5">Responsable</th>
                  <th className="px-6 py-4.5">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-xs">
                {paginated.map((tx) => {
                  const dateStr = new Date(tx.created_at).toLocaleString([], {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr key={tx.id} className="hover:bg-zinc-800/10 transition-colors">
                      <td className="px-6 py-4.5 text-zinc-400 font-mono">
                        {dateStr}
                      </td>
                      <td className="px-6 py-4.5">
                        <div className="font-bold text-white leading-tight">
                          {tx.inventory_items?.name || 'Material Eliminado'}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5 tracking-wider uppercase">
                          {tx.inventory_items?.sku || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4.5">
                        {getTransactionTypeBadge(tx.transaction_type)}
                      </td>
                      <td className="px-6 py-4.5">
                        <span className={`font-mono text-sm font-bold ${
                          tx.transaction_type === 'entrada'
                            ? 'text-emerald-450'
                            : tx.transaction_type === 'salida'
                            ? 'text-rose-455'
                            : 'text-amber-500'
                        }`}>
                          {tx.transaction_type === 'entrada' ? '+' : ''}
                          {tx.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-zinc-400 font-medium">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-zinc-550" />
                          <span>{tx.profiles?.full_name || 'Sistema / API'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4.5 text-zinc-350 max-w-[200px] truncate" title={tx.reason || ''}>
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-zinc-600" />
                          <span>{tx.reason || 'Sin motivo especificado'}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <div className="bg-[#121214]/60 border-t border-zinc-800 px-6 py-4 flex items-center justify-between">
            <span className="text-[11px] text-zinc-500 font-mono">
              Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filtered.length)} de {filtered.length} movimientos
            </span>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white px-3 py-1.5 text-[10px] font-bold text-zinc-400 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-all font-mono uppercase tracking-wider"
                >
                  Anterior
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-md font-mono ${
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
                  Siguiente
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
