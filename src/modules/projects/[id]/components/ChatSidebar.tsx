'use client';

import React from 'react';
import { MessageSquare, X, Loader2, Send } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { ProjectDetailContext } from '../hooks/useProjectDetail';

type Props = Pick<ProjectDetailContext,
  'messages' | 'newMessage' | 'setNewMessage' | 'sendingMsg' | 'messagesEndRef' |
  'currentUser' | 'handleSendMessage' | 'setIsChatOpen'
>;

export default function ChatSidebar({
  messages, newMessage, setNewMessage, sendingMsg, messagesEndRef,
  currentUser, handleSendMessage, setIsChatOpen
}: Props) {
  return (
    <div className="w-[360px] border-l border-zinc-900 bg-zinc-950 flex flex-col h-full shrink-0 z-10 transition-all duration-300">
      {/* Chat Header */}
      <div className="p-4 border-b border-zinc-900 bg-zinc-900/20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4.5 w-4.5 text-emerald-400" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">Chat de Obra</span>
        </div>
        <button
          onClick={() => setIsChatOpen(false)}
          className="p-1 hover:bg-zinc-900 rounded text-zinc-550 hover:text-white transition-colors"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Messages Panel */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-900">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2">
            <MessageSquare className="h-8 w-8 opacity-20" />
            <p className="text-xs italic">No hay mensajes en este canal. Escribe el primero.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.profile_id === currentUser?.id;
            const profile = (msg as any).profiles;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} text-left`}>
                {!isMe && (
                  <span className="text-[9px] text-zinc-500 ml-1 mb-1 font-bold">
                    {profile?.full_name || 'Miembro'}
                  </span>
                )}
                <div className={`px-3.5 py-2 rounded-2xl max-w-[85%] text-xs leading-normal ${
                  isMe
                    ? 'bg-emerald-600 text-white rounded-br-sm'
                    : 'bg-zinc-900 text-zinc-200 rounded-bl-sm border border-zinc-800/80'
                }`}>
                  {msg.message}
                </div>
                <span className="text-[8px] text-zinc-600 mt-1 mx-1 font-mono">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Messages Input Box */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-900 bg-zinc-900/50 flex gap-2 shrink-0">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Escribe al equipo de obra..."
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
        />
        <Button type="submit" disabled={sendingMsg || !newMessage.trim()} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-3.5 h-8">
          {sendingMsg ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </Button>
      </form>
    </div>
  );
}
