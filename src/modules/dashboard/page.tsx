'use client';

import React from 'react';
import { useAuth, RequirePermission } from '@/core/auth/AuthContext';
import { Sun, ShieldAlert, CheckCircle, Clock } from 'lucide-react';

export default function DashboardModule() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Buenos días, {user?.fullName || 'Usuario'}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Resumen operativo de tu planta solar y tareas del día.
          </p>
        </div>
      </header>

      {/* Quick stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-950/40 text-amber-600 rounded-lg">
            <Sun className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-bold">Generación Hoy</p>
            <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">432.8 kWh</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 rounded-lg">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-bold">Proyectos Activos</p>
            <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">12 Proyectos</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-950/40 text-blue-600 rounded-lg">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-bold">Materiales en Uso</p>
            <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">84 Items</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-rose-100 dark:bg-rose-950/40 text-rose-600 rounded-lg">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-bold">Alertas Activas</p>
            <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">2 Críticas</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main activity list */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Mis Tareas Asignadas</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 rounded-lg border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <span className="inline-block text-xs bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-medium px-2 py-0.5 rounded mb-1">
                  Ingeniería
                </span>
                <h3 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">Revisión de Diagrama Unifilar - Parcela Norte</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Asignado por: Ing. Carlos Gómez</p>
              </div>
              <span className="text-xs text-zinc-400">Hoy</span>
            </div>

            <div className="flex justify-between items-center p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 rounded-lg border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <span className="inline-block text-xs bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-medium px-2 py-0.5 rounded mb-1">
                  Logística
                </span>
                <h3 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">Despacho de Inversores SMA 50kW a Sitio</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Pendiente de confirmación de salida de almacén</p>
              </div>
              <span className="text-xs text-zinc-400">Mañana</span>
            </div>
          </div>
        </div>

        {/* Info panel */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Acceso de Administración</h2>
          <RequirePermission 
            action="admin:write" 
            fallback={
              <div className="text-center p-4 bg-zinc-50 dark:bg-zinc-800/20 rounded-lg">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No cuentas con permisos administrativos.</p>
              </div>
            }
          >
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700">
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Panel administrativo desbloqueado</p>
              <p className="text-xs text-zinc-500 mt-1">Puedes gestionar la configuración global y usuarios de la empresa.</p>
            </div>
          </RequirePermission>
        </div>
      </div>
    </div>
  );
}
