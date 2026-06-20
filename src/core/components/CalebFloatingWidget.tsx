'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Terminal, RefreshCw, Plus, MessageSquare } from 'lucide-react';
import { supabase } from '@/core/database/supabase';

interface Message {
  role: 'user' | 'caleb';
  text: string;
  timestamp: Date;
}

export default function CalebFloatingWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Sync scroll
  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, isOpen]);

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

    // Listen for real-time history updates from other instances
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
          // We also update localStorage inside the loop so it updates reactively if they navigate away
          localStorage.setItem('caleb_conversation_history', JSON.stringify(updated));
          return updated;
        });
      }
      
      // Dispatch final update to sync other tabs/modules
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
    <>
      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 h-14 w-14 rounded-full flex items-center justify-center text-zinc-800 dark:text-white shadow-2xl border cursor-pointer transition-all duration-300 transform hover:scale-110 z-50${
          isOpen
            ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
            : 'bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 border-emerald-400/20 shadow-emerald-500/10'
        }`}
        title={isOpen ? 'Cerrar Chat con Caleb' : 'Hablar con Caleb (Asistente IA)'}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <div className="relative">
            <Bot className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-zinc-950 flex items-center justify-center">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-ping" />
            </span>
          </div>
        )}
      </button>

      {/* Floating Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[520px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-8rem)] z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-mono text-zinc-700 dark:text-zinc-300 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200/80 dark:border-zinc-800/80 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2.5">
              <Terminal className="h-4 w-4 text-emerald-400 animate-pulse" />
              <span className="font-bold text-zinc-800 dark:text-white text-xs tracking-wider uppercase">Caleb (Asistente IA)</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleNewConversation}
                className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-white border border-zinc-700/50 transition-colors cursor-pointer"
                title="Nueva Conversación (Limpiar)"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-white border border-zinc-700/50 transition-colors cursor-pointer"
                title="Cerrar Panel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50 dark:bg-zinc-950/60 scrollbar-thin scrollbar-thumb-zinc-800">
            {messages.map((msg, idx) => {
              const isLatestEmptyCaleb = msg.role === 'caleb' && msg.text === '' && idx === messages.length - 1;
              if (isLatestEmptyCaleb && loading) {
                return (
                  <div key={idx} className="flex space-x-2 justify-start">
                    <div className="h-6 w-6 rounded-md bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400 text-xs font-bold shrink-0">
                      C
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 text-emerald-350 p-2.5 rounded-lg text-xs flex items-center space-x-1">
                      <span className="h-1 w-1 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.8s' }} />
                      <span className="h-1 w-1 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.8s' }} />
                      <span className="h-1 w-1 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.8s' }} />
                    </div>
                  </div>
                );
              }
              return (
                <div key={idx} className={`flex space-x-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'caleb' && (
                    <div className="h-6 w-6 rounded-md bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400 text-xs font-bold shrink-0">
                      C
                    </div>
                  )}
                  <div className={`max-w-[80%] p-3 rounded-lg text-xs leading-relaxed border${
                    msg.role === 'user'
                      ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-850 text-zinc-800 dark:text-white'
                      : 'bg-zinc-50 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 text-emerald-300'
                  }`}>
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                    <div className="text-[8px] text-zinc-500 mt-1.5 text-right">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="px-4 py-2 bg-zinc-50/50 dark:bg-zinc-900/40 border-t border-zinc-900/60 flex flex-wrap gap-1.5 shrink-0">
            <button
              onClick={() => executeQuickAction("Auditar inventario")}
              className="text-[10px] bg-white dark:bg-zinc-900 hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-700 px-2 py-1 rounded transition-all cursor-pointer text-zinc-500 dark:text-zinc-400 hover:text-zinc-200"
            >
              🔍 Auditar
            </button>
            <button
              onClick={() => executeQuickAction("Listar tareas")}
              className="text-[10px] bg-white dark:bg-zinc-900 hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-700 px-2 py-1 rounded transition-all cursor-pointer text-zinc-500 dark:text-zinc-400 hover:text-zinc-200"
            >
              📋 Tareas
            </button>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200/80 dark:border-zinc-800/80 flex gap-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Instrucción a Caleb..."
              className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 font-mono text-zinc-800 dark:text-white placeholder-zinc-700"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 rounded-lg flex items-center justify-center disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
