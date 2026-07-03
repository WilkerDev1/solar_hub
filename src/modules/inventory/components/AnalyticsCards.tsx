import React from 'react';
import { DollarSign, Archive, AlertTriangle, TrendingUp } from 'lucide-react';
import { InventoryAnalytics } from '@/core/services/inventory';

interface AnalyticsCardsProps {
  analytics: InventoryAnalytics | null;
}

export function AnalyticsCards({ analytics }: AnalyticsCardsProps) {
  if (!analytics) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-[#1c1c21] border border-zinc-800 p-5 rounded-lg flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-zinc-555 uppercase tracking-wider font-mono">Valor Estimado</span>
          <p className="text-xl font-bold text-emerald-400 font-mono">
            ${analytics.estimatedValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="h-10 w-10 bg-emerald-500/10 rounded-lg border border-emerald-500/20 flex items-center justify-center">
          <DollarSign className="h-5 w-5 text-emerald-400" />
        </div>
      </div>

      <div className="bg-[#1c1c21] border border-zinc-800 p-5 rounded-lg flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-zinc-555 uppercase tracking-wider font-mono">Items en Catálogo</span>
          <p className="text-xl font-bold text-white font-mono">{analytics.totalItems}</p>
        </div>
        <div className="h-10 w-10 bg-blue-500/10 rounded-lg border border-blue-500/20 flex items-center justify-center">
          <Archive className="h-5 w-5 text-blue-400" />
        </div>
      </div>

      <div className="bg-[#1c1c21] border border-zinc-800 p-5 rounded-lg flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-zinc-555 uppercase tracking-wider font-mono">Stock Crítico</span>
          <p className={`text-xl font-bold font-mono ${analytics.lowStockCount > 0 ? 'text-amber-400' : 'text-white'}`}>
            {analytics.lowStockCount} items
          </p>
        </div>
        <div className={`h-10 w-10 rounded-lg border flex items-center justify-center ${
          analytics.lowStockCount > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-zinc-800 border-zinc-700'
        }`}>
          <AlertTriangle className={`h-5 w-5 ${analytics.lowStockCount > 0 ? 'text-amber-400' : 'text-zinc-500'}`} />
        </div>
      </div>

      <div className="bg-[#1c1c21] border border-zinc-800 p-5 rounded-lg flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-zinc-555 uppercase tracking-wider font-mono">Top Solicitado</span>
          <p className="text-xs font-bold text-white truncate max-w-[150px]">
            {analytics.topUsed?.[0] ? `${analytics.topUsed[0].name} (${analytics.topUsed[0].usage_count})` : 'Sin datos'}
          </p>
        </div>
        <div className="h-10 w-10 bg-purple-500/10 rounded-lg border border-purple-500/20 flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-purple-400" />
        </div>
      </div>
    </div>
  );
}
