'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot, X, Send, RefreshCw, Plus, Paperclip, FileText, Terminal
} from 'lucide-react';
import { supabase } from '@/core/database/supabase';
import { uploadDocument } from '@/core/services/documents';
import { getApiUrl } from '@/core/utils/api';

// ─── Types (same shape as caleb/page.tsx) ─────────────────────────────────────
interface Message {
  role: 'user' | 'caleb';
  text: string;
  timestamp: string;
  attachment?: { id: string; name: string } | null;
}
interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
}

const STORAGE_KEY = 'caleb_chat_sessions';
const SYNC_EVENT  = 'caleb_sessions_updated';
const DEFAULT_GREETING =
  'A la orden. Estoy inicializado y listo para ejecutar consultas de proyectos, auditorías de stock, transacciones del inventario y asignación de tareas operativas. Ordene.';

// ─── Inline markdown ──────────────────────────────────────────────────────────
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/g;
  let last = 0, match: RegExpExecArray | null, idx = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(<span key={idx++}>{text.slice(last, match.index)}</span>);
    if (match[1] !== undefined) parts.push(<strong key={idx++} className="font-bold text-white">{match[1]}</strong>);
    else if (match[2] !== undefined) parts.push(<em key={idx++} className="italic text-zinc-300">{match[2]}</em>);
    else if (match[3] !== undefined) parts.push(<code key={idx++} className="bg-zinc-700 text-emerald-400 px-1 py-0.5 rounded text-[10px] font-mono">{match[3]}</code>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(<span key={idx++}>{text.slice(last)}</span>);
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const output: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { output.push(<div key={i} className="h-1.5" />); i++; continue; }
    if (line.startsWith('### ')) { output.push(<h3 key={i} className="text-xs font-bold text-white mt-2 mb-0.5">{renderInline(line.slice(4))}</h3>); i++; continue; }
    if (line.startsWith('## '))  { output.push(<h2 key={i} className="text-xs font-bold text-white mt-2.5 mb-1">{renderInline(line.slice(3))}</h2>); i++; continue; }
    if (line.startsWith('# '))   { output.push(<h1 key={i} className="text-sm font-bold text-white mt-3 mb-1">{renderInline(line.slice(2))}</h1>); i++; continue; }
    const om = line.match(/^(\d+)\. (.*)/);
    if (om) {
      const items: React.ReactNode[] = [];
      while (i < lines.length) { const m = lines[i].match(/^(\d+)\. (.*)/); if (!m) break; items.push(<li key={i} className="ml-4 list-decimal">{renderInline(m[2])}</li>); i++; }
      output.push(<ol key={`ol-${i}`} className="space-y-0.5 my-1 text-zinc-200 text-xs">{items}</ol>);
      continue;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) { items.push(<li key={i} className="ml-4 list-disc">{renderInline(lines[i].slice(2))}</li>); i++; }
      output.push(<ul key={`ul-${i}`} className="space-y-0.5 my-1 text-zinc-200 text-xs">{items}</ul>);
      continue;
    }
    if (/^---+$/.test(line.trim())) { output.push(<hr key={i} className="border-zinc-600 my-2" />); i++; continue; }
    output.push(<p key={i} className="leading-relaxed text-zinc-200 text-xs">{renderInline(line)}</p>);
    i++;
  }
  return <>{output}</>;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function CalebFloatingWidget() {
  const [isOpen, setIsOpen]                   = useState(false);
  const [sessions, setSessions]               = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [input, setInput]                     = useState('');
  const [loading, setLoading]                 = useState(false);
  const [uploadingFile, setUploadingFile]     = useState(false);
  const [attachedFile, setAttachedFile]       = useState<{ id: string; name: string } | null>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ right: 24, bottom: 24 });
  const isDragging   = useRef(false);
  const dragStart    = useRef({ x: 0, y: 0, right: 0, bottom: 0 });

  // ─── Drag ─────────────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const dx = e.clientX - dragStart.current.x, dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isDragging.current = true;
    if (isDragging.current) setPosition({ right: Math.max(10, Math.min(dragStart.current.right - dx, window.innerWidth - 80)), bottom: Math.max(10, Math.min(dragStart.current.bottom - dy, window.innerHeight - 80)) });
  }, []);
  const handleMouseUp = useCallback(() => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); }, [handleMouseMove]);
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDragging.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY, right: position.right, bottom: position.bottom };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  const handleTouchMove = useCallback((e: TouchEvent) => {
    const t = e.touches[0], dx = t.clientX - dragStart.current.x, dy = t.clientY - dragStart.current.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isDragging.current = true;
    if (isDragging.current) { e.preventDefault(); setPosition({ right: Math.max(10, Math.min(dragStart.current.right - dx, window.innerWidth - 80)), bottom: Math.max(10, Math.min(dragStart.current.bottom - dy, window.innerHeight - 80)) }); }
  }, []);
  const handleTouchEnd = useCallback(() => { document.removeEventListener('touchmove', handleTouchMove); document.removeEventListener('touchend', handleTouchEnd); }, [handleTouchMove]);
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]; isDragging.current = false;
    dragStart.current = { x: t.clientX, y: t.clientY, right: position.right, bottom: position.bottom };
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };
  const handleButtonClick = (e: React.MouseEvent) => { if (isDragging.current) { e.preventDefault(); e.stopPropagation(); return; } setIsOpen(o => !o); };
  useEffect(() => () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); document.removeEventListener('touchmove', handleTouchMove); document.removeEventListener('touchend', handleTouchEnd); }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // ─── Session sync ─────────────────────────────────────────────────────────
  const loadSessions = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ChatSession[];
        if (parsed.length > 0) {
          setSessions(parsed);
          setActiveSessionId(prev => parsed.find(s => s.id === prev) ? prev : parsed[0].id);
          return;
        }
      } catch (_) {}
    }
    const def: ChatSession = { id: 'default-session-id', title: 'Nueva Conversación', createdAt: new Date().toISOString(), messages: [{ role: 'caleb', text: DEFAULT_GREETING, timestamp: new Date().toISOString() }] };
    setSessions([def]); setActiveSessionId(def.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([def]));
  }, []);

  useEffect(() => {
    loadSessions();
    window.addEventListener(SYNC_EVENT, loadSessions);
    window.addEventListener('caleb_history_updated', loadSessions);
    return () => { window.removeEventListener(SYNC_EVENT, loadSessions); window.removeEventListener('caleb_history_updated', loadSessions); };
  }, [loadSessions]);

  useEffect(() => { if (isOpen) setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80); }, [sessions, isOpen, activeSessionId]);

  const saveSessions = (updated: ChatSession[]) => { setSessions(updated); localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); window.dispatchEvent(new Event(SYNC_EVENT)); };
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages ?? [];

  const updateActiveMessages = (msgs: Message[]) => {
    saveSessions(sessions.map(s => s.id === activeSessionId ? { ...s, messages: msgs, title: msgs.find(m => m.role === 'user')?.text?.slice(0, 30) || s.title } : s));
  };

  const handleNewConversation = () => {
    const newId = `session-${Date.now()}`;
    const ns: ChatSession = { id: newId, title: 'Nueva Conversación', createdAt: new Date().toISOString(), messages: [{ role: 'caleb', text: DEFAULT_GREETING, timestamp: new Date().toISOString() }] };
    saveSessions([ns, ...sessions]); setActiveSessionId(newId);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingFile(true);
    try { const doc = await uploadDocument(file, null, null, 'Caleb'); setAttachedFile({ id: doc.id, name: doc.name }); }
    catch (err: any) { alert(`Error al subir: ${err.message}`); }
    finally { setUploadingFile(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !attachedFile) || loading || uploadingFile) return;
    const userText = input.trim(), sentFile = attachedFile;
    setInput(''); setAttachedFile(null); setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const userJwt = session?.access_token || '';
    const promptText = sentFile ? `[Archivo Adjunto: "${sentFile.name}" (ID: ${sentFile.id})] ${userText}` : userText;
    const newMsgs: Message[] = [...messages,
      { role: 'user', text: userText || `[Archivo: ${sentFile?.name}]`, timestamp: new Date().toISOString(), attachment: sentFile },
      { role: 'caleb', text: '', timestamp: new Date().toISOString() }
    ];
    updateActiveMessages(newMsgs);
    try {
      const resp = await fetch(getApiUrl('/api/caleb'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: promptText, userJwt, history: messages.slice(-10).map(m => ({ role: m.role, content: m.attachment ? `[Archivo: "${m.attachment.name}" ID: ${m.attachment.id}] ${m.text}` : m.text })) }) });
      if (!resp.ok) throw new Error('Error al conectar con Caleb.');
      const reader = resp.body?.getReader(), decoder = new TextDecoder();
      let done = false, calebText = '';
      while (!done && reader) {
        const { value, done: dr } = await reader.read(); done = dr;
        calebText += decoder.decode(value, { stream: !done });
        setSessions(prev => { const u = prev.map(s => { if (s.id !== activeSessionId) return s; const msgs = [...s.messages]; if (msgs.length > 0) msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], text: calebText }; return { ...s, messages: msgs }; }); localStorage.setItem(STORAGE_KEY, JSON.stringify(u)); return u; });
      }
      window.dispatchEvent(new Event(SYNC_EVENT));
    } catch (err: any) {
      setSessions(prev => { const u = prev.map(s => { if (s.id !== activeSessionId) return s; const msgs = [...s.messages]; if (msgs.length > 0) msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], text: `[ERROR] ${err.message}` }; return { ...s, messages: msgs }; }); localStorage.setItem(STORAGE_KEY, JSON.stringify(u)); window.dispatchEvent(new Event(SYNC_EVENT)); return u; });
    } finally { setLoading(false); }
  };

  return (
    <>
      {/* FAB */}
      <button
        onMouseDown={handleMouseDown} onTouchStart={handleTouchStart} onClick={handleButtonClick}
        style={{ right: `${position.right}px`, bottom: `${position.bottom}px` }}
        className={`fixed h-14 w-14 rounded-full flex items-center justify-center shadow-2xl border cursor-grab active:cursor-grabbing transition-all duration-300 hover:scale-110 z-[60] ${isOpen ? 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700' : 'bg-gradient-to-tr from-emerald-600 to-teal-500 border-emerald-400/30 text-white shadow-emerald-500/20 hover:from-emerald-500 hover:to-teal-400'}`}
        title={isOpen ? 'Cerrar Caleb' : 'Abrir Caleb AI – Arrástrame para mover'}
      >
        {isOpen ? <X className="h-6 w-6" /> : (
          <div className="relative pointer-events-none">
            <Bot className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-zinc-950 flex items-center justify-center">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
            </span>
          </div>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          style={{ right: `${position.right}px`, bottom: `${position.bottom + 68}px` }}
          className="fixed w-96 h-[560px] max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-8rem)] z-50 flex flex-col overflow-hidden rounded-2xl shadow-2xl border border-zinc-700/60 bg-[#1c1c21] animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-zinc-700/60 shrink-0 bg-zinc-800/70 rounded-t-2xl">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-emerald-950 border border-emerald-800/60 flex items-center justify-center">
                <Terminal className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <div>
                <span className="text-xs font-bold text-white tracking-wider uppercase block">Caleb AI</span>
                <span className="text-[9px] text-zinc-400 block font-mono">
                  {activeSession?.title?.slice(0, 26) || 'Sesión activa'} · <span className="text-emerald-400">● activo</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={handleNewConversation} className="h-7 w-7 flex items-center justify-center rounded-lg bg-zinc-700/70 hover:bg-zinc-600 text-zinc-400 hover:text-white border border-zinc-600/50 transition-all cursor-pointer" title="Nueva sesión"><Plus className="h-3.5 w-3.5" /></button>
              <button onClick={() => setIsOpen(false)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-zinc-700/70 hover:bg-rose-900/70 text-zinc-400 hover:text-rose-300 border border-zinc-600/50 transition-all cursor-pointer" title="Cerrar"><X className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-zinc-700 bg-[#1c1c21]">
            {messages.map((msg, idx) => {
              const isThinking = msg.role === 'caleb' && msg.text === '' && idx === messages.length - 1 && loading;
              if (isThinking) return (
                <div key={idx} className="flex items-start gap-2">
                  <div className="h-6 w-6 rounded-md bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400 text-[10px] font-bold shrink-0">C</div>
                  <div className="bg-zinc-800 border border-zinc-700/50 rounded-xl rounded-tl-sm px-3 py-2 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.8s' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.8s' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.8s' }} />
                    <span className="text-[10px] text-zinc-500 font-mono ml-1 animate-pulse">procesando...</span>
                  </div>
                </div>
              );
              if (msg.role === 'user') return (
                <div key={idx} className="flex justify-end">
                  <div className="max-w-[82%] bg-emerald-700/90 border border-emerald-600/30 text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-xs leading-relaxed shadow-sm">
                    <p>{msg.text}</p>
                    {msg.attachment && (
                      <div className="mt-2 flex items-center gap-1.5 bg-emerald-800/50 border border-emerald-600/30 rounded-lg px-2 py-1.5">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
                        <span className="text-[10px] text-emerald-100 truncate">{msg.attachment.name}</span>
                      </div>
                    )}
                    <div className="text-[9px] text-emerald-200/50 mt-1 text-right font-mono">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              );
              return (
                <div key={idx} className="flex items-start gap-2">
                  <div className="h-6 w-6 rounded-md bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400 text-[10px] font-bold shrink-0 mt-0.5">C</div>
                  <div className="max-w-[84%] bg-zinc-800/80 border border-zinc-700/50 rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-sm">
                    {msg.text ? <div className="text-zinc-200 leading-relaxed">{renderMarkdown(msg.text)}</div> : <div className="text-zinc-600 text-xs italic">Vacío</div>}
                    <div className="text-[9px] text-zinc-600 mt-1.5 text-right font-mono">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick actions */}
          <div className="px-3 py-2 border-t border-zinc-700/40 flex gap-1.5 flex-wrap shrink-0 bg-zinc-800/50">
            {[{ label: '🔍 Auditar', cmd: 'Auditar inventario y alertar si hay stock crítico.' }, { label: '📋 Tareas', cmd: 'Listar las tareas pendientes asignadas a obras.' }].map(({ label, cmd }) => (
              <button key={label} onClick={() => setInput(cmd)} className="text-[10px] bg-zinc-700/60 hover:bg-zinc-600/80 border border-zinc-600/50 px-2.5 py-1 rounded-lg transition-all cursor-pointer text-zinc-300 hover:text-white font-medium">{label}</button>
            ))}
          </div>

          {/* Attachment strip */}
          {attachedFile && (
            <div className="px-4 py-2 bg-zinc-800/60 border-t border-zinc-700/40 flex items-center justify-between text-[10px] text-zinc-300 shrink-0">
              <div className="flex items-center gap-1.5 truncate"><FileText className="h-3.5 w-3.5 text-emerald-400 shrink-0" /><span className="truncate">{attachedFile.name}</span></div>
              <button onClick={() => setAttachedFile(null)} className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"><X className="h-3 w-3" /></button>
            </div>
          )}
          {uploadingFile && (
            <div className="px-4 py-2 bg-zinc-800/60 border-t border-zinc-700/40 flex items-center gap-1.5 text-[10px] text-zinc-400 shrink-0">
              <RefreshCw className="h-3 w-3 animate-spin text-emerald-400" /><span>Subiendo a Naski...</span>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 bg-zinc-800/60 border-t border-zinc-700/40 flex gap-2 shrink-0 items-center rounded-b-2xl">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".txt,.csv,.json,.md,.pdf,.png,.jpg,.jpeg" />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={loading || uploadingFile} className="h-9 w-9 rounded-lg flex items-center justify-center border border-zinc-600/60 bg-zinc-700/60 text-zinc-400 hover:bg-zinc-600/80 hover:text-emerald-400 disabled:opacity-40 transition-all cursor-pointer shrink-0" title="Adjuntar archivo"><Paperclip className="h-4 w-4" /></button>
            <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Instrucción a Caleb..." className="flex-1 bg-zinc-900/80 border border-zinc-600/50 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500/60 text-white placeholder-zinc-600 h-9 font-sans" disabled={loading} />
            <button type="submit" disabled={loading || uploadingFile || (!input.trim() && !attachedFile)} className="bg-emerald-600 hover:bg-emerald-500 text-white h-9 px-3.5 rounded-lg flex items-center justify-center disabled:opacity-40 transition-colors cursor-pointer shrink-0">
              {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
