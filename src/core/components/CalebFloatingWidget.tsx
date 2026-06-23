'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Terminal, RefreshCw, Plus, MessageSquare, Paperclip, FileText, Download } from 'lucide-react';
import { supabase } from '@/core/database/supabase';
import { uploadDocument } from '@/core/services/documents';

interface Message {
  role: 'user' | 'caleb';
  text: string;
  timestamp: Date;
  attachment?: { id: string; name: string } | null;
}

export default function CalebFloatingWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ id: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  interface FileLink {
    id: string;
    name: string;
    url: string;
  }

  const extractStorageFiles = (text: string): FileLink[] => {
    if (!text) return [];
    const regex = /\/api\/storage\/file\/([a-f0-9\-]+)(?:\?[^)]*name=([^&\s\)]+)|(?:\?[^)\s]*))?/gi;
    const files: FileLink[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      const id = match[1];
      let name = match[2] ? decodeURIComponent(match[2]) : 'archivo';
      name = name.replace(/['"()]/g, '');
      files.push({
        id,
        name,
        url: match[0]
      });
    }
    return files;
  };

  const extractImageUrls = (text: string): string[] => {
    if (!text) return [];
    const regex = /(https?:\/\/[^\s$.?#].[^\s]*\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s]*)?)/gi;
    const urls: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (!urls.includes(match[0])) {
        urls.push(match[0]);
      }
    }
    return urls;
  };

  const isImageFile = (name: string): boolean => {
    const ext = name.split('.').pop()?.toLowerCase();
    return !!ext && ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const doc = await uploadDocument(file, null, null, 'Caleb');
      setAttachedFile({ id: doc.id, name: doc.name });
    } catch (err: any) {
      alert(`Error al subir archivo: ${err.message}`);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
    if ((!input.trim() && !attachedFile) || loading || uploadingFile) return;

    const userMessage = input.trim();
    const sentAttachment = attachedFile;
    setInput('');
    setAttachedFile(null);
    setLoading(true);

    const newMessages = [...messages, { role: 'user', text: userMessage || `[Archivo enviado: ${sentAttachment?.name}]`, timestamp: new Date(), attachment: sentAttachment }] as Message[];
    saveMessages(newMessages);

    // Get current Supabase session JWT
    const { data: { session } } = await supabase.auth.getSession();
    const userJwt = session?.access_token || '';

    // Append a placeholder message for caleb response
    const placeholderMsg: Message[] = [...newMessages, { role: 'caleb', text: '', timestamp: new Date() }];
    saveMessages(placeholderMsg);

    const promptText = sentAttachment
      ? `[Archivo Adjunto: "${sentAttachment.name}" (ID: ${sentAttachment.id})] ${userMessage}`
      : userMessage;

    try {
      const response = await fetch('/api/caleb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          userJwt,
          history: messages.slice(-10).map(m => {
            const content = m.attachment 
              ? `[Archivo Adjunto: "${m.attachment.name}" (ID: ${m.attachment.id})] ${m.text}` 
              : m.text;
            return { role: m.role, content };
          })
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
        className={`fixed bottom-6 right-6 h-14 w-14 rounded-full flex items-center justify-center text-zinc-800 dark:text-white shadow-2xl border cursor-pointer transition-all duration-300 transform hover:scale-110 z-[60] ${
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
              const files = extractStorageFiles(msg.text);
              const imageUrls = extractImageUrls(msg.text);
              return (
                <div key={idx} className={`flex space-x-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'caleb' && (
                    <div className="h-6 w-6 rounded-md bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400 text-xs font-bold shrink-0">
                      C
                    </div>
                  )}
                  <div className={`max-w-[80%] p-3 rounded-lg text-xs leading-relaxed border ${
                    msg.role === 'user'
                      ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-850 text-zinc-800 dark:text-white'
                      : 'bg-zinc-50 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 text-emerald-300'
                  }`}>
                    <div className="whitespace-pre-wrap">{msg.text}</div>

                    {/* Inline images parsed from absolute HTTP/HTTPS URLs */}
                    {imageUrls.map((url, imgIdx) => (
                      <div key={imgIdx} className="mt-2.5 rounded-lg overflow-hidden border border-zinc-200/50 dark:border-zinc-800/50 bg-black/5 dark:bg-black/20 max-w-full">
                        <img 
                          src={url} 
                          alt="Vista previa" 
                          className="w-full h-auto object-contain max-h-40 hover:scale-[1.02] transition-transform duration-200"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ))}

                    {/* Visual file cards for documents parsed from message text */}
                    {files.map((file, fIdx) => {
                      const isImage = isImageFile(file.name);
                      return (
                        <div key={fIdx} className="mt-2.5 space-y-1.5">
                          {isImage && (
                            <div className="rounded-lg overflow-hidden border border-zinc-200/50 dark:border-zinc-800/50 bg-black/5 dark:bg-black/20 max-w-full">
                              <img 
                                src={file.url} 
                                alt={file.name} 
                                className="w-full h-auto object-contain max-h-40 hover:scale-[1.02] transition-transform duration-200"
                              />
                            </div>
                          )}
                          <div className="flex items-center justify-between p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-sm">
                            <div className="flex items-center space-x-2 overflow-hidden">
                              <FileText className="h-5 w-5 text-emerald-500 shrink-0" />
                              <div className="text-left overflow-hidden">
                                <div className="text-[10px] font-bold truncate">{file.name}</div>
                              </div>
                            </div>
                            <a
                              href={file.url}
                              download={file.name}
                              className="ml-3 shrink-0 flex items-center justify-center p-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                              title="Descargar archivo"
                            >
                              <Download className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      );
                    })}

                    {/* User's uploaded file attachment pill */}
                    {msg.role === 'user' && msg.attachment && (
                      <div className="mt-2.5 space-y-1.5">
                        {isImageFile(msg.attachment.name) && (
                          <div className="rounded-lg overflow-hidden border border-zinc-200/50 dark:border-zinc-850/50 bg-black/5 dark:bg-black/20 max-w-full">
                            <img 
                              src={`/api/storage/file/${msg.attachment.id}?name=${encodeURIComponent(msg.attachment.name)}`}
                              alt={msg.attachment.name} 
                              className="w-full h-auto object-contain max-h-40 hover:scale-[1.02] transition-transform duration-200"
                            />
                          </div>
                        )}
                        <div 
                          className="flex items-center justify-between p-2 rounded bg-zinc-50 dark:bg-zinc-955/40 border border-zinc-200 dark:border-zinc-850 text-zinc-700 dark:text-zinc-300 shadow-sm"
                        >
                          <div className="flex items-center space-x-2 overflow-hidden">
                            <FileText className="h-5 w-5 text-zinc-400 shrink-0" />
                            <div className="text-left overflow-hidden">
                              <div className="text-[10px] font-semibold truncate">{msg.attachment.name}</div>
                            </div>
                          </div>
                          <a
                            href={`/api/storage/file/${msg.attachment.id}?name=${encodeURIComponent(msg.attachment.name)}`}
                            download={msg.attachment.name}
                            className="ml-3 shrink-0 flex items-center justify-center p-1.5 rounded bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-255 transition-colors cursor-pointer"
                            title="Descargar archivo"
                          >
                            <Download className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    )}

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

          {/* Attachment Preview Area */}
          {attachedFile && (
            <div className="px-4 py-1.5 bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200/80 dark:border-zinc-808 flex items-center justify-between text-[10px] text-zinc-650 dark:text-zinc-350 shrink-0">
              <div className="flex items-center space-x-1.5 truncate">
                <FileText className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="font-semibold truncate">{attachedFile.name}</span>
                <span className="text-[9px] text-zinc-500">(Adjunto)</span>
              </div>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-red-500 transition-colors cursor-pointer"
                title="Quitar archivo adjunto"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          {uploadingFile && (
            <div className="px-4 py-1.5 bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200/80 dark:border-zinc-808 flex items-center space-x-1.5 text-[10px] text-zinc-500 shrink-0">
              <RefreshCw className="h-3 w-3 animate-spin text-emerald-500" />
              <span>Subiendo a Naski...</span>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200/80 dark:border-zinc-800/80 flex gap-2 shrink-0 items-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".txt,.csv,.json,.md,.pdf,.png,.jpg,.jpeg"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || uploadingFile}
              className="h-9 w-9 rounded-lg flex items-center justify-center border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-emerald-500 dark:hover:text-emerald-400 disabled:opacity-50 transition-all cursor-pointer shrink-0"
              title="Adjuntar documento"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Instrucción a Caleb..."
              className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 font-mono text-zinc-800 dark:text-white placeholder-zinc-700 h-9"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || uploadingFile || (!input.trim() && !attachedFile)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-3 rounded-lg flex items-center justify-center disabled:opacity-50 transition-colors cursor-pointer shrink-0 font-bold"
            >
              {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
