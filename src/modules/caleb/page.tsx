'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Bot, Shield, RefreshCw, Plus } from 'lucide-react';
import { supabase } from '@/core/database/supabase';

interface Message {
  role: 'user' | 'caleb';
  text: string;
  timestamp: Date;
}

export default function CalebModule() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load initial messages on mount
  useEffect(() => {
    const loadHistory = () => {
      const saved = localStorage.getItem('caleb_conversation_history');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const formatted = parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }));
          setMessages(formatted);
        } catch (e) {
          setDefaultMessage();
        }
      } else {
        setDefaultMessage();
      }
    };

    loadHistory();

    // Listen for updates from other modules/widgets
    window.addEventListener('caleb_history_updated', loadHistory);
    return () => window.removeEventListener('caleb_history_updated', loadHistory);
  }, []);

  const setDefaultMessage = () => {
    setMessages([
      {
        role: 'caleb',
        text: 'A la orden. Estoy inicializado y listo para ejecutar consultas de proyectos, auditorías de stock, transacciones del inventario y asignación de tareas operativas. Ordene.',
        timestamp: new Date()
      }
    ]);
  };

  const saveMessages = (newMsgs: Message[]) => {
    setMessages(newMsgs);
    localStorage.setItem('caleb_conversation_history', JSON.stringify(newMsgs));
    window.dispatchEvent(new Event('caleb_history_updated'));
  };

  const handleNewConversation = () => {
    const defaultMsg: Message[] = [
      {
        role: 'caleb',
        text: 'A la orden. Estoy inicializado y listo para ejecutar consultas de proyectos, auditorías de stock, transacciones del inventario y asignación de tareas operativas. Ordene.',
        timestamp: new Date()
      }
    ];
    saveMessages(defaultMsg);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    const newMessages = [...messages, { role: 'user', text: userMessage, timestamp: new Date() }] as Message[];
    saveMessages(newMessages);

    // Get current Supabase session JWT
    const { data: { session } } = await supabase.auth.getSession();
    const userJwt = session?.access_token || '';

    // Append a placeholder message for caleb response
    const placeholderMsg: Message[] = [...newMessages, { role: 'caleb', text: '', timestamp: new Date() }];
    saveMessages(placeholderMsg);

    try {
      const response = await fetch('/api/caleb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMessage,
          userJwt,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.text }))
        })
      });

      if (!response.ok) {
        throw new Error('Error al conectar con la terminal de Caleb.');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let calebText = '';

      while (!done && reader) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunk = decoder.decode(value, { stream: !done });
        calebText += chunk;

        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1].text = calebText;
          }
          localStorage.setItem('caleb_conversation_history', JSON.stringify(updated));
          return updated;
        });
      }

      // Sync final result
      window.dispatchEvent(new Event('caleb_history_updated'));

    } catch (err: any) {
      setMessages(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1].text = `[ERROR DE CONEXIÓN] Caleb no pudo reportarse: ${err.message}`;
        }
        localStorage.setItem('caleb_conversation_history', JSON.stringify(updated));
        return updated;
      });
      window.dispatchEvent(new Event('caleb_history_updated'));
    } finally {
      setLoading(false);
    }
  };

  const executeQuickAction = (cmd: string) => {
    setInput(cmd);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden font-mono text-zinc-700 dark:text-zinc-300">
      {/* Console Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Terminal className="h-5 w-5 text-emerald-400 animate-pulse" />
          <span className="font-bold text-zinc-800 dark:text-white text-sm tracking-wider uppercase">Terminal Operativa: Agente Caleb</span>
        </div>
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={handleNewConversation}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-white border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer"
            title="Nueva Conversación (Limpiar Caché)"
          >
            <Plus className="h-3.5 w-3.5 text-emerald-400" />
            <span>Nueva Conversación</span>
          </button>
          <div className="flex items-center space-x-2 text-[10px] uppercase font-bold text-zinc-500">
            <Shield className="h-3.5 w-3.5 text-emerald-500" />
            <span>RLS Active Company</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping ml-1" />
          </div>
        </div>
      </div>

      {/* Messages timeline */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-50 dark:bg-zinc-950/60 scrollbar-thin scrollbar-thumb-zinc-800">
        {messages.map((msg, idx) => {
          const isLatestEmptyCaleb = msg.role === 'caleb' && msg.text === '' && idx === messages.length - 1;
          if (isLatestEmptyCaleb && loading) {
            return (
              <div key={idx} className="flex space-x-3 justify-start">
                <div className="h-8 w-8 rounded-lg bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                  C
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 text-emerald-350 p-4 rounded-xl text-sm max-w-xl flex items-center space-x-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.8s' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.8s' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.8s' }} />
                </div>
              </div>
            );
          }
          return (
            <div key={idx} className={`flex space-x-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'caleb' && (
                <div className="h-8 w-8 rounded-lg bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                  C
                </div>
              )}
              <div className={`max-w-xl p-4 rounded-xl text-sm leading-relaxed border${
                msg.role === 'user'
                  ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-850 text-zinc-800 dark:text-white'
                  : 'bg-zinc-50 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 text-emerald-300'
              }`}>
                <div className="whitespace-pre-wrap">{msg.text}</div>
                <div className="text-[9px] text-zinc-500 mt-2 text-right">
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Badges */}
      <div className="px-6 py-3 bg-zinc-50/50 dark:bg-zinc-900/40 border-t border-zinc-200 dark:border-zinc-900 flex flex-wrap gap-2">
        <button 
          onClick={() => executeQuickAction("Auditar inventario y alertar si hay stock crítico.")}
          className="text-xs bg-white dark:bg-zinc-900 hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
        >
          🔍 Auditar Inventario
        </button>
        <button 
          onClick={() => executeQuickAction("Listar las tareas pendientes asignadas a obras.")}
          className="text-xs bg-white dark:bg-zinc-900 hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
        >
          📋 Listar Tareas Activas
        </button>
      </div>

      {/* Input console */}
      <form onSubmit={handleSend} className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ingrese directiva operativa a Caleb (ej. registrar despacho de stock)..."
          className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-600 font-mono text-zinc-800 dark:text-white placeholder-zinc-600"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 rounded-xl flex items-center justify-center disabled:opacity-50 transition-colors cursor-pointer"
        >
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
