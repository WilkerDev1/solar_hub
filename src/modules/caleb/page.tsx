'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Bot, Shield, RefreshCw, Plus, Paperclip, FileText, Download, X } from 'lucide-react';
import { supabase } from '@/core/database/supabase';
import { uploadDocument } from '@/core/services/documents';

interface Message {
  role: 'user' | 'caleb';
  text: string;
  timestamp: Date;
  attachment?: { id: string; name: string } | null;
}

export default function CalebModule() {
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
          const files = extractStorageFiles(msg.text);
          const imageUrls = extractImageUrls(msg.text);
          return (
            <div key={idx} className={`flex space-x-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'caleb' && (
                <div className="h-8 w-8 rounded-lg bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                  C
                </div>
              )}
              <div className={`max-w-xl p-4 rounded-xl text-sm leading-relaxed border ${
                msg.role === 'user'
                  ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-850 text-zinc-800 dark:text-white'
                  : 'bg-zinc-50 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 text-emerald-300'
              }`}>
                <div className="whitespace-pre-wrap">{msg.text}</div>
                
                {/* Inline images parsed from absolute HTTP/HTTPS URLs */}
                {imageUrls.map((url, imgIdx) => (
                  <div key={imgIdx} className="mt-3 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-black/5 dark:bg-black/20 max-w-sm">
                    <img 
                      src={url} 
                      alt="Vista previa de imagen referenciada" 
                      className="w-full h-auto object-contain max-h-60 hover:scale-[1.02] transition-transform duration-200"
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
                    <div key={fIdx} className="mt-3 space-y-2">
                      {isImage && (
                        <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-black/5 dark:bg-black/20 max-w-sm">
                          <img 
                            src={file.url} 
                            alt={file.name} 
                            className="w-full h-auto object-contain max-h-60 hover:scale-[1.02] transition-transform duration-200"
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-205 dark:border-zinc-800 text-zinc-855 dark:text-zinc-200 shadow-sm">
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <FileText className="h-7 w-7 text-emerald-500 shrink-0" />
                          <div className="text-left overflow-hidden">
                            <div className="text-xs font-bold truncate">{file.name}</div>
                            <div className="text-[9px] text-zinc-500 truncate">ID: {file.id.substring(0, 8)}...</div>
                          </div>
                        </div>
                        <a
                          href={file.url}
                          download={file.name}
                          className="ml-4 shrink-0 flex items-center justify-center p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                          title="Descargar archivo"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}

                {/* User's uploaded file attachment pill */}
                {msg.role === 'user' && msg.attachment && (
                  <div className="mt-3 space-y-2">
                    {isImageFile(msg.attachment.name) && (
                      <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-850 bg-black/5 dark:bg-black/20 max-w-sm">
                        <img 
                          src={`/api/storage/file/${msg.attachment.id}?name=${encodeURIComponent(msg.attachment.name)}`}
                          alt={msg.attachment.name} 
                          className="w-full h-auto object-contain max-h-60 hover:scale-[1.02] transition-transform duration-200"
                        />
                      </div>
                    )}
                    <div 
                      className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-850 text-zinc-700 dark:text-zinc-300 shadow-sm"
                    >
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <FileText className="h-7 w-7 text-zinc-450 shrink-0" />
                        <div className="text-left overflow-hidden">
                          <div className="text-xs font-semibold truncate">{msg.attachment.name}</div>
                          <div className="text-[9px] text-zinc-500 truncate">ID: {msg.attachment.id.substring(0, 8)}...</div>
                        </div>
                      </div>
                      <a
                        href={`/api/storage/file/${msg.attachment.id}?name=${encodeURIComponent(msg.attachment.name)}`}
                        download={msg.attachment.name}
                        className="ml-4 shrink-0 flex items-center justify-center p-2 rounded-lg bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-255 transition-colors cursor-pointer"
                        title="Descargar archivo"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                )}

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

      {/* Attachment Preview Area */}
      {attachedFile && (
        <div className="px-6 py-2 bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-805 flex items-center justify-between text-xs text-zinc-650 dark:text-zinc-350">
          <div className="flex items-center space-x-2 truncate">
            <FileText className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="font-semibold truncate">{attachedFile.name}</span>
            <span className="text-[10px] text-zinc-500">(Adjunto)</span>
          </div>
          <button
            type="button"
            onClick={() => setAttachedFile(null)}
            className="p-1.5 rounded-lg hover:bg-zinc-250 dark:hover:bg-zinc-800 text-zinc-500 hover:text-red-500 transition-colors cursor-pointer"
            title="Quitar archivo adjunto"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {uploadingFile && (
        <div className="px-6 py-2 bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-805 flex items-center space-x-2 text-xs text-zinc-500">
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-500" />
          <span>Subiendo documento a Naski...</span>
        </div>
      )}

      {/* Input console */}
      <form onSubmit={handleSend} className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex gap-3 items-center">
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
          className="h-12 w-12 rounded-xl flex items-center justify-center border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-emerald-500 dark:hover:text-emerald-400 disabled:opacity-50 transition-all cursor-pointer"
          title="Adjuntar documento"
        >
          <Paperclip className="h-5 w-5" />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ingrese directiva operativa a Caleb (ej. registrar despacho de stock)..."
          className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-600 font-mono text-zinc-800 dark:text-white placeholder-zinc-600 h-12"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || uploadingFile || (!input.trim() && !attachedFile)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 px-5 rounded-xl flex items-center justify-center disabled:opacity-50 transition-colors cursor-pointer shrink-0 font-bold"
        >
          {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </form>
    </div>
  );
}
