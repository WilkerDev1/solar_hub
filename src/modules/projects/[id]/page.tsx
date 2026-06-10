'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Folder, MapPin, Zap, Activity, CheckCircle, Clock, 
  Upload, FileText, Loader2, AlertCircle, MessageSquare, Send,
  Shield, Check, X, AlertTriangle, Plus
} from 'lucide-react';
import { supabase } from '@/core/database/supabase';
import { Button } from '@/core/components/ui/button';
import { getTasks, createTask, updateTaskStatus, auditTaskStatus, uploadTaskEvidence, TaskRow } from '@/core/services/tasks';
import { getProjectMessages, sendMessage, ProjectMessageRow } from '@/core/services/chat';

type TabType = 'detalles' | 'tareas' | 'chat';

export default function ProjectDetailModule({ projectId }: { projectId: string }) {
  const router = useRouter();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<TabType>('detalles');

  // Core Data State
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Chat State
  const [messages, setMessages] = useState<ProjectMessageRow[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Tasks State
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [uploadingEvidenceId, setUploadingEvidenceId] = useState<string | null>(null);

  // Load Initial Data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          setCurrentUser({ ...user, ...profile });
          
          // Check if admin
          const { data: adminCheck } = await supabase.rpc('user_has_permission', { required_action: 'admin:*' });
          setIsAdmin(!!adminCheck);
        }

        // Fetch Project
        const { data: projData, error: fetchErr } = await supabase
          .from('projects')
          .select('*, clients(id, name)')
          .eq('id', projectId)
          .single();

        if (fetchErr) throw fetchErr;
        setProject(projData);

      } catch (err: any) {
        console.error('Error loading project details:', err);
        setError(err.message || 'Proyecto no encontrado.');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) loadData();
  }, [projectId]);

  // Handle Chat Subscriptions & Fetch
  useEffect(() => {
    if (activeTab === 'chat' && projectId) {
      const fetchMsgs = async () => {
        try {
          const msgs = await getProjectMessages(projectId);
          setMessages(msgs);
          scrollToBottom();
        } catch (e) { console.error(e); }
      };
      fetchMsgs();

      const channel = supabase
        .channel('project_chat')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'project_messages', filter: `project_id=eq.${projectId}` },
          (payload) => {
            // Need to fetch user profile for the new message
            supabase.from('profiles').select('id, full_name, avatar_url, email').eq('id', payload.new.profile_id).single()
              .then(({ data: profile }) => {
                const newMsg = { ...payload.new, profiles: profile } as any;
                setMessages((prev) => [...prev, newMsg]);
                scrollToBottom();
              });
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [activeTab, projectId]);

  // Handle Tasks Fetch
  useEffect(() => {
    if (activeTab === 'tareas' && projectId) {
      const fetchProjTasks = async () => {
        setLoadingTasks(true);
        try {
          // Notice: The service backend gets all project tasks. 
          // RLS or further client filtering is applied.
          const projTasks = await getTasks({ projectId });
          
          // Here we would ideally filter by user's specific area permissions
          // For MVP, if they can view the task via RLS, they see it. 
          // (Backend RLS should ideally hide them, but we will filter in UI based on explicit RLS failures if any).
          setTasks(projTasks);
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingTasks(false);
        }
      };
      fetchProjTasks();
    }
  }, [activeTab, projectId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sendingMsg) return;
    
    setSendingMsg(true);
    try {
      await sendMessage(projectId, newMessage);
      setNewMessage('');
    } catch (err) {
      console.error(err);
      alert('Error enviando mensaje');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleEvidenceUpload = async (taskId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadingEvidenceId(taskId);
      try {
        const file = e.target.files[0];
        // Ensure bucket exists in Supabase, else this fails gracefully
        await uploadTaskEvidence(taskId, file, tasks.find(t => t.id === taskId)?.evidence_urls || []);
        // Refresh tasks
        const projTasks = await getTasks({ projectId });
        setTasks(projTasks);
        alert('Evidencia subida correctamente.');
      } catch (err: any) {
        alert(err.message || 'Error al subir archivo');
      } finally {
        setUploadingEvidenceId(null);
      }
    }
  };

  const handleAudit = async (taskId: string, status: 'aceptado' | 'denegado' | 'requiere_revision') => {
    try {
      await auditTaskStatus(taskId, status);
      const projTasks = await getTasks({ projectId });
      setTasks(projTasks);
    } catch (err: any) {
      alert(err.message || 'Error al auditar tarea');
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
        <span className="text-zinc-500 text-sm font-medium">Cargando centro de mando del proyecto...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-6 rounded-xl flex items-center space-x-3 text-sm max-w-lg mx-auto mt-12">
        <AlertCircle className="h-6 w-6 text-rose-400" />
        <span>{error || 'Proyecto no encontrado.'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/?tab=projects')}
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wide">{project.name}</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Cliente: <strong className="text-white">{project.clients?.name || 'N/D'}</strong> • Fase: <strong className="text-emerald-400">{project.phase}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex space-x-2 border-b border-zinc-800 pb-px">
        {(['detalles', 'tareas', 'chat'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-sm font-bold capitalize transition-colors border-b-2 ${
              activeTab === tab 
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
                : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TABS CONTENT */}
      <div className="pt-2">
        
        {/* TAB: DETALLES */}
        {activeTab === 'detalles' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2 pb-3 border-b border-zinc-800/60">
                <Folder className="h-4 w-4 text-emerald-400" />
                Atributos Técnicos
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-zinc-850/40">
                  <span className="text-zinc-500 font-medium">Capacidad</span>
                  <span className="font-bold text-zinc-300">{project.capacity || 'N/D'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-850/40">
                  <span className="text-zinc-500 font-medium">Ubicación</span>
                  <span className="font-bold text-zinc-300 text-right">{project.location || 'N/D'}</span>
                </div>
                {project.gps_coordinates && (
                  <div className="flex justify-between py-2 border-b border-zinc-850/40">
                    <span className="text-zinc-500 font-medium">GPS</span>
                    <span className="font-bold text-amber-400 font-mono">{project.gps_coordinates}</span>
                  </div>
                )}
                <div className="flex justify-between py-2">
                  <span className="text-zinc-500 font-medium">Estado</span>
                  <span className={`font-bold uppercase text-xs px-2 py-1 rounded bg-zinc-800 ${
                    project.status === 'completado' ? 'text-emerald-400' :
                    project.status === 'en_progreso' ? 'text-amber-400' : 'text-rose-400'
                  }`}>{project.status.replace('_', ' ')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: TAREAS */}
        {activeTab === 'tareas' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-white">Tareas y Entregables del Proyecto</h2>
                <p className="text-sm text-zinc-400">Filtrado por tus permisos de área asignados.</p>
              </div>
              {/* Future feature: Create new task button here */}
            </div>

            {loadingTasks ? (
              <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-zinc-500" /></div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-10 bg-zinc-900/20 border border-zinc-800 rounded-xl text-zinc-500 text-sm">
                No hay tareas visibles en este proyecto para tu área.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {tasks.map(task => (
                  <div key={task.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors">
                    <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {task.area}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            task.task_type === 'evidencia' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                            task.task_type === 'reporte' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}>
                            {task.task_type}
                          </span>
                          {task.audit_status !== 'pendiente' && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                              task.audit_status === 'aceptado' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              task.audit_status === 'denegado' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                              'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              Auditoría: {task.audit_status?.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        <h4 className="text-base font-bold text-white">{task.title}</h4>
                        {task.description && <p className="text-sm text-zinc-400">{task.description}</p>}
                      </div>

                      {/* Evidence & Audit Controls */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {/* Evidence Upload (If applicable) */}
                        {(task.task_type === 'evidencia' || task.task_type === 'reporte') && (
                          <div className="relative">
                            <input
                              type="file"
                              onChange={(e) => handleEvidenceUpload(task.id, e)}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              disabled={uploadingEvidenceId === task.id}
                            />
                            <Button variant="secondary" size="sm" className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700" disabled={uploadingEvidenceId === task.id}>
                              {uploadingEvidenceId === task.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                              Subir Archivo
                            </Button>
                          </div>
                        )}

                        {/* Admin Auditing Controls */}
                        {isAdmin && (
                          <div className="flex items-center gap-2 border-l border-zinc-800 pl-4 ml-2">
                            <Button size="sm" onClick={() => handleAudit(task.id, 'aceptado')} className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20">
                              <Check className="h-4 w-4 mr-1" /> Aprobar
                            </Button>
                            <Button size="sm" onClick={() => handleAudit(task.id, 'denegado')} className="bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20">
                              <X className="h-4 w-4 mr-1" /> Denegar
                            </Button>
                            <Button size="sm" onClick={() => handleAudit(task.id, 'requiere_revision')} className="bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20">
                              <AlertTriangle className="h-4 w-4 mr-1" /> Revisión
                            </Button>
                          </div>
                        )}
                      </div>

                    </div>
                    
                    {/* Render Evidence Files */}
                    {task.evidence_urls && task.evidence_urls.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-zinc-800/50 flex flex-wrap gap-2">
                        {task.evidence_urls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-emerald-400 hover:underline">
                            <FileText className="h-3 w-3" /> Evidencia {i + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: CHAT */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-[500px] border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950/30">
            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2">
                  <MessageSquare className="h-8 w-8 opacity-20" />
                  <p className="text-sm">No hay mensajes en este proyecto aún.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.profile_id === currentUser?.id;
                  const profile = (msg as any).profiles;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {!isMe && <span className="text-[10px] text-zinc-500 ml-1 mb-1 font-medium">{profile?.full_name || 'Usuario'}</span>}
                      <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-sm ${
                        isMe 
                          ? 'bg-emerald-600 text-white rounded-br-sm' 
                          : 'bg-zinc-800 text-zinc-200 rounded-bl-sm border border-zinc-700/50'
                      }`}>
                        {msg.message}
                      </div>
                      <span className="text-[9px] text-zinc-600 mt-1 mx-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Area */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-800 bg-zinc-900/50 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje al equipo..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
              <Button type="submit" disabled={sendingMsg || !newMessage.trim()} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-4">
                {sendingMsg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
