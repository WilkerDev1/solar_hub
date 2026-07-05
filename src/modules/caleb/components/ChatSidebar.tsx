'use client';

import React from 'react';
import { Plus, MessageSquare, Trash2, Shield } from 'lucide-react';
import { ChatSession } from '../hooks/useCaleb';

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string;
  setActiveSessionId: (id: string) => void;
  handleNewSession: () => void;
  handleDeleteSession: (id: string, e: React.MouseEvent) => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  sidebarWidth: number;
  sidebarVisible: boolean;
  startResizing: (e: React.MouseEvent) => void;
}

export default function ChatSidebar({
  sessions,
  activeSessionId,
  setActiveSessionId,
  handleNewSession,
  handleDeleteSession,
  mobileSidebarOpen,
  setMobileSidebarOpen,
  sidebarWidth,
  sidebarVisible,
  startResizing
}: ChatSidebarProps) {
  return (
    <aside 
      style={{
        width: typeof window !== 'undefined' && window.innerWidth >= 768 ? (sidebarVisible ? `${sidebarWidth}px` : '0px') : undefined,
        display: typeof window !== 'undefined' && window.innerWidth >= 768 && !sidebarVisible ? 'none' : undefined
      }}
      className={`
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 fixed md:static inset-y-0 left-0 w-80 
        bg-zinc-100 dark:bg-[#1e1e24] border-r border-zinc-200 dark:border-zinc-800/80 
        flex flex-col shrink-0 z-50 transition-transform duration-300 ease-in-out h-full rounded-none
      `}
    >
      {/* Resize Handle (Desktop Only) */}
      {sidebarVisible && (
        <div 
          onMouseDown={startResizing}
          className="hidden md:block absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-emerald-500/50 active:bg-emerald-500 transition-colors z-45"
        />
      )}
      {/* Sidebar Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-200/20 dark:bg-zinc-900/10 h-14 rounded-none">
        <span className="text-xs font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider">Historial de Chats</span>
        <button
          onClick={handleNewSession}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-none text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-sm active:scale-95"
          title="Nueva Conversación"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Nueva</span>
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800 rounded-none">
        {sessions.map((s) => {
          const isActive = s.id === activeSessionId;
          return (
            <div
              key={s.id}
              onClick={() => {
                setActiveSessionId(s.id);
                setMobileSidebarOpen(false);
              }}
              className={`group flex items-center justify-between p-3 rounded-none cursor-pointer transition-all border-l-4 ${
                isActive 
                  ? 'bg-zinc-200/50 dark:bg-zinc-800/30 text-emerald-600 dark:text-emerald-450 border-emerald-500 font-semibold' 
                  : 'bg-transparent text-zinc-550 dark:text-zinc-400 hover:bg-zinc-200/20 dark:hover:bg-zinc-800/20 border-transparent hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center space-x-2.5 overflow-hidden">
                <MessageSquare className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-500' : 'text-zinc-500'}`} />
                <span className="text-xs truncate">{s.title}</span>
              </div>
              <button
                onClick={(e) => handleDeleteSession(s.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-800 text-zinc-450 hover:text-rose-500 transition-all"
                title="Eliminar chat"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Connection status footer */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-205/10 dark:bg-zinc-900/10 flex items-center justify-between text-[10px] uppercase font-bold text-zinc-500 shrink-0 rounded-none">
        <div className="flex items-center space-x-2">
          <Shield className="h-3.5 w-3.5 text-emerald-500" />
          <span>Caleb Virtual Agent</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-500">Conectado</span>
        </div>
      </div>
    </aside>
  );
}
