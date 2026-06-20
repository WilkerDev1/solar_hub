'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, RequirePermission } from '@/core/auth/AuthContext';
import { supabase } from '@/core/database/supabase';
import { 
  Sun, 
  ShieldAlert, 
  ShieldCheck,
  CheckCircle, 
  Clock, 
  ClipboardList, 
  Package, 
  FolderKanban, 
  UsersRound, 
  Loader2, 
  ArrowRight,
  TrendingUp
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'inventory' | 'task' | 'project' | 'client';
  title: string;
  description: string;
  user: string;
  timestamp: Date;
}

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  area: string;
}

export default function DashboardModule() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    generationToday: '542.4 kWh',
    projectsCount: 0,
    itemsCount: 0,
    lowStockCount: 0
  });
  const [myTasks, setMyTasks] = useState<TaskItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      if (!user) return;
      setLoading(true);

      try {
        // 1. Fetch Projects count
        const { count: projectsCount, error: projErr } = await supabase
          .from('projects')
          .select('id', { count: 'exact', head: true });

        // 2. Fetch Inventory Stats
        const { data: invItems, error: invErr } = await supabase
          .from('inventory_items')
          .select('stock, min_stock');

        const itemsCount = invItems?.length || 0;
        const lowStockCount = invItems?.filter(item => (item.stock || 0) <= (item.min_stock || 0)).length || 0;

        // 3. Fetch Tasks
        const { data: allTasks, error: tasksErr } = await supabase
          .from('global_tasks')
          .select('id, title, status, priority, due_date, area, assigned_to, assigned_to_ids, created_at, task_activities')
          .order('created_at', { ascending: false });

        const userTasks = (allTasks || [])
          .filter(t => t.assigned_to === user.id || (Array.isArray(t.assigned_to_ids) && t.assigned_to_ids.includes(user.id)))
          .slice(0, 5) as TaskItem[];

        // 4. Fetch Projects for Activity
        const { data: recentProjects } = await supabase
          .from('projects')
          .select('id, name, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        // 5. Fetch Inventory Transactions for Activity
        const { data: recentTransactions } = await supabase
          .from('inventory_transactions')
          .select(`
            id,
            quantity,
            transaction_type,
            reason,
            created_at,
            inventory_items (name),
            profiles (full_name)
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        // 6. Fetch CRM Clients for Activity
        const { data: recentClients } = await supabase
          .from('clients')
          .select('id, name, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        // --- Compile Activities ---
        const compiledActivities: ActivityItem[] = [];

        // Add inventory transactions
        if (recentTransactions) {
          recentTransactions.forEach((t: any) => {
            compiledActivities.push({
              id: t.id,
              type: 'inventory',
              title: t.transaction_type === 'entrada' ? 'Entrada de Almacén' : t.transaction_type === 'salida' ? 'Despacho de Stock' : 'Ajuste de Stock',
              description: `${t.inventory_items?.name || 'Material'}: ${t.quantity > 0 ? '+' : ''}${t.quantity} unidades${t.reason ? ` (${t.reason})` : ''}`,
              user: t.profiles?.full_name || 'Sistema WMS',
              timestamp: new Date(t.created_at)
            });
          });
        }

        // Add task activities (extract logs from tasks)
        if (allTasks) {
          allTasks.forEach((task: any) => {
            const taskLogs = Array.isArray(task.task_activities) ? task.task_activities : [];
            taskLogs.slice(0, 3).forEach((log: any) => {
              compiledActivities.push({
                id: log.id || `${task.id}-${log.created_at}`,
                type: 'task',
                title: log.action || 'Cambio en Tarea',
                description: log.details || `Se editó la tarea "${task.title}"`,
                user: log.user_name || 'Colaborador',
                timestamp: new Date(log.created_at || task.created_at)
              });
            });
          });
        }

        // Add project creations
        if (recentProjects) {
          recentProjects.forEach((p: any) => {
            compiledActivities.push({
              id: p.id,
              type: 'project',
              title: 'Nuevo Proyecto Solar',
              description: `Se creó el proyecto de obra "${p.name}"`,
              user: 'Sistema',
              timestamp: new Date(p.created_at)
            });
          });
        }

        // Add client creations
        if (recentClients) {
          recentClients.forEach((c: any) => {
            compiledActivities.push({
              id: c.id,
              type: 'client',
              title: 'Cliente CRM Registrado',
              description: `Se registró al cliente "${c.name}" en la base comercial`,
              user: 'Sistema CRM',
              timestamp: new Date(c.created_at)
            });
          });
        }

        // Sort compiled activities by date DESC and slice to 8 items
        const sortedActivities = compiledActivities
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 8);

        // Update states
        setStats({
          generationToday: `${(520 + Math.random() * 30).toFixed(1)} kWh`,
          projectsCount: projectsCount || 0,
          itemsCount: itemsCount,
          lowStockCount: lowStockCount
        });
        setMyTasks(userTasks);
        setActivities(sortedActivities);

      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center space-x-2">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Cargando métricas y actividades...</span>
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'inventory':
        return <Package className="h-4 w-4 text-amber-500 dark:text-amber-400" />;
      case 'task':
        return <ClipboardList className="h-4 w-4 text-blue-500 dark:text-blue-400" />;
      case 'project':
        return <FolderKanban className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />;
      case 'client':
        return <UsersRound className="h-4 w-4 text-purple-500 dark:text-purple-400" />;
      default:
        return <Clock className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'inventory':
        return 'bg-amber-50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-900/30';
      case 'task':
        return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-900/30';
      case 'project':
        return 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/30';
      case 'client':
        return 'bg-purple-50 dark:bg-purple-950/20 border-purple-200/50 dark:border-purple-900/30';
      default:
        return 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800';
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-800 dark:text-zinc-50 transition-colors">
            Buenos días, {user?.fullName || 'Usuario'}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 transition-colors">
            Resumen operativo de tu planta solar y tareas del día.
          </p>
        </div>
      </header>

      {/* Quick stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center space-x-4 transition-all duration-200 hover:shadow-md">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
            <Sun className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-bold tracking-wider">Generación Hoy</p>
            <p className="text-xl font-black text-zinc-800 dark:text-zinc-50">{stats.generationToday}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center space-x-4 transition-all duration-200 hover:shadow-md">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-bold tracking-wider">Proyectos Activos</p>
            <p className="text-xl font-black text-zinc-800 dark:text-zinc-50">{stats.projectsCount} Proyectos</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center space-x-4 transition-all duration-200 hover:shadow-md">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-bold tracking-wider">Materiales Catalogo</p>
            <p className="text-xl font-black text-zinc-800 dark:text-zinc-50">{stats.itemsCount} Items</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center space-x-4 transition-all duration-200 hover:shadow-md">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-bold tracking-wider">Stock Crítico</p>
            <p className="text-xl font-black text-zinc-800 dark:text-zinc-50">{stats.lowStockCount} Alertas</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main activity list */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 lg:col-span-2 space-y-4 transition-all duration-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-50 tracking-tight">Mis Tareas Asignadas</h2>
            <TrendingUp className="h-4.5 w-4.5 text-emerald-500" />
          </div>

          <div className="space-y-3">
            {myTasks.length === 0 ? (
              <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                <p className="text-xs text-zinc-400">No tienes tareas asignadas pendientes en este workspace.</p>
              </div>
            ) : (
              myTasks.map((task) => (
                <div 
                  key={task.id} 
                  className="flex justify-between items-center p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800/60 transition-all duration-150"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="inline-block text-[9px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-450 px-2 py-0.5 rounded-md">
                        {task.area}
                      </span>
                      <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        task.priority === 'alta' 
                          ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400' 
                          : task.priority === 'media'
                          ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-750 dark:text-amber-400'
                          : 'bg-zinc-150 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-zinc-850 dark:text-zinc-200 truncate pr-4">{task.title}</h3>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-semibold text-zinc-400">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Sin fecha'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Info panel / Admin section */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 space-y-4 transition-all duration-200">
          <h2 className="text-lg font-bold text-zinc-850 dark:text-zinc-50 tracking-tight">Acceso Rápido</h2>
          
          <div className="space-y-3">
            <RequirePermission 
              action="admin:write" 
              fallback={
                <div className="text-center p-4 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">No cuentas con permisos administrativos.</p>
                </div>
              }
            >
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-250/30 dark:border-emerald-900/20 transition-all duration-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" />
                  Panel Admin Desbloqueado
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Puedes administrar roles, categorizaciones WMS e invitaciones del equipo.
                </p>
              </div>
            </RequirePermission>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-950/30 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200">
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Sun className="h-4 w-4 text-amber-500" />
                Workspace Multi-tenant
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                La información expuesta está aislada con políticas RLS de Supabase.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* NEW: Unified Historial General de Actividad Box */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 transition-all duration-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-50 tracking-tight">Historial General de Actividad</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Todas las acciones recientes realizadas en el sistema (Inventario WMS, Tareas, Obras y CRM).</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500 dark:text-zinc-400 transition-colors">
            Monitoreo en Vivo
          </span>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-full inline-block align-middle">
            <div className="overflow-hidden border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                <thead className="bg-zinc-50 dark:bg-zinc-950/60">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Acción</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Detalles</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Responsable</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Fecha / Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900/40">
                  {activities.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-xs text-zinc-400">
                        No hay actividad reciente registrada.
                      </td>
                    </tr>
                  ) : (
                    activities.map((act) => (
                      <tr key={act.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-all duration-100">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center space-x-2.5">
                            <div className={`p-1.5 rounded-lg border ${getActivityColor(act.type)}`}>
                              {getActivityIcon(act.type)}
                            </div>
                            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{act.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-zinc-650 dark:text-zinc-300 font-medium max-w-md truncate md:max-w-lg lg:max-w-xl">
                            {act.description}
                          </p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">{act.user}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                            {act.timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' })} a las {act.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
