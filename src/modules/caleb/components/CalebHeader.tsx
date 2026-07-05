'use client';

import React from 'react';
import { Menu, Plus, Bot } from 'lucide-react';

interface CalebHeaderProps {
  sidebarVisible: boolean;
  setSidebarVisible: (visible: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  handleNewSession: () => void;
}

export default function CalebHeader({
  sidebarVisible,
  setSidebarVisible,
  setMobileSidebarOpen,
  handleNewSession
}: CalebHeaderProps) {
  return (
    <div className="bg-white dark:bg-[#18181b] border-b border-zinc-200 dark:border-[#2c2d34]/60 px-4 md:px-6 py-3 hidden md:flex items-center justify-between shrink-0 h-14 rounded-none">
      <div className="flex items-center space-x-3">
        {/* Sidebar toggle button (desktop) */}
        <button
          onClick={() => setSidebarVisible(!sidebarVisible)}
          className="hidden md:flex h-9 w-9 items-center justify-center rounded-none bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-650 dark:text-zinc-300 transition-colors cursor-pointer border dark:border-zinc-700/50"
          title={sidebarVisible ? "Ocultar historial" : "Mostrar historial"}
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Mobile Hamburger menu */}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="md:hidden h-9 w-9 flex items-center justify-center rounded-none bg-zinc-100 dark:bg-zinc-800 text-zinc-650 hover:text-white transition-colors cursor-pointer"
          title="Ver historial de chats"
        >
          <Menu className="h-5 w-5" />
        </button>
        
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-emerald-500" />
          <span className="font-bold text-zinc-850 dark:text-white text-sm tracking-wide">Caleb AI</span>
        </div>
      </div>

      {/* Right side buttons */}
      <div className="flex items-center space-x-2">
        {/* Mobile New Chat (+) button - matches Claude look */}
        <button
          onClick={handleNewSession}
          className="md:hidden h-9 w-9 flex items-center justify-center rounded-none bg-zinc-100 dark:bg-zinc-800 text-zinc-650 hover:text-white hover:bg-emerald-600/10 transition-all active:scale-95 cursor-pointer"
          title="Nueva Conversación"
        >
          <Plus className="h-5 w-5" />
        </button>

        {/* Connection status (green dot) / Terminal info */}
        <span className="hidden sm:inline bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-none border border-zinc-200 dark:border-zinc-700 text-[10px] uppercase font-bold text-zinc-500">
          Terminal: /api/caleb
        </span>
        
        <div className="flex items-center space-x-1.5 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-none border border-zinc-200 dark:border-zinc-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Caleb</span>
        </div>
      </div>
    </div>
  );
}
