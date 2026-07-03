'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal, Send, Bot, Shield, RefreshCw, Plus, Paperclip, 
  FileText, Download, X, MessageSquare, Trash2, Brain, ChevronRight, Menu
} from 'lucide-react';
import { supabase } from '@/core/database/supabase';
import { uploadDocument } from '@/core/services/documents';
import { getApiUrl } from '@/core/utils/api';

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

export default function CalebModule() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ id: string; name: string } | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  // Sidebar resizing and visibility states
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const isResizing = useRef(false);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.addEventListener('mousemove', handleSidebarMouseMove);
    document.addEventListener('mouseup', handleSidebarMouseUp);
  };

  const handleSidebarMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = Math.max(200, Math.min(e.clientX - 10, 480)); // 200px min, 480px max
    setSidebarWidth(newWidth);
  };

  const handleSidebarMouseUp = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleSidebarMouseMove);
    document.removeEventListener('mouseup', handleSidebarMouseUp);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleSidebarMouseMove);
      document.removeEventListener('mouseup', handleSidebarMouseUp);
    };
  }, []);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load sessions from localStorage on mount + listen for sync events from the floating widget
  useEffect(() => {
    const loadFromStorage = () => {
      const saved = localStorage.getItem('caleb_chat_sessions');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as ChatSession[];
          if (parsed.length > 0) {
            setSessions(parsed);
            setActiveSessionId(prev => parsed.find(s => s.id === prev) ? prev : parsed[0].id);
          } else {
            initializeDefaultSession();
          }
        } catch (e) {
          initializeDefaultSession();
        }
      } else {
        initializeDefaultSession();
      }
    };

    loadFromStorage();
    window.addEventListener('caleb_sessions_updated', loadFromStorage);
    return () => window.removeEventListener('caleb_sessions_updated', loadFromStorage);
  }, []);

  const initializeDefaultSession = () => {
    const defaultSession: ChatSession = {
      id: 'default-session-id',
      title: 'Nueva Conversación',
      createdAt: new Date().toISOString(),
      messages: [
        {
          role: 'caleb',
          text: 'A la orden. Estoy inicializado y listo para ejecutar consultas de proyectos, auditorías de stock, transacciones del inventario y asignación de tareas operativas. Ordene.',
          timestamp: new Date().toISOString()
        }
      ]
    };
    setSessions([defaultSession]);
    setActiveSessionId(defaultSession.id);
    localStorage.setItem('caleb_chat_sessions', JSON.stringify([defaultSession]));
  };

  const getActiveSession = (): ChatSession | undefined => {
    return sessions.find(s => s.id === activeSessionId);
  };

  const activeSession = getActiveSession();
  const messages = activeSession ? activeSession.messages : [];

  const saveSessions = (updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions);
    localStorage.setItem('caleb_chat_sessions', JSON.stringify(updatedSessions));
  };

  const handleNewSession = () => {
    const newSessionId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newSessionId,
      title: 'Nueva Conversación',
      createdAt: new Date().toISOString(),
      messages: [
        {
          role: 'caleb',
          text: 'A la orden. Estoy inicializado y listo para ejecutar consultas de proyectos, auditorías de stock, transacciones del inventario y asignación de tareas operativas. Ordene.',
          timestamp: new Date().toISOString()
        }
      ]
    };
    const updated = [newSession, ...sessions];
    saveSessions(updated);
    setActiveSessionId(newSessionId);
    setMobileSidebarOpen(false);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    if (updated.length === 0) {
      initializeDefaultSession();
    } else {
      saveSessions(updated);
      if (activeSessionId === id) {
        setActiveSessionId(updated[0].id);
      }
    }
  };

  // Safe markdown parsers to follow caleb's decision on image rendering
  const extractMarkdownImages = (text: string): { alt: string; url: string }[] => {
    if (!text) return [];
    // Match ![alt](url)
    const regex = /!\[([^\]]*)\]\((https?:\/\/[^\s\)]+|\/api\/storage\/file\/[a-f0-9\-]+[^\s\)]*)\)/gi;
    const images: { alt: string; url: string }[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      images.push({
        alt: match[1] || 'Imagen',
        url: match[2]
      });
    }
    return images;
  };

  const extractMarkdownFiles = (text: string): { name: string; url: string; id: string }[] => {
    if (!text) return [];
    // Match [name](/api/storage/file/ID...) but NOT prefixed with !
    const regex = /(!)?\[([^\]]*)\]\((\/api\/storage\/file\/([a-f0-9\-]+)[^\s\)]*)\)/gi;
    const files: { name: string; url: string; id: string }[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      const isImage = !!match[1];
      if (!isImage) {
        files.push({
          name: match[2] || 'Archivo',
          url: match[3],
          id: match[4]
        });
      }
    }
    return files;
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
  }, [messages, loading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !attachedFile) || loading || uploadingFile || !activeSessionId) return;

    const userMessage = input.trim();
    const sentAttachment = attachedFile;
    setInput('');
    setAttachedFile(null);
    setLoading(true);

    const newUserMsg: Message = { 
      role: 'user', 
      text: userMessage || `[Archivo enviado: ${sentAttachment?.name}]`, 
      timestamp: new Date().toISOString(), 
      attachment: sentAttachment 
    };

    const calebPlaceholderMsg: Message = {
      role: 'caleb',
      text: '',
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, newUserMsg, calebPlaceholderMsg];
    
    // Update active session with the new message list
    const updatedSessions = sessions.map(s => {
      if (s.id === activeSessionId) {
        // Auto update session title if it's default
        const currentTitle = s.title === 'Nueva Conversación' && userMessage
          ? (userMessage.length > 25 ? userMessage.substring(0, 25) + '...' : userMessage)
          : s.title;
        return {
          ...s,
          title: currentTitle,
          messages: updatedMessages
        };
      }
      return s;
    });

    saveSessions(updatedSessions);

    // Get current Supabase session JWT
    const { data: { session } } = await supabase.auth.getSession();
    const userJwt = session?.access_token || '';

    const promptText = sentAttachment
      ? `[Archivo Adjunto: "${sentAttachment.name}" (ID: ${sentAttachment.id})] ${userMessage}`
      : userMessage;

    try {
      const response = await fetch(getApiUrl('/api/caleb'), {
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

        setSessions(prevSessions => {
          const updated = prevSessions.map(s => {
            if (s.id === activeSessionId) {
              const msgs = [...s.messages];
              if (msgs.length > 0) {
                msgs[msgs.length - 1].text = calebText;
              }
              return { ...s, messages: msgs };
            }
            return s;
          });
          localStorage.setItem('caleb_chat_sessions', JSON.stringify(updated));
          return updated;
        });
      }

    } catch (err: any) {
      setSessions(prevSessions => {
        const updated = prevSessions.map(s => {
          if (s.id === activeSessionId) {
            const msgs = [...s.messages];
            if (msgs.length > 0) {
              msgs[msgs.length - 1].text = `[ERROR DE CONEXIÓN] Caleb no pudo reportarse: ${err.message}`;
            }
            return { ...s, messages: msgs };
          }
          return s;
        });
        localStorage.setItem('caleb_chat_sessions', JSON.stringify(updated));
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const executeQuickAction = (cmd: string) => {
    setInput(cmd);
  };

  // Parser to split response into thoughts and content
  interface ParsedBlock {
    type: 'text' | 'thought' | 'tool';
    content: string;
  }

  const parseCalebMessage = (text: string): ParsedBlock[] => {
    const blocks: ParsedBlock[] = [];
    if (!text) return blocks;

    let remaining = text;
    while (remaining.length > 0) {
      const thoughtStart = remaining.indexOf('<thought>');
      if (thoughtStart !== -1) {
        if (thoughtStart > 0) {
          blocks.push({ type: 'text', content: remaining.substring(0, thoughtStart) });
        }
        
        const thoughtEnd = remaining.indexOf('</thought>', thoughtStart);
        if (thoughtEnd !== -1) {
          blocks.push({ 
            type: 'thought', 
            content: remaining.substring(thoughtStart + 9, thoughtEnd) 
          });
          remaining = remaining.substring(thoughtEnd + 10);
        } else {
          blocks.push({ 
            type: 'thought', 
            content: remaining.substring(thoughtStart + 9) 
          });
          break;
        }
      } else {
        blocks.push({ type: 'text', content: remaining });
        break;
      }
    }

    // Further split text blocks to pull tool executions
    const finalBlocks: ParsedBlock[] = [];
    blocks.forEach(b => {
      if (b.type === 'text') {
        const lines = b.content.split('\n');
        let currentTextAccumulator: string[] = [];

        lines.forEach(line => {
          const lowerLine = line.toLowerCase().trim();
          const isTool = lowerLine.startsWith('calling tool:') || 
                        lowerLine.startsWith('tool response:') ||
                        lowerLine.startsWith('⚙️') ||
                        lowerLine.startsWith('[tool:');
          
          if (isTool) {
            if (currentTextAccumulator.length > 0) {
              finalBlocks.push({ type: 'text', content: currentTextAccumulator.join('\n') });
              currentTextAccumulator = [];
            }
            finalBlocks.push({ type: 'tool', content: line });
          } else {
            currentTextAccumulator.push(line);
          }
        });

        if (currentTextAccumulator.length > 0) {
          finalBlocks.push({ type: 'text', content: currentTextAccumulator.join('\n') });
        }
      } else {
        finalBlocks.push(b);
      }
    });

    return finalBlocks;
  };

  // ─── Lightweight Markdown renderer ────────────────────────────────────────
  const renderMarkdown = (text: string): React.ReactNode => {
    const lines = text.split('\n');
    const output: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Blank line → spacer
      if (line.trim() === '') {
        output.push(<div key={i} className="h-2" />);
        i++;
        continue;
      }

      // ### Heading 3
      if (line.startsWith('### ')) {
        output.push(
          <h3 key={i} className="text-sm font-bold text-zinc-100 mt-3 mb-1">
            {renderInline(line.slice(4))}
          </h3>
        );
        i++;
        continue;
      }
      // ## Heading 2
      if (line.startsWith('## ')) {
        output.push(
          <h2 key={i} className="text-sm font-bold text-zinc-100 mt-4 mb-1">
            {renderInline(line.slice(3))}
          </h2>
        );
        i++;
        continue;
      }
      // # Heading 1
      if (line.startsWith('# ')) {
        output.push(
          <h1 key={i} className="text-base font-bold text-zinc-100 mt-4 mb-2">
            {renderInline(line.slice(2))}
          </h1>
        );
        i++;
        continue;
      }

      // Ordered list item: 1. text
      const orderedMatch = line.match(/^(\d+)\. (.*)/);
      if (orderedMatch) {
        const listItems: React.ReactNode[] = [];
        let n = parseInt(orderedMatch[1], 10);
        while (i < lines.length) {
          const om = lines[i].match(/^(\d+)\. (.*)/);
          if (!om) break;
          listItems.push(
            <li key={i} className="ml-4 list-decimal">
              {renderInline(om[2])}
            </li>
          );
          i++;
          n++;
        }
        output.push(
          <ol key={`ol-${i}`} className="space-y-0.5 my-1 text-zinc-200">
            {listItems}
          </ol>
        );
        continue;
      }

      // Unordered list item: - text or * text
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const listItems: React.ReactNode[] = [];
        while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
          listItems.push(
            <li key={i} className="ml-4 list-disc">
              {renderInline(lines[i].slice(2))}
            </li>
          );
          i++;
        }
        output.push(
          <ul key={`ul-${i}`} className="space-y-0.5 my-1 text-zinc-200">
            {listItems}
          </ul>
        );
        continue;
      }

      // Horizontal rule ---
      if (/^---+$/.test(line.trim())) {
        output.push(<hr key={i} className="border-zinc-700 my-3" />);
        i++;
        continue;
      }

      // Regular paragraph
      output.push(
        <p key={i} className="leading-relaxed text-zinc-200">
          {renderInline(line)}
        </p>
      );
      i++;
    }

    return <>{output}</>;
  };

  // Inline markdown: **bold**, *italic*, `code`, and plain text
  const renderInline = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    // Regex: **bold** | *italic* | `code`
    const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/g;
    let last = 0;
    let match: RegExpExecArray | null;
    let idx = 0;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > last) {
        parts.push(<span key={idx++}>{text.slice(last, match.index)}</span>);
      }
      if (match[1] !== undefined) {
        parts.push(<strong key={idx++} className="font-bold text-zinc-100">{match[1]}</strong>);
      } else if (match[2] !== undefined) {
        parts.push(<em key={idx++} className="italic text-zinc-300">{match[2]}</em>);
      } else if (match[3] !== undefined) {
        parts.push(
          <code key={idx++} className="bg-zinc-800 text-emerald-400 px-1 py-0.5 rounded text-[11px] font-mono">
            {match[3]}
          </code>
        );
      }
      last = match.index + match[0].length;
    }
    if (last < text.length) {
      parts.push(<span key={idx++}>{text.slice(last)}</span>);
    }
    return parts.length === 1 ? parts[0] : <>{parts}</>;
  };
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full w-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden font-sans border border-zinc-200 dark:border-zinc-800 rounded-none md:rounded-2xl shadow-2xl" style={{ minHeight: 0 }}>
      {/* 1. SESSIONS SIDEBAR - LEFT PANEL */}
      <aside 
        style={{
          width: typeof window !== 'undefined' && window.innerWidth >= 768 ? (sidebarVisible ? `${sidebarWidth}px` : '0px') : undefined,
          display: typeof window !== 'undefined' && window.innerWidth >= 768 && !sidebarVisible ? 'none' : undefined
        }}
        className={`
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0 fixed md:static inset-y-16 md:inset-auto left-0 w-80 
          bg-zinc-100 dark:bg-zinc-950/80 border-r border-zinc-200 dark:border-zinc-800 
          flex flex-col shrink-0 z-30 transition-transform duration-350 ease-in-out relative
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
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-200/20 dark:bg-zinc-950/20">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Historial de Conversas</span>
          <button
            onClick={handleNewSession}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer"
            title="Nueva Conversación"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nueva</span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-zinc-800">
          {sessions.map((s) => {
            const isActive = s.id === activeSessionId;
            return (
              <div
                key={s.id}
                onClick={() => {
                  setActiveSessionId(s.id);
                  setMobileSidebarOpen(false);
                }}
                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                  isActive 
                    ? 'bg-emerald-50 dark:bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border-emerald-250 dark:border-emerald-500/20 font-semibold' 
                    : 'bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-850/50 border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2.5 overflow-hidden">
                  <MessageSquare className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-500' : 'text-zinc-500'}`} />
                  <span className="text-xs truncate">{s.title}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteSession(s.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-450 hover:text-rose-500 transition-all"
                  title="Eliminar chat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Connection status footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-200/10 dark:bg-zinc-950/20 flex items-center justify-between text-[10px] uppercase font-bold text-zinc-500">
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

      {/* MOBILE OVERLAY BACKGROUND */}
      {mobileSidebarOpen && (
        <div 
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* 2. MAIN CHAT DISPLAY - RIGHT PANEL */}
      <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#111112] relative overflow-hidden">
        {/* Chat Module Header */}
        <div className="bg-white dark:bg-[#18181b] border-b border-zinc-200 dark:border-zinc-800 px-4 md:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            {/* Sidebar toggle button (desktop) */}
            <button
              onClick={() => setSidebarVisible(!sidebarVisible)}
              className="hidden md:flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
              title={sidebarVisible ? "Ocultar historial" : "Mostrar historial"}
            >
              <Menu className="h-5 w-5" />
            </button>

            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Bot className="h-5.5 w-5.5 text-emerald-500 animate-pulse" />
            <div className="text-left">
              <span className="font-bold text-zinc-800 dark:text-white text-sm tracking-wider uppercase block">Caleb AI</span>
              <span className="text-[10px] text-zinc-550 dark:text-zinc-400 block font-semibold">Perfil caleb activo •oneshot mode</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-[10px] uppercase font-bold text-zinc-500">
            <span className="hidden sm:inline bg-zinc-100 dark:bg-zinc-850 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-550">
              Terminal: /api/caleb
            </span>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 bg-zinc-50 dark:bg-[#161618] scrollbar-thin scrollbar-thumb-zinc-800">
          {messages.map((msg, idx) => {
            const isLatestEmptyCaleb = msg.role === 'caleb' && msg.text === '' && idx === messages.length - 1;
            if (isLatestEmptyCaleb && loading) {
              return (
                <div key={idx} className="flex space-x-3 justify-start items-start">
                  <div className="h-9 w-9 rounded-xl bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400 font-bold shrink-0 text-sm">
                    C
                  </div>
                  <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl text-sm max-w-xl flex flex-col space-y-2">
                    <div className="flex items-center space-x-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.8s' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.8s' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.8s' }} />
                    </div>
                    <span className="text-[10px] text-zinc-550 dark:text-zinc-400 animate-pulse font-mono font-bold">Caleb está pensando o llamando a una herramienta...</span>
                  </div>
                </div>
              );
            }

            const parsedBlocks = parseCalebMessage(msg.text);
            const markdownImages = extractMarkdownImages(msg.text);
            const markdownFiles = extractMarkdownFiles(msg.text);

            return (
              <div key={idx} className={`flex space-x-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-start`}>
                {msg.role === 'caleb' && (
                  <div className="h-9 w-9 rounded-xl bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400 font-bold shrink-0 text-sm">
                    C
                  </div>
                )}
                <div className={`max-w-[85%] md:max-w-2xl p-4.5 rounded-2xl text-sm leading-relaxed border ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 border-emerald-500/20 text-white dark:text-white'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100'
                }`}>
                  {/* Caleb parsed response layout */}
                  {msg.role === 'caleb' ? (
                    <div className="space-y-3">
                      {parsedBlocks.map((block, bIdx) => {
                        if (block.type === 'thought') {
                          return (
                            <details 
                              key={bIdx} 
                              className="bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 my-2 text-xs font-sans text-zinc-500 dark:text-zinc-400"
                              open
                            >
                              <summary className="cursor-pointer font-bold select-none outline-none flex items-center gap-1.5 text-zinc-650 dark:text-zinc-300">
                                <Brain className="h-3.5 w-3.5 text-emerald-400" />
                                <span>Razonamiento / Proceso interno</span>
                              </summary>
                              <div className="mt-2.5 whitespace-pre-wrap font-mono leading-relaxed border-t border-zinc-200 dark:border-zinc-850 pt-2 text-[11px] text-zinc-500">
                                {block.content.trim()}
                              </div>
                            </details>
                          );
                        } else if (block.type === 'tool') {
                          return (
                            <div key={bIdx} className="flex items-center gap-2 p-2 rounded-lg bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800/50 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 my-1">
                              <span className="inline-flex h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                              <span className="font-semibold">{block.content}</span>
                            </div>
                          );
                        } else {
                          return (
                            <div key={bIdx} className="text-zinc-200 leading-relaxed font-sans text-sm">
                              {renderMarkdown(block.content)}
                            </div>
                          );
                        }
                      })}
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap font-sans text-zinc-800 dark:text-zinc-200">{msg.text}</div>
                  )}

                  {/* Render images ONLY if IA decides to output them using Markdown Image Syntax ![alt](url) */}
                  {markdownImages.map((img, imgIdx) => (
                    <div key={imgIdx} className="mt-3 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-850 bg-black/5 dark:bg-black/20 max-w-sm">
                      <div className="bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 text-[10px] text-zinc-500 font-bold border-b border-zinc-200 dark:border-zinc-850 truncate flex items-center gap-1.5">
                        <Terminal className="h-3 w-3 text-emerald-400" /> Vista previa: {img.alt}
                      </div>
                      <img 
                        src={img.url} 
                        alt={img.alt} 
                        className="w-full h-auto object-contain max-h-64 hover:scale-[1.02] transition-transform duration-200"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ))}

                  {/* Render files ONLY if IA decides to output them using Markdown File Link Syntax [name](url) */}
                  {markdownFiles.map((file, fIdx) => (
                    <div key={fIdx} className="mt-3 space-y-2 max-w-sm">
                      {isImageFile(file.name) && (
                        <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-850 bg-black/5 dark:bg-black/20">
                          <img 
                            src={file.url} 
                            alt={file.name} 
                            className="w-full h-auto object-contain max-h-60"
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 text-zinc-800 dark:text-zinc-200 shadow-sm">
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
                  ))}

                  {/* User's uploaded file attachment card */}
                  {msg.role === 'user' && msg.attachment && (
                    <div className="mt-3 space-y-2 max-w-sm">
                      {isImageFile(msg.attachment.name) && (
                        <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-black/5 dark:bg-black/20">
                          <img 
                            src={getApiUrl(`/api/storage/file/${msg.attachment.id}?name=${encodeURIComponent(msg.attachment.name)}`)}
                            alt={msg.attachment.name} 
                            className="w-full h-auto object-contain max-h-60"
                          />
                        </div>
                      )}
                      <div 
                        className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 shadow-sm"
                      >
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <FileText className="h-7 w-7 text-zinc-550 shrink-0" />
                          <div className="text-left overflow-hidden">
                            <div className="text-xs font-semibold truncate">{msg.attachment.name}</div>
                            <div className="text-[9px] text-zinc-550 truncate">ID: {msg.attachment.id.substring(0, 8)}...</div>
                          </div>
                        </div>
                        <a
                          href={getApiUrl(`/api/storage/file/${msg.attachment.id}?name=${encodeURIComponent(msg.attachment.name)}`)}
                          download={msg.attachment.name}
                          className="ml-4 shrink-0 flex items-center justify-center p-2 rounded-lg bg-zinc-200 hover:bg-zinc-350 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
                          title="Descargar archivo"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="text-[9px] text-zinc-500 mt-2 text-right font-mono font-bold">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Prompts suggestions (only if no user messages exist in session) */}
        {messages.length <= 1 && (
          <div className="px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/40 border-t border-zinc-200 dark:border-zinc-900 grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
            <button 
              onClick={() => executeQuickAction("Auditar inventario y alertar si hay stock crítico.")}
              className="text-xs font-semibold bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800/80 p-3.5 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between group shadow-xs"
            >
              <div>
                <div className="font-bold text-zinc-800 dark:text-zinc-250">🔍 Auditar Inventario General</div>
                <div className="text-[10px] text-zinc-500 mt-1">Busca niveles mínimos en stock de materiales</div>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-450 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button 
              onClick={() => executeQuickAction("Listar las tareas pendientes asignadas a obras.")}
              className="text-xs font-semibold bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800/80 p-3.5 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between group shadow-xs"
            >
              <div>
                <div className="font-bold text-zinc-800 dark:text-zinc-250">📋 Listar Tareas Activas</div>
                <div className="text-[10px] text-zinc-500 mt-1">Inspecciona tareas pendientes en el CRM de proyectos</div>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-450 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}

        {/* Attachment preview panel */}
        {attachedFile && (
          <div className="px-6 py-2 bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-650 dark:text-zinc-350 shrink-0">
            <div className="flex items-center space-x-2 truncate">
              <FileText className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="font-semibold truncate">{attachedFile.name}</span>
              <span className="text-[10px] text-zinc-500">(Adjunto listo)</span>
            </div>
            <button
              type="button"
              onClick={() => setAttachedFile(null)}
              className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-550 hover:text-red-500 transition-colors cursor-pointer"
              title="Quitar archivo adjunto"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        
        {uploadingFile && (
          <div className="px-6 py-2 bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center space-x-2 text-xs text-zinc-500 shrink-0">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-500" />
            <span>Subiendo documento a Naski...</span>
          </div>
        )}

        {/* Prompt Input Form */}
        <form onSubmit={handleSend} className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex gap-3 items-center shrink-0">
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
            className="h-12 w-12 rounded-xl flex items-center justify-center border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-emerald-500 dark:hover:text-emerald-400 disabled:opacity-50 transition-all cursor-pointer shrink-0"
            title="Adjuntar documento"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ingrese directiva operativa a Caleb (ej. ver detalles de planta solar)..."
            className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-600 font-sans text-zinc-800 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-650 h-12"
            disabled={loading || !activeSessionId}
          />
          <button
            type="submit"
            disabled={loading || uploadingFile || (!input.trim() && !attachedFile) || !activeSessionId}
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 px-5 rounded-xl flex items-center justify-center disabled:opacity-50 transition-colors cursor-pointer shrink-0 font-bold"
          >
            {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
