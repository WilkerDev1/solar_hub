'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/core/auth/AuthContext';
import DashboardModule from '@/modules/dashboard/page';
import ChatModule from '@/modules/chat/page';
import ProjectsModule from '@/modules/projects/page';
import InventoryModule from '@/modules/inventory/page';
import ClientsModule from '@/modules/clients/page';
import AdminModule from '@/modules/admin/page';
import TasksModule from '@/modules/tasks/page';

import { 
  Sun, 
  LayoutDashboard, 
  MessageSquare, 
  FolderKanban, 
  Package, 
  UsersRound,
  ShieldCheck,
  Building,
  Menu,
  X,
  LogOut,
  ClipboardList
} from 'lucide-react';

interface DashboardShellProps {
  children?: React.ReactNode;
  defaultTab?: 'dashboard' | 'chat' | 'projects' | 'inventory' | 'clients' | 'admin' | 'tasks';
}

export function DashboardShell({ children, defaultTab = 'dashboard' }: DashboardShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, roles, loading, signOut, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'projects' | 'inventory' | 'clients' | 'admin' | 'tasks'>(defaultTab);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync tab from query parameter on initial load or browser navigation
  useEffect(() => {
    if (searchParams) {
      const tabParam = searchParams.get('tab');
      if (tabParam && ['dashboard', 'chat', 'projects', 'inventory', 'clients', 'admin', 'tasks'].includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    }
  }, [searchParams]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-4">
        <Sun className="h-10 w-10 text-amber-500 animate-spin" />
        <span className="text-zinc-400 text-sm font-medium">Verificando sesión...</span>
      </div>
    );
  }

  const renderModule = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardModule />;
      case 'chat':
        return <ChatModule />;
      case 'projects':
        return <ProjectsModule />;
      case 'inventory':
        return <InventoryModule />;
      case 'clients':
        return <ClientsModule />;
      case 'admin':
        return <AdminModule />;
      case 'tasks':
        return <TasksModule />;
      default:
        return <DashboardModule />;
    }
  };

  const handleTabClick = (tabId: 'dashboard' | 'chat' | 'projects' | 'inventory' | 'clients' | 'admin' | 'tasks') => {
    if (children) {
      router.push(`/?tab=${tabId}`);
    } else {
      setActiveTab(tabId);
      router.push(`/?tab=${tabId}`);
    }
  };

  const navLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'chat', label: 'Canales Chat', icon: MessageSquare },
    { id: 'projects', label: 'Proyectos (Core)', icon: FolderKanban },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'clients', label: 'Clientes CRM', icon: UsersRound },
    { id: 'tasks', label: 'Mis Tareas', icon: ClipboardList },
  ] as const;

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500 selection:text-black">
      {/* Decorative top-right glow */}
      <div className="absolute top-0 right-0 w-[30%] h-[30%] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Sidebar - PC Desktop View */}
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col justify-between hidden md:flex shrink-0 z-30">
        <div>
          {/* Header Brand */}
          <div className="h-16 flex items-center px-6 gap-3 border-b border-zinc-800 bg-zinc-950">
            <Sun className="h-6 w-6 text-amber-500 animate-spin-slow" />
            <span className="font-bold text-white text-base tracking-widest uppercase">SOLAR HUB</span>
          </div>

          {/* Tenant / Company Details */}
          <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
            <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800 flex items-center space-x-3">
              <Building className="h-5 w-5 text-emerald-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider">WORKSPACE</span>
                <span className="block text-xs font-semibold text-white truncate">
                  {user.companyName || 'Cargando Tenant...'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = !children && activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => handleTabClick(link.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 font-semibold shadow-inner'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                  <span>{link.label}</span>
                </button>
              );
            })}

            {/* Admin only tab */}
            {hasPermission('admin:*') && (
              <button
                onClick={() => handleTabClick('admin')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  (!children && activeTab === 'admin')
                    ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 font-semibold shadow-inner'
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent'
                }`}
              >
                <ShieldCheck className={`h-4.5 w-4.5 ${(!children && activeTab === 'admin') ? 'text-emerald-400' : 'text-zinc-400'}`} />
                <span>Administración</span>
              </button>
            )}
          </nav>
        </div>

        {/* User Card */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/40 space-y-3">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-700/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user.fullName}</p>
              <p className="text-[10px] text-zinc-500 truncate">{roles[0]?.name || 'Técnico'}</p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-xs font-semibold bg-zinc-850 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-300 rounded-lg transition-colors border border-zinc-800 hover:border-rose-900/30"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar overlay (Drawer) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/85 backdrop-blur-sm transition-opacity duration-300">
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-zinc-900 border-r border-zinc-800 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun className="h-6 w-6 text-amber-500" />
                <span className="font-bold text-white text-base tracking-widest">SOLAR HUB</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tenant details for mobile */}
            <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800 flex items-center space-x-3">
              <Building className="h-5 w-5 text-emerald-400" />
              <div className="min-w-0 flex-1">
                <span className="block text-[9px] text-zinc-500 font-bold uppercase tracking-wider">WORKSPACE ACTIVO</span>
                <span className="block text-xs font-semibold text-white truncate">{user.companyName}</span>
              </div>
            </div>

            {/* Navigation links - Mobile-First High Contrast Touch Targets */}
            <nav className="flex-1 space-y-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = !children && activeTab === link.id;
                return (
                  <button
                    key={link.id}
                    onClick={() => {
                      handleTabClick(link.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-4 px-4 py-4 rounded-xl text-base font-semibold transition-colors ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-700/20'
                        : 'bg-zinc-800/40 text-zinc-300 hover:bg-zinc-800'
                    }`}
                    style={{ minHeight: '48px' }}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{link.label}</span>
                  </button>
                );
              })}

              {/* Admin tab mobile */}
              {hasPermission('admin:*') && (
                <button
                  onClick={() => {
                    handleTabClick('admin');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-4 px-4 py-4 rounded-xl text-base font-semibold transition-colors ${
                    (!children && activeTab === 'admin')
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-700/20'
                      : 'bg-zinc-800/40 text-zinc-300 hover:bg-zinc-800'
                  }`}
                  style={{ minHeight: '48px' }}
                >
                  <ShieldCheck className="h-5 w-5 shrink-0" />
                  <span>Administración</span>
                </button>
              )}
            </nav>

            {/* Mobile Footer */}
            <div className="border-t border-zinc-800 pt-4 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-700/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{user.fullName}</p>
                  <p className="text-[9px] text-zinc-500">{roles[0]?.name || 'Técnico'}</p>
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-zinc-800 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-300 rounded-xl transition-colors border border-zinc-700 hover:border-rose-900/30 font-semibold"
                style={{ minHeight: '48px' }}
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-16 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 px-6 flex items-center justify-between z-20">
          {/* Header Mobile Brand & Burger */}
          <div className="flex items-center space-x-3 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{ minHeight: '40px', minWidth: '40px' }}
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-bold text-white text-sm tracking-wider">SOLAR HUB</span>
          </div>

          {/* PC Tenant Status */}
          <div className="hidden md:flex items-center space-x-4">
            <span className="text-[11px] bg-zinc-800 text-zinc-400 px-3 py-1.5 rounded-xl border border-zinc-700/50 font-medium">
              Multi-tenant Tenant: <strong className="text-white font-bold">{user.companyName}</strong>
            </span>
          </div>

          {/* User roles & settings */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-xs text-zinc-400 bg-zinc-950 border border-zinc-850 px-3 py-1.5 rounded-xl">
              <ShieldCheck className="h-4 w-4 mr-1 text-emerald-400" />
              <span className="hidden sm:inline">Permisos:</span>
              <span className="font-bold text-white ml-1">{roles[0]?.name || 'Técnico'}</span>
            </div>
          </div>
        </header>

        {/* Module Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto z-10">
          {children ? children : renderModule()}
        </main>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-4">
        <Sun className="h-10 w-10 text-amber-500 animate-spin" />
        <span className="text-zinc-400 text-sm font-medium">Cargando aplicación...</span>
      </div>
    }>
      <DashboardShell />
    </Suspense>
  );
}
