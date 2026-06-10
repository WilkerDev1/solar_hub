'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/core/database/supabase';
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
  AlertTriangle,
  Loader2,
  Plus
} from 'lucide-react';
import { RequirePermission } from '@/core/auth/AuthContext';
import { getRoleTemplates, saveRoleTemplate, RoleTemplateRow } from '@/core/services/admin';
import { Button } from '@/core/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/core/components/ui/dialog';

interface OrionMetrics {
  clientsActive: number;
  clientsProspect: number;
  projectsBuilding: number;
  projectsDesign: number;
  employeesActive: number;
  employeesTotal: number;
}

export default function AdminModule() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<OrionMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Role permissions templates states
  const [templates, setTemplates] = useState<RoleTemplateRow[]>([]);
  const [allPerms, setAllPerms] = useState<{ id: string; action: string; description: string | null }[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('Técnico de Campo');
  const [rolePerms, setRolePerms] = useState<string[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  
  // Create role states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  // Load real metrics and role templates
  useEffect(() => {
    const loadMetrics = async () => {
      setMetricsLoading(true);
      try {
        // Clients metrics
        const { count: clientsActive } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'activo');

        const { count: clientsProspect } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'prospecto');

        // Projects metrics
        const { count: projectsBuilding } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .in('phase', ['Construccion', 'Permisos']);

        const { count: projectsDesign } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('phase', 'Diseno');

        // Employee metrics
        const { count: employeesActive } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        const { count: employeesTotal } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        setMetrics({
          clientsActive: clientsActive || 0,
          clientsProspect: clientsProspect || 0,
          projectsBuilding: projectsBuilding || 0,
          projectsDesign: projectsDesign || 0,
          employeesActive: employeesActive || 0,
          employeesTotal: employeesTotal || 0,
        });
      } catch (err) {
        console.error('Error loading Orion metrics:', err);
        setMetrics({
          clientsActive: 0,
          clientsProspect: 0,
          projectsBuilding: 0,
          projectsDesign: 0,
          employeesActive: 0,
          employeesTotal: 0,
        });
      } finally {
        setMetricsLoading(false);
      }
    };

    loadMetrics();
  }, []);

  // Load role templates and permissions catalogue
  useEffect(() => {
    const loadTemplatesAndPerms = async () => {
      try {
        const temps = await getRoleTemplates();
        setTemplates(temps);

        const { data: dbPerms } = await supabase
          .from('permissions')
          .select('id, action, description');
        setAllPerms(dbPerms || []);

        const activeTemp = temps.find((t) => t.role_name === selectedRole);
        setRolePerms(activeTemp ? (activeTemp.permission_actions as string[]) : []);
      } catch (err) {
        console.error('Error loading role templates or perms:', err);
      }
    };
    loadTemplatesAndPerms();
  }, []);

  // Update checkbox state when selectedRole changes
  useEffect(() => {
    const activeTemp = templates.find((t) => t.role_name === selectedRole);
    setRolePerms(activeTemp ? (activeTemp.permission_actions as string[]) : []);
  }, [selectedRole, templates]);

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    setSavingTemplate(true);
    try {
      await saveRoleTemplate(newRoleName, []);
      const temps = await getRoleTemplates();
      setTemplates(temps);
      setSelectedRole(newRoleName);
      setIsCreateDialogOpen(false);
      setNewRoleName('');
    } catch (err: any) {
      alert(err.message || 'Error al crear rol');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleSaveTemplate = async () => {
    setSavingTemplate(true);
    try {
      await saveRoleTemplate(selectedRole, rolePerms);
      alert(`Plantilla para el rol "${selectedRole}" guardada con éxito.`);
      const temps = await getRoleTemplates();
      setTemplates(temps);
    } catch (err: any) {
      alert(err.message || 'Error al guardar la plantilla.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const categories = [
    {
      title: 'CRM',
      tag: '[CRM]',
      description: 'Gestión de cuentas de clientes industriales y seguimiento de consumo.',
      icon: Building,
      accent: 'border-emerald-500/20 text-emerald-400',
      stats: [
        { label: 'Clientes Activos', value: metricsLoading ? '...' : String(metrics?.clientsActive ?? 0) },
        { label: 'Prospectos en Negociación', value: metricsLoading ? '...' : String(metrics?.clientsProspect ?? 0) }
      ],
      actionLabel: 'Ir a Clientes CRM',
      action: () => router.push('/?tab=clients'),
    },
    {
      title: 'PRODUCCIÓN',
      tag: '[PRODUCCIÓN]',
      description: 'Supervisión de obras, fase de proyectos de ingeniería y generación de planos.',
      icon: FolderKanban,
      accent: 'border-amber-500/20 text-amber-400',
      stats: [
        { label: 'Obras en Ejecución', value: metricsLoading ? '...' : String(metrics?.projectsBuilding ?? 0) },
        { label: 'Proyectos en Diseño', value: metricsLoading ? '...' : String(metrics?.projectsDesign ?? 0) }
      ],
      actionLabel: 'Monitorear Proyectos',
      action: () => router.push('/?tab=projects'),
    },
    {
      title: 'INVENTARIO',
      tag: '[INVENTARIO]',
      description: 'Control de stock de paneles solares, inversores y componentes en tránsito.',
      icon: Package,
      accent: 'border-blue-500/20 text-blue-400',
      stats: [
        { label: 'Items Registrados', value: '—' },
        { label: 'Stock Alerta Crítica', value: '—' }
      ],
      actionLabel: 'Ver Inventario',
      action: () => router.push('/?tab=inventory'),
    },
    {
      title: 'DATOS & SISTEMA',
      tag: '[DATOS]',
      description: 'Gestión de empleados, accesos de personal y configuración multi-tenant.',
      icon: Database,
      accent: 'border-purple-500/20 text-purple-400',
      stats: [
        { label: 'Empleados Activos', value: metricsLoading ? '...' : String(metrics?.employeesActive ?? 0) },
        { label: 'Perfiles Totales', value: metricsLoading ? '...' : String(metrics?.employeesTotal ?? 0) }
      ],
      actionLabel: 'Gestión de Empleados',
      action: () => router.push('/admin/users'),
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
                        <span className={`block text-sm font-bold truncate mt-0.5 ${
                          stat.value === '...' ? 'text-zinc-600 animate-pulse' : 
                          stat.value === '—' ? 'text-zinc-600' : 'text-white'
                        }`}>
                          {stat.value === '...' ? <Loader2 className="h-4 w-4 animate-spin inline" /> : stat.value}
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

        {/* Plantillas de Permisos por Rol (RBAC Dinámico) */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-6 text-left">
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              Gestión de Plantillas de Roles y Permisos (RBAC Dinámico)
            </h2>
            <p className="text-zinc-400 text-xs mt-1">
              Asocia facultades a los roles base de la empresa en caliente. Los cambios se propagan de forma reactiva a todos los usuarios del rol.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Role Selector */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-zinc-500 text-xs font-mono uppercase tracking-wider block">Seleccionar Rol</label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg text-sm p-2.5 text-white h-11 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    {templates.length === 0 ? (
                      <>
                        <option value="Técnico de Campo">Técnico de Campo</option>
                        <option value="Ingeniero">Ingeniero</option>
                        <option value="Administrador">Administrador</option>
                      </>
                    ) : (
                      templates.map((t) => (
                        <option key={t.role_name} value={t.role_name}>
                          {t.role_name}
                        </option>
                      ))
                    )}
                  </select>

                  <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger className="h-11 px-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg shrink-0 flex items-center justify-center">
                      <Plus className="h-4 w-4 text-zinc-300" />
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Crear nuevo rol</DialogTitle>
                      </DialogHeader>
                      <div className="py-4 space-y-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase">Nombre del Rol</label>
                        <input 
                          type="text" 
                          value={newRoleName} 
                          onChange={(e) => setNewRoleName(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white text-sm focus:border-emerald-500 focus:outline-none"
                          placeholder="Ej: Asesor Legal"
                        />
                      </div>
                      <DialogFooter>
                        <Button onClick={handleCreateRole} disabled={savingTemplate || !newRoleName.trim()} className="bg-emerald-600 hover:bg-emerald-500">
                          {savingTemplate ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                          Crear Rol
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="bg-zinc-950/40 border border-zinc-800/60 p-4 rounded-xl text-xs space-y-2">
                <span className="font-bold text-white block">Estado de Sincronización</span>
                <p className="text-zinc-500 leading-normal">
                  Al pulsar guardar, un trigger PostgreSQL intercepta la operación y actualiza la tabla real de <code className="text-emerald-400">role_permissions</code>.
                </p>
              </div>
            </div>

            {/* Right Column (spans 2 columns): Perms Selection checklist */}
            <div className="lg:col-span-2 space-y-4">
              <span className="text-zinc-500 text-xs font-mono uppercase tracking-wider block">Permisos Disponibles</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-2">
                {allPerms.map((perm) => {
                  const isChecked = rolePerms.includes(perm.action);
                  return (
                    <label
                      key={perm.id}
                      className="flex items-start gap-2.5 p-2 bg-zinc-950 border border-zinc-850 hover:border-zinc-800 rounded-lg cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setRolePerms([...rolePerms, perm.action]);
                          } else {
                            setRolePerms(rolePerms.filter((a) => a !== perm.action));
                          }
                        }}
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <span className="block text-xs font-bold text-white font-mono">{perm.action}</span>
                        {perm.description && (
                          <span className="block text-[10px] text-zinc-500 mt-0.5 leading-tight">{perm.description}</span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSaveTemplate}
                  disabled={savingTemplate}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-11 px-5 rounded-xl text-sm shadow-lg shadow-emerald-950/40 flex items-center gap-2"
                >
                  {savingTemplate ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
                  ) : (
                    'Guardar Plantilla de Permisos'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Host Status bar */}
        <div className="bg-zinc-950/80 border border-zinc-850 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-emerald-400 animate-pulse" />
            <span>Servidor local: <strong>Supabase CLI v2.102.0 (Docker)</strong></span>
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
