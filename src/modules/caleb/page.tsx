'use client';

import React from 'react';
import { 
  Paperclip, Send, X, RefreshCw, ChevronRight, Menu
} from 'lucide-react';
import { useCaleb } from './hooks/useCaleb';
import ChatSidebar from './components/ChatSidebar';
import MessageStream from './components/MessageStream';
import CalebHeader from './components/CalebHeader';

export default function CalebModule() {
  const c = useCaleb();

  return (
    <div className="flex h-full w-full bg-white dark:bg-[#111112] overflow-hidden font-sans pb-16 md:pb-0 rounded-none border-0 shadow-none" style={{ minHeight: 0 }}>
      {/* 1. SESSIONS SIDEBAR - LEFT PANEL */}
      <ChatSidebar
        sessions={c.sessions}
        activeSessionId={c.activeSessionId}
        setActiveSessionId={c.setActiveSessionId}
        handleNewSession={c.handleNewSession}
        handleDeleteSession={c.handleDeleteSession}
        mobileSidebarOpen={c.mobileSidebarOpen}
        setMobileSidebarOpen={c.setMobileSidebarOpen}
        sidebarWidth={c.sidebarWidth}
        sidebarVisible={c.sidebarVisible}
        startResizing={c.startResizing}
        sidebarRef={c.sidebarRef}
      />

      {/* MOBILE OVERLAY BACKGROUND */}
      {c.mobileSidebarOpen && (
        <div 
          onClick={() => c.setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* 2. MAIN CHAT DISPLAY - RIGHT PANEL */}
      <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#111112] relative overflow-hidden rounded-none">
        {/* Floating mobile menu trigger - top left */}
        <button
          onClick={() => c.setMobileSidebarOpen(true)}
          className="md:hidden absolute top-4 left-4 z-40 h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-white shadow-lg border border-zinc-700/50 backdrop-blur-xs transition-transform active:scale-95 cursor-pointer"
          title="Abrir historial"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Chat Module Header */}
        <CalebHeader
          sidebarVisible={c.sidebarVisible}
          setSidebarVisible={c.setSidebarVisible}
          setMobileSidebarOpen={c.setMobileSidebarOpen}
          handleNewSession={c.handleNewSession}
        />

        {/* Message Stream */}
        <MessageStream
          messages={c.messages}
          loading={c.loading}
          documentMap={{}}
          token={null}
          messagesEndRef={c.messagesEndRef}
        />

        {/* Prompts suggestions (only if no user messages exist in session) */}
        {c.messages.length === 0 && (
          <div className="w-full max-w-3xl mx-auto px-4 py-4 bg-transparent hidden md:grid md:grid-cols-2 gap-3 shrink-0">
            <button 
              onClick={() => c.executeQuickAction("Auditar inventario y alertar si hay stock crítico.")}
              className="text-xs font-semibold bg-white dark:bg-zinc-900 hover:bg-zinc-50/50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800/80 p-3.5 rounded-none text-left transition-all cursor-pointer flex items-center justify-between group shadow-xs"
            >
              <div>
                <div className="font-bold text-zinc-850 dark:text-zinc-250">🔍 Auditar Inventario General</div>
                <div className="text-[10px] text-zinc-500 mt-1">Busca niveles mínimos en stock de materiales</div>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-455 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button 
              onClick={() => c.executeQuickAction("Listar las tareas pendientes asignadas to obras.")}
              className="text-xs font-semibold bg-white dark:bg-zinc-900 hover:bg-zinc-50/50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800/80 p-3.5 rounded-none text-left transition-all cursor-pointer flex items-center justify-between group shadow-xs"
            >
              <div>
                <div className="font-bold text-zinc-850 dark:text-zinc-250">📋 Listar Tareas Activas</div>
                <div className="text-[10px] text-zinc-505 mt-1">Inspecciona tareas pendientes en el CRM de proyectos</div>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-455 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}

        {/* Attachment preview panel */}
        {c.attachedFile && (
          <div className="w-full max-w-3xl mx-auto px-4 py-2 bg-zinc-150/40 dark:bg-zinc-800/20 border border-zinc-200 dark:border-zinc-850 flex items-center justify-between text-xs text-zinc-650 dark:text-zinc-350 shrink-0 rounded-none mb-2">
            <div className="flex items-center space-x-2 truncate">
              <span className="font-semibold truncate">{c.attachedFile.name}</span>
              <span className="text-[10px] text-zinc-500">(Adjunto listo)</span>
            </div>
            <button
              type="button"
              onClick={() => c.setAttachedFile(null)}
              className="p-1.5 rounded-none hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-550 hover:text-red-500 transition-colors cursor-pointer"
              title="Quitar archivo adjunto"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        
        {c.uploadingFile && (
          <div className="w-full max-w-3xl mx-auto px-4 py-2 bg-zinc-150/40 dark:bg-zinc-800/20 border border-zinc-200 dark:border-zinc-850 flex items-center space-x-2 text-xs text-zinc-500 shrink-0 rounded-none mb-2">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-500" />
            <span>Subiendo documento a Naski...</span>
          </div>
        )}

        {/* Prompt Input Form */}
        <form onSubmit={c.handleSend} className="w-full max-w-3xl mx-auto p-4 shrink-0 pb-6 bg-transparent">
          <div className="relative bg-zinc-100 dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-none p-2.5 flex flex-col gap-2 shadow-md">
            <textarea
              value={c.input}
              onChange={(e) => c.setInput(e.target.value)}
              placeholder="Instrucción a Caleb (ej. ver detalles de planta solar)..."
              rows={1}
              className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-sm px-3 py-2 text-zinc-850 dark:text-zinc-100 resize-none font-sans placeholder-zinc-500 outline-none h-12"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  c.handleSend(e);
                }
              }}
            />
            <div className="flex items-center justify-between pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50 px-2">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={c.fileInputRef}
                  onChange={c.handleFileChange}
                  className="hidden"
                  accept=".txt,.csv,.json,.md,.pdf,.png,.jpg,.jpeg"
                />
                <button
                  type="button"
                  onClick={() => c.fileInputRef.current?.click()}
                  disabled={c.loading || c.uploadingFile}
                  className="h-9 w-9 rounded-none flex items-center justify-center border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-emerald-500 dark:hover:text-emerald-400 disabled:opacity-50 transition-all cursor-pointer shrink-0"
                  title="Adjuntar documento"
                >
                  <Paperclip className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono select-none">
                  Sonnet 3.5
                </span>
                <button
                  type="submit"
                  disabled={c.loading || c.uploadingFile || (!c.input.trim() && !c.attachedFile) || !c.activeSessionId}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white h-9 px-4 rounded-none flex items-center justify-center disabled:opacity-40 transition-colors cursor-pointer shrink-0 font-bold text-xs"
                >
                  {c.loading ? <RefreshCw className="h-4.5 w-4.5 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
