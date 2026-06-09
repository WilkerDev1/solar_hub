'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building, 
  FolderKanban, 
  Package, 
  Database, 
  Users, 
  ArrowRight,
  ShieldCheck,
  Server,
  CloudLightning,
  AlertTriangle
} from 'lucide-react';
import { RequirePermission } from '@/core/auth/AuthContext';

export default function AdminModule() {
  const router = useRouter();

  const categories = [
    {
      title: 'CRM',
      tag: '[CRM]',
      description: 'Gestión de cuentas de clientes industriales y seguimiento de consumo.',
      icon: Building,
      accent: 'border-emerald-500/20 text-emerald-400',
      stats: [
        { label: 'Clientes Activos', value: '2' },
        { label: 'Prospectos en Negociación', value: '1' }
      ],
      actionLabel: 'Ir a Clientes CRM',
      action: () => {
        if (typeof window !== 'undefined') {
          window.location.search = '?tab=clients';
        }
      }
    },
    {
      title: 'PRODUCCIÓN',
      tag: '[PRODUCCIÓN]',
      description: 'Supervisión de obras, fase de proyectos de ingeniería y generación de planos.',
      icon: FolderKanban,
      accent: 'border-amber-500/20 text-amber-400',
      stats: [
        { label: 'Obras en Construcción', value: '2' },
        { label: 'Proyectos en Diseño', value: '2' }
      ],
      actionLabel: 'Monitorear Proyectos',
      action: () => {
        if (typeof window !== 'undefined') {
          window.location.search = '?tab=projects';
        }
      }
    },
    {
      title: 'INVENTARIO',
      tag: '[INVENTARIO]',
      description: 'Control de stock de paneles solares, inversores y componentes en tránsito.',
      icon: Package,
      accent: 'border-blue-500/20 text-blue-400',
      stats: [
        { label: 'Items Registrados', value: '84' },
        { label: 'Stock Alerta Crítica', value: '0' }
      ],
      actionLabel: 'Ver Inventario',
      action: () => {
        if (typeof window !== 'undefined') {
          window.location.search = '?tab=inventory';
        }
      }
    },
    {
      title: 'DATOS & SISTEMA',
      tag: '[DATOS]',
      description: 'Respaldo de base de datos, logs de auditoría multi-tenant y accesos de personal.',
      icon: Database,
      accent: 'border-purple-500/20 text-purple-400',
      stats: [
        { label: 'Conexión Supabase', value: 'Activa' },
        { label: 'Políticas RLS', value: 'Habilitadas' }
      ],
      actionLabel: 'Gestión de Empleados',
      action: () => {
        router.push('/admin/users');
      }
    }
  ];

  return (
    <RequirePermission action="admin:*" fallback={
      <div className="bg-zinc-900 border border-zinc-800 p-8 text-center rounded-2xl max-w-md mx-auto mt-12">
        <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto mb-4" />
        <h3 className="text-white font-bold text-lg">Acceso Denegado</h3>
        <p className="text-zinc-400 text-sm mt-2">
          No tienes permisos administrativos (`admin:*`) para acceder a esta consola de administración.
        </p>
      </div>
    }>
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-zinc-800 pb-5">
          <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-400 animate-pulse" />
            Consola de Administración
          </h1>
          <p className="text-zinc-400 text-xs mt-1">
            Galería de alta densidad visual para el control global de operaciones de Solar Hub.
          </p>
        </div>

        {/* Categories Grid (Orion-Inspired) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <div 
                key={idx} 
                className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 hover:border-emerald-500/30 transition-all duration-300 rounded-2xl p-6 flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Visual grid accent line */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div>
                  {/* Category Header */}
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase">
                      {cat.tag}
                    </span>
                    <Icon className="h-5 w-5 text-zinc-500 group-hover:text-white transition-colors duration-300" />
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2 tracking-wide group-hover:text-emerald-400 transition-colors duration-300">
                    {cat.title}
                  </h3>
                  
                  <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                    {cat.description}
                  </p>

                  {/* Dense Stats Blocks */}
                  <div className="grid grid-cols-2 gap-3 mb-6 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/50">
                    {cat.stats.map((stat, sIdx) => (
                      <div key={sIdx} className="min-w-0">
                        <span className="block text-[9px] font-mono text-zinc-500 uppercase tracking-wider truncate">
                          {stat.label}
                        </span>
                        <span className="block text-sm font-bold text-white truncate mt-0.5">
                          {stat.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tactile Large Action Trigger */}
                <button
                  onClick={cat.action}
                  className="w-full flex items-center justify-between px-4 py-3 bg-zinc-850 hover:bg-emerald-600 hover:text-white text-zinc-300 text-xs font-bold rounded-xl transition-all duration-200 border border-zinc-800 group-hover:border-emerald-500/20"
                  style={{ minHeight: '48px' }}
                >
                  <span>{cat.actionLabel}</span>
                  <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Host Status bar */}
        <div className="bg-zinc-950/80 border border-zinc-850 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-emerald-400 animate-pulse" />
            <span>Servidor local de desarrollo: <strong>Supabase CLI v2.102.0 (Docker)</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <CloudLightning className="h-4 w-4 text-amber-500" />
            <span>Latencia de base de datos: <strong>Normal</strong></span>
          </div>
        </div>
      </div>
    </RequirePermission>
  );
}
