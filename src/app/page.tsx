'use client';

import React, { useState } from 'react';
import { AuthProvider, useAuth } from '@/core/auth/AuthContext';
import DashboardModule from '@/modules/dashboard/page';
import ChatModule from '@/modules/chat/page';
import ProjectsModule from '@/modules/projects/page';
import InventoryModule from '@/modules/inventory/page';
import ClientsModule from '@/modules/clients/page';

import { 
  Sun, 
  LayoutDashboard, 
  MessageSquare, 
  FolderKanban, 
  Package, 
  UsersRound,
  ShieldCheck,
  Building,
  ChevronDown
} from 'lucide-react';

function DashboardShell() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'projects' | 'inventory' | 'clients'>('dashboard');
  const { user, roles, switchCompany } = useAuth();
  
  // Available workspaces (companies)
  const companies = [
    { id: 'comp-abc', name: 'Solaris Energy S.A.' },
    { id: 'comp-xyz', name: 'Apex Solar SpA' }
  ];

  const currentCompany = companies.find(c => c.id === user?.companyId) || companies[0];

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
      default:
        return <DashboardModule />;
    }
  };

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      {/* Sidebar Layout */}
      <aside className="w-64 bg-zinc-900 text-zinc-300 flex flex-col justify-between border-r border-zinc-800 hidden md:flex">
        <div>
          {/* Header Brand */}
          <div className="h-16 flex items-center px-6 gap-3 border-b border-zinc-800 bg-zinc-950">
            <Sun className="h-6 w-6 text-amber-500 animate-spin-slow" />
            <span className="font-bold text-white text-lg tracking-wider">SOLAR HUB</span>
          </div>

          {/* Tenant / Company Switcher */}
          <div className="p-4 border-b border-zinc-850">
            <div className="bg-zinc-800/60 p-3 rounded-lg flex items-center justify-between cursor-pointer hover:bg-zinc-800 transition-colors">
              <div className="flex items-center space-x-2">
                <Building className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold text-white truncate max-w-[130px]">{currentCompany.name}</span>
              </div>
              <ChevronDown className="h-3 w-3 text-zinc-400" />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
              {companies.map((comp) => (
                <button
                  key={comp.id}
                  onClick={() => switchCompany(comp.id)}
                  className={`py-1 rounded text-center font-medium transition-colors ${
                    user?.companyId === comp.id
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-850 text-zinc-400 hover:text-white'
                  }`}
                >
                  {comp.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'chat'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>Canales Chat</span>
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'projects'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <FolderKanban className="h-4 w-4" />
              <span>Proyectos (Core)</span>
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'inventory'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <Package className="h-4 w-4" />
              <span>Inventario</span>
            </button>

            <button
              onClick={() => setActiveTab('clients')}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'clients'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <UsersRound className="h-4 w-4" />
              <span>Clientes CRM</span>
            </button>
          </nav>
        </div>

        {/* User Card */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/40 flex items-center space-x-3">
          <div className="h-9 w-9 rounded-full bg-emerald-700 flex items-center justify-center text-white font-bold text-sm">
            {user?.fullName.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.fullName}</p>
            <p className="text-xs text-zinc-500 truncate">{roles[0]?.name || 'Técnico'}</p>
          </div>
        </div>
      </aside>

      {/* Main Application Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 flex items-center justify-between">
          {/* Header Mobile Title */}
          <div className="flex items-center space-x-3 md:hidden">
            <Sun className="h-5 w-5 text-amber-500" />
            <span className="font-bold text-zinc-900 dark:text-zinc-50">SOLAR HUB</span>
          </div>

          <div className="hidden md:block">
            <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-700 font-medium">
              Multi-tenant Workspace Activo: <strong className="text-zinc-900 dark:text-white font-bold">{currentCompany.name}</strong>
            </span>
          </div>

          {/* User roles & testing actions */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-xs text-zinc-500 dark:text-zinc-400">
              <ShieldCheck className="h-4 w-4 mr-1 text-emerald-500" />
              <span>RBAC Activo:</span>
              <span className="font-bold text-zinc-900 dark:text-white ml-1">{roles[0]?.name || 'Técnico'}</span>
            </div>
          </div>
        </header>

        {/* Module Content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {renderModule()}
        </main>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <DashboardShell />
    </AuthProvider>
  );
}
