'use client';

import React, { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/core/auth/AuthContext';
import DashboardModule from '@/modules/dashboard/page';
import ProjectsModule from '@/modules/projects/page';
import InventoryModule from '@/modules/inventory/page';
import ClientsModule from '@/modules/clients/page';
import AdminModule from '@/modules/admin/page';
import TasksModule from '@/modules/tasks/page';
import CalebModule from '@/modules/caleb/page';
import DocumentsModule from '@/modules/documents/page';
import CalebFloatingWidget from '@/core/components/CalebFloatingWidget';

import { 
  Sun, 
  Moon,
  LayoutDashboard, 
  FolderKanban, 
  Package, 
  UsersRound,
  ShieldCheck,
  Building,
  Menu,
  X,
  LogOut,
  ClipboardList,
  Bot,
  FolderOpen
} from 'lucide-react';

  interface DashboardShellProps {
  children?: React.ReactNode;
  defaultTab?: 'dashboard' | 'projects' | 'inventory' | 'clients' | 'admin' | 'tasks' | 'caleb' | 'documents';
}

export function DashboardShell({ children, defaultTab = 'dashboard' }: DashboardShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, roles, loading, signOut, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'inventory' | 'clients' | 'admin' | 'tasks' | 'caleb' | 'documents'>(defaultTab);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sidebar drag states
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const isResizing = useRef(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = e.clientX;
    if (newWidth < 50) {
      setSidebarVisible(false);
      isResizing.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    } else if (newWidth < 140) {
      setSidebarCollapsed(true);
      setSidebarWidth(72);
    } else {
      setSidebarCollapsed(false);
      setSidebarWidth(Math.min(380, newWidth));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Sync tab from query parameter on initial load or browser navigation
  useEffect(() => {
    if (searchParams) {
      const tabParam = searchParams.get('tab');
      if (tabParam && ['dashboard', 'projects', 'inventory', 'clients', 'admin', 'tasks', 'caleb', 'documents'].includes(tabParam)) {
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4 transition-colors duration-200">
        <Sun className="h-10 w-10 text-amber-500 animate-spin" />
        <span className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Verificando sesión...</span>
      </div>
    );
  }

  const renderModule = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardModule />;
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
      case 'caleb':
        return <CalebModule />;
      case 'documents':
        return <DocumentsModule />;
      default:
        return <DashboardModule />;
    }
  };

  const handleTabClick = (tabId: 'dashboard' | 'projects' | 'inventory' | 'clients' | 'admin' | 'tasks' | 'caleb' | 'documents') => {
    if (children) {
      router.push(`/?tab=${tabId}`);
    } else {
      setActiveTab(tabId);
      router.push(`/?tab=${tabId}`);
    }
  };

  const navLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Proyectos (Core)', icon: FolderKanban },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'clients', label: 'Clientes CRM', icon: UsersRound },
    { id: 'tasks', label: 'Mis Tareas', icon: ClipboardList },
    { id: 'documents', label: 'Documentos', icon: FolderOpen },
    { id: 'caleb', label: 'Asistente Caleb', icon: Bot },
  ] as const;

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 font-sans selection:bg-emerald-500 selection:text-black transition-colors duration-200">
      {/* Decorative top-right glow */}
      <div className="absolute top-0 right-0 w-[30%] h-[30%] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Sidebar - PC Desktop View */}
      {sidebarVisible && (
        <aside 
          style={{ width: sidebarCollapsed ? '72px' : `${sidebarWidth}px` }}
          className="relative bg-zinc-100 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col justify-between hidden md:flex shrink-0 z-30 transition-colors duration-200 h-full select-none"
        >
          <div className="overflow-x-hidden">
            {/* Header Brand */}
            <div className={`h-16 flex items-center ${sidebarCollapsed ? 'justify-center px-0' : 'px-6 gap-3'} border-b border-zinc-200 dark:border-zinc-800 bg-zinc-200/40 dark:bg-zinc-950/40 transition-colors duration-200`}>
              <Sun className="h-6 w-6 text-amber-500 animate-spin-slow shrink-0" />
              {!sidebarCollapsed && (
                <span className="font-bold text-zinc-800 dark:text-white text-base tracking-widest uppercase truncate">SOLAR HUB</span>
              )}
            </div>

            <div className={`p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/50 ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
              <div title={user.companyName || 'Workspace'} className={`bg-white dark:bg-zinc-950/80 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center ${sidebarCollapsed ? 'p-2 justify-center' : 'p-3.5 space-x-3'} transition-colors duration-200 w-full`}>
                <Building className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                {!sidebarCollapsed && (
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] text-zinc-500 dark:text-zinc-500 font-bold uppercase tracking-wider">WORKSPACE</span>
                    <span className="block text-xs font-semibold text-zinc-800 dark:text-white truncate">
                      {user.companyName || 'Cargando Tenant...'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Links */}
            <nav className={`p-4 ${sidebarCollapsed ? 'space-y-3 px-2 flex flex-col items-center' : 'space-y-1.5'}`}>
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = !children && activeTab === link.id;
                return (
                  <button
                    key={link.id}
                    onClick={() => handleTabClick(link.id)}
                    title={sidebarCollapsed ? link.label : undefined}
                    className={`flex items-center rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                      sidebarCollapsed 
                        ? 'h-10 w-10 justify-center p-0' 
                        : 'w-full px-4 py-3 space-x-3'
                    } ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-semibold shadow-inner'
                        : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/50 hover:text-zinc-850 dark:hover:text-zinc-200 border border-transparent'
                    }`}
                  >
                    <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
                    {!sidebarCollapsed && <span className="truncate">{link.label}</span>}
                  </button>
                );
              })}

              {/* Admin only tab */}
              {hasPermission('admin:*') && (
                <button
                  onClick={() => handleTabClick('admin')}
                  title={sidebarCollapsed ? 'Administración' : undefined}
                  className={`flex items-center rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                    sidebarCollapsed 
                      ? 'h-10 w-10 justify-center p-0' 
                      : 'w-full px-4 py-3 space-x-3'
                  } ${
                    (!children && activeTab === 'admin')
                      ? 'bg-emerald-50 dark:bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-semibold shadow-inner'
                      : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/50 hover:text-zinc-850 dark:hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  <ShieldCheck className={`h-4.5 w-4.5 shrink-0 ${(!children && activeTab === 'admin') ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
                  {!sidebarCollapsed && <span className="truncate">Administración</span>}
                </button>
              )}
            </nav>
          </div>

          {/* User Card */}
          <div className={`p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-200/20 dark:bg-zinc-950/40 ${sidebarCollapsed ? 'flex flex-col items-center space-y-3 px-2' : 'space-y-3'} transition-colors duration-200 shrink-0`}>
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'}`}>
              <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-700/20 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-sm shrink-0" title={user.fullName}>
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-zinc-800 dark:text-white truncate">{user.fullName}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{roles[0]?.name || 'Técnico'}</p>
                </div>
              )}
            </div>
            <button
              onClick={() => signOut()}
              title={sidebarCollapsed ? 'Cerrar Sesión' : undefined}
              className={`flex items-center justify-center bg-zinc-200 hover:bg-rose-100 dark:bg-zinc-850 dark:hover:bg-rose-950/40 text-zinc-650 hover:text-rose-700 dark:text-zinc-400 dark:hover:text-rose-300 rounded-lg transition-colors border border-zinc-300 dark:border-zinc-800 hover:border-rose-300/30 dark:hover:border-rose-900/30 cursor-pointer ${
                sidebarCollapsed ? 'h-8 w-8 p-0' : 'w-full px-3 py-2 text-xs font-semibold space-x-2'
              }`}
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              {!sidebarCollapsed && <span>Cerrar Sesión</span>}
            </button>
          </div>

          {/* Resize Handle Divider (Desktop Only) */}
          <div 
            onMouseDown={startResizing}
            className="hidden md:block absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-emerald-500/30 active:bg-emerald-500 transition-colors z-40"
          />
        </aside>
      )}

      {/* Mobile Sidebar overlay (Drawer) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/85 backdrop-blur-sm transition-opacity duration-300">
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-zinc-100 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-6 space-y-6 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun className="h-6 w-6 text-amber-500" />
                <span className="font-bold text-zinc-850 dark:text-white text-base tracking-widest">SOLAR HUB</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tenant details for mobile */}
            <div className="bg-white dark:bg-zinc-950/80 p-4 rounded-xl border border-zinc-205 dark:border-zinc-850 flex items-center space-x-3 transition-colors duration-200">
              <Building className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div className="min-w-0 flex-1">
                <span className="block text-[9px] text-zinc-500 font-bold uppercase tracking-wider">WORKSPACE ACTIVO</span>
                <span className="block text-xs font-semibold text-zinc-800 dark:text-white truncate">{user.companyName}</span>
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
                    className={`w-full flex items-center space-x-4 px-4 py-4 rounded-xl text-base font-semibold transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-700/20'
                        : 'bg-zinc-200/50 dark:bg-zinc-800/40 text-zinc-650 dark:text-zinc-300 hover:bg-zinc-250 dark:hover:bg-zinc-800'
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
                  className={`w-full flex items-center space-x-4 px-4 py-4 rounded-xl text-base font-semibold transition-colors cursor-pointer ${
                    (!children && activeTab === 'admin')
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-700/20'
                      : 'bg-zinc-200/50 dark:bg-zinc-800/40 text-zinc-650 dark:text-zinc-300 hover:bg-zinc-250 dark:hover:bg-zinc-800'
                  }`}
                  style={{ minHeight: '48px' }}
                >
                  <ShieldCheck className="h-5 w-5 shrink-0" />
                  <span>Administración</span>
                </button>
              )}
            </nav>

            {/* Mobile Footer */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-700/20 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-800 dark:text-white">{user.fullName}</p>
                  <p className="text-[9px] text-zinc-500">{roles[0]?.name || 'Técnico'}</p>
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-zinc-200 hover:bg-rose-100 dark:bg-zinc-800 dark:hover:bg-rose-950/40 text-zinc-650 hover:text-rose-700 dark:text-zinc-400 dark:hover:text-rose-300 rounded-xl transition-colors border border-zinc-300 dark:border-zinc-700 hover:border-rose-400/20 dark:hover:border-rose-900/30 font-semibold cursor-pointer"
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
      <div className="flex-1 flex flex-col min-h-0 min-w-0 relative overflow-hidden">
        <header className="h-16 shrink-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-6 flex items-center justify-between z-20 transition-colors duration-200">
          {/* Header Mobile Brand & Burger */}
          <div className="flex items-center space-x-3 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-205 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              style={{ minHeight: '40px', minWidth: '40px' }}
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-bold text-zinc-800 dark:text-white text-sm tracking-wider">SOLAR HUB</span>
          </div>

          {/* PC Tenant Status */}
          <div className="hidden md:flex items-center space-x-3">
            <button
              onClick={() => {
                if (!sidebarVisible) {
                  setSidebarVisible(true);
                  setSidebarCollapsed(false);
                  setSidebarWidth(256);
                } else {
                  setSidebarVisible(false);
                }
              }}
              className="h-9 w-9 flex items-center justify-center rounded-xl bg-zinc-100 hover:bg-zinc-250 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-650 dark:text-zinc-300 focus:outline-none cursor-pointer border border-zinc-250 dark:border-zinc-750/50"
              title="Alternar Barra Lateral"
            >
              <Menu className="h-4 w-4" />
            </button>
            <span className="text-[11px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/50 font-medium">
              Multi-tenant Tenant: <strong className="text-zinc-800 dark:text-white font-bold">{user.companyName}</strong>
            </span>
          </div>

          {/* User roles & settings */}
          <div className="flex items-center space-x-4">

            <div className="flex items-center text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 px-3 py-1.5 rounded-xl transition-colors duration-200">
              <ShieldCheck className="h-4 w-4 mr-1 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Permisos:</span>
              <span className="font-bold text-zinc-800 dark:text-white ml-1">{roles[0]?.name || 'Técnico'}</span>
            </div>
          </div>
        </header>

        {/* Module Content */}
        <main className={`flex-1 min-h-0 z-10 ${
          activeTab === 'caleb' 
            ? 'p-0 overflow-hidden flex flex-col' 
            : 'p-4 pb-24 md:p-8 md:pb-8 overflow-y-auto'
        }`}>
          {children ? children : renderModule()}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800 flex justify-around items-center h-16 pb-safe">
        {[
          { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
          { id: 'tasks', label: 'Tareas', icon: ClipboardList },
          { id: 'inventory', label: 'Inventario', icon: Package },
          { id: 'documents', label: 'Docs', icon: FolderOpen }
        ].map((item) => {
          const Icon = item.icon;
          const isActive = !children && activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id as any)}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
      {/* Global Floating AI Agent Widget */}
      <CalebFloatingWidget />
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
