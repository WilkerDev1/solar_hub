import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/core/auth/AuthContext';
import { supabase } from '@/core/database/supabase';
import { uploadDocument } from '@/core/services/documents';
import { getApiUrl } from '@/core/utils/api';

export interface Message {
  role: 'user' | 'caleb';
  text: string;
  timestamp: string;
  attachment?: { id: string; name: string } | null;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
}

export function useCaleb() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ id: string; name: string } | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Sidebar resizing and visibility states
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const isResizing = useRef(false);
  const sidebarRef = useRef<HTMLElement | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.addEventListener('mousemove', handleSidebarMouseMove);
    document.addEventListener('mouseup', handleSidebarMouseUp);
  };

  const handleSidebarMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return;
    const rect = sidebarRef.current?.getBoundingClientRect();
    if (rect) {
      const newWidth = Math.max(180, Math.min(e.clientX - rect.left, 480));
      setSidebarWidth(newWidth);
    } else {
      const newWidth = Math.max(180, Math.min(e.clientX - 280, 480));
      setSidebarWidth(newWidth);
    }
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

  // Load sessions from localStorage on mount + listen for sync events from the floating widget
  useEffect(() => {
    const loadFromStorage = () => {
      const saved = localStorage.getItem('caleb_chat_sessions');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as ChatSession[];
          // Clean legacy sessions containing only the default greeting message
          const cleaned = parsed.map(s => {
            if (s.messages.length === 1 && s.messages[0].role === 'caleb' && (
              s.messages[0].text.includes('A la orden') ||
              s.messages[0].text.includes('inicializado') ||
              s.messages[0].text.includes('Estoy inicializado y listo')
            )) {
              return { ...s, messages: [] };
            }
            return s;
          });
          if (cleaned.length > 0) {
            setSessions(cleaned);
            setActiveSessionId(prev => cleaned.find(s => s.id === prev) ? prev : cleaned[0].id);
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
      messages: []
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
      messages: []
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

  return {
    user,
    sessions,
    activeSessionId,
    setActiveSessionId,
    input,
    setInput,
    loading,
    uploadingFile,
    attachedFile,
    setAttachedFile,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    sidebarWidth,
    sidebarVisible,
    setSidebarVisible,
    sidebarRef,
    fileInputRef,
    messagesEndRef,
    messages,
    handleNewSession,
    handleDeleteSession,
    handleFileChange,
    handleSend,
    executeQuickAction,
    startResizing,
    scrollToBottom
  };
}
