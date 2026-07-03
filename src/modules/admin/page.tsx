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
  Plus,
  ArrowLeft,
  ClipboardList,
  FolderOpen,
  Bot,
  LayoutDashboard
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
  const [view, setView] = useState<'menu' | 'permissions'>('menu');
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

  const adminModules = [
    {
      category: 'CRM',
      tag: '[CRM]',
      items: [
        {
          id: 'clients',
          label: 'Clientes CRM',
          sublabel: metricsLoading 
            ? 'Cargando clientes...' 
            : `Gestión de cuentas de clientes (${metrics?.clientsActive ?? 0} activos, ${metrics?.clientsProspect ?? 0} prospectos).`,
          badge: '[CRM.CLI]',
          icon: Building,
          action: () => router.push('/?tab=clients')
        }
      ]
    },
    {
      category: 'PRODUCCIÓN',
      tag: '[PRODUCCIÓN]',
      items: [
        {
          id: 'projects',
          label: 'Proyectos (Core)',
          sublabel: metricsLoading 
            ? 'Cargando obras...' 
            : `Monitoreo de obras (${metrics?.projectsBuilding ?? 0} en ejecución, ${metrics?.projectsDesign ?? 0} en diseño).`,
          badge: '[PROD.PROJ]',
          icon: FolderKanban,
          action: () => router.push('/?tab=projects')
        },
        {
          id: 'tasks',
          label: 'Mis Tareas',
          sublabel: 'Seguimiento de tareas asignadas y entregas de campo.',
          badge: '[TASK.OPS]',
          icon: ClipboardList,
          action: () => router.push('/?tab=tasks')
        }
      ]
    },
    {
      category: 'INVENTARIO',
      tag: '[INVENTARIO]',
      items: [
        {
          id: 'inventory',
          label: 'Inventario',
          sublabel: 'Control de stock de paneles solares, inversores y componentes en tránsito.',
          badge: '[INV.SYS]',
          icon: Package,
          action: () => router.push('/?tab=inventory')
        }
      ]
    },
    {
      category: 'DATOS & SISTEMA',
      tag: '[DATOS]',
      items: [
        {
          id: 'documents',
          label: 'Documentos',
          sublabel: 'Bóveda de archivos, planos de ingeniería y entregables del sistema.',
          badge: '[SYS.DOCS]',
          icon: FolderOpen,
          action: () => router.push('/?tab=documents')
        },
        {
          id: 'caleb',
          label: 'Asistente Caleb',
          sublabel: 'Chat inteligente con Caleb AI y ejecución de consultas de negocio.',
          badge: '[SYS.CALEB]',
          icon: Bot,
          action: () => router.push('/?tab=caleb')
        },
        {
          id: 'dashboard',
          label: 'Dashboard',
          sublabel: 'Métricas operativas y resumen general de Solar Hub.',
          badge: '[SYS.DASH]',
          icon: LayoutDashboard,
          action: () => router.push('/?tab=dashboard')
        }
      ]
    },
    {
      category: 'ADMINISTRACIÓN',
      tag: '[ADMINISTRACIÓN]',
      items: [
        {
          id: 'users',
          label: 'Gestión de Empleados',
          sublabel: metricsLoading 
            ? 'Cargando empleados...' 
            : `Control de acceso, roles y perfiles del personal (${metrics?.employeesActive ?? 0} activos de ${metrics?.employeesTotal ?? 0}).`,
          badge: '[ADMIN.USERS]',
          icon: Users,
          action: () => router.push('/admin/users')
        },
        {
          id: 'permissions',
          label: 'Gestión de Permisos',
          sublabel: 'Configuración de plantillas de permisos y seguridad RBAC dinámica.',
          badge: '[ADMIN.PERMS]',
          icon: ShieldCheck,
          action: () => setView('permissions')
        }
      ]
    }
  ];

  return (
    <RequirePermission action="admin:*" fallback={
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 text-center rounded-2xl max-w-md mx-auto mt-12">
        <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto mb-4" />
        <h3 className="text-zinc-800 dark:text-white font-bold text-lg">Acceso Denegado</h3>
        <p className="text-zinc-550 dark:text-zinc-400 text-sm mt-2">
          No tienes permisos administrativos (`admin:*`) para acceder a esta consola de administración.
        </p>
      </div>
    }>
      {view === 'menu' ? (
        <div className="space-y-8 max-w-5xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="pb-5 text-left">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Solar Hub - Consola de Control
            </h1>
            <p className="text-zinc-500 text-xs mt-2 italic font-mono">
              "Minimalism is not a lack of something. It's simply the perfect amount of something." — Nicholas Burroughs
            </p>
          </div>

          {/* Groups of Cards */}
          <div className="space-y-8">
            {adminModules.map((group) => (
              <div key={group.category} className="space-y-3">
                {/* Group Title */}
                <span className="text-[11px] font-mono tracking-widest text-zinc-500 uppercase block text-left">
                  {group.tag}
                </span>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        onClick={item.action}
                        className="bg-[#1c1c21]/45 border border-zinc-800/80 rounded-xl p-5 hover:border-emerald-500/40 hover:bg-zinc-900/40 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[120px] group relative overflow-hidden text-left"
                      >
                        {/* Subtle top glow line */}
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono font-bold tracking-wider text-emerald-400 block">
                              {item.badge}
                            </span>
                            <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors duration-250">
                              {item.label}
                            </h3>
                            <p className="text-xs text-zinc-500 leading-normal">
                              {item.sublabel}
                            </p>
                          </div>
                          <div className="h-8 w-8 rounded-lg bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-center text-zinc-450 group-hover:text-white group-hover:border-zinc-700 transition-colors shrink-0">
                            <Icon className="h-4.5 w-4.5" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Host Status bar */}
          <div className="bg-[#1c1c21]/80 border border-zinc-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs text-zinc-550 dark:text-zinc-400 mt-8">
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
      ) : (
        /* Permissions view */
        <div className="space-y-6 max-w-5xl mx-auto px-4 py-6">
          {/* Breadcrumb / Back button */}
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-5 text-left">
            <button
              onClick={() => setView('menu')}
              className="h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">ADMINISTRACIÓN / SEGURIDAD</span>
              <h1 className="text-xl font-bold text-white tracking-wide">
                Gestión de Permisos (RBAC)
              </h1>
            </div>
          </div>

          {/* Plantillas de Permisos por Rol (RBAC Dinámico) */}
          <div className="bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-6 text-left">
            <div>
              <h2 className="text-lg font-bold text-zinc-800 dark:text-white tracking-wide flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                Gestión de Plantillas de Roles y Permisos (RBAC Dinámico)
              </h2>
              <p className="text-zinc-550 dark:text-zinc-400 text-xs mt-1">
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
                      className="flex-1 bg-white dark:bg-[#161618] border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm p-2.5 text-zinc-800 dark:text-white h-11 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
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
                      <DialogTrigger className="h-11 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg shrink-0 flex items-center justify-center">
                        <Plus className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Crear nuevo rol</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-2">
                          <label className="text-xs font-bold text-zinc-550 dark:text-zinc-400 uppercase">Nombre del Rol</label>
                          <input 
                            type="text" 
                            value={newRoleName} 
                            onChange={(e) => setNewRoleName(e.target.value)}
                            className="w-full bg-white dark:bg-[#161618] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-zinc-800 dark:text-white text-sm focus:border-emerald-500 focus:outline-none"
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

                <div className="bg-zinc-50 dark:bg-[#161618]/40 border border-zinc-200/60 dark:border-zinc-800/60 p-4 rounded-xl text-xs space-y-2">
                  <span className="font-bold text-zinc-800 dark:text-white block">Estado de Sincronización</span>
                  <p className="text-zinc-550 leading-normal">
                    Al pulsar guardar, un trigger PostgreSQL intercepta la operación y actualiza la tabla real de <code className="text-emerald-400">role_permissions</code>.
                  </p>
                </div>
              </div>

              {/* Right Column (spans 2 columns): Perms Selection checklist */}
              <div className="lg:col-span-2 space-y-4">
                <span className="text-zinc-550 text-xs font-mono uppercase tracking-wider block">Permisos Disponibles</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-2">
                  {allPerms.map((perm) => {
                    const isChecked = rolePerms.includes(perm.action);
                    return (
                      <label
                        key={perm.id}
                        className="flex items-start gap-2.5 p-2 bg-white dark:bg-[#161618] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-800 rounded-lg cursor-pointer transition-colors"
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
                          <span className="block text-xs font-bold text-zinc-800 dark:text-white font-mono">{perm.action}</span>
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
        </div>
      )}
    </RequirePermission>
  );
}
