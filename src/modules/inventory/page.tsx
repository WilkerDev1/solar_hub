'use client';

import React, { useState } from 'react';
import { Archive, Plus, ArrowRightLeft, PackageCheck } from 'lucide-react';
import { RequirePermission } from '@/core/auth/AuthContext';

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  unit: string;
  status: 'disponible' | 'bajo_stock' | 'agotado';
}

export default function InventoryModule() {
  const [inventory] = useState<InventoryItem[]>([
    { id: '1', name: 'Panel Solar Trina 550W Vertex S+', sku: 'SOL-PL-TR550', category: 'Paneles Solares', stock: 1240, unit: 'unidades', status: 'disponible' },
    { id: '2', name: 'Inversor SMA Sunny Tripower 50kW', sku: 'SOL-INV-SMA50', category: 'Inversores', stock: 18, unit: 'unidades', status: 'disponible' },
    { id: '3', name: 'Cable de Cobre Solar 4mm2 Rojo (100m)', sku: 'SOL-CB-RED4MM', category: 'Cableado', stock: 3, unit: 'rollos', status: 'bajo_stock' },
    { id: '4', name: 'Conectores MC4 Macho/Hembra', sku: 'SOL-MC4-CONN', category: 'Conectores', stock: 0, unit: 'unidades', status: 'agotado' },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Control de Almacén e Inventario</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Gestiona la entrada y salida de materiales, stocks críticos y asignaciones de obras.</p>
        </div>
        <div className="flex gap-2">
          <RequirePermission action="inventory:write">
            <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors">
              <Plus className="h-4 w-4" />
              Ingresar Material
            </button>
          </RequirePermission>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-xs font-bold uppercase tracking-wider text-zinc-500">
              <th className="px-6 py-4">Material / SKU</th>
              <th className="px-6 py-4">Categoría</th>
              <th className="px-6 py-4">Stock Actual</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
            {inventory.map((item) => (
              <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-50">{item.name}</div>
                  <div className="text-xs text-zinc-400 font-mono mt-0.5">{item.sku}</div>
                </td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{item.category}</td>
                <td className="px-6 py-4 text-zinc-800 dark:text-zinc-200">
                  {item.stock} {item.unit}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    item.status === 'disponible' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' :
                    item.status === 'bajo_stock' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' :
                    'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                  }`}>
                    {item.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <RequirePermission action="inventory:use_material" fallback={<span className="text-xs text-zinc-400">Ver solamente</span>}>
                    <button className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-xs font-semibold">
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                      Asignar a Obra
                    </button>
                  </RequirePermission>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
