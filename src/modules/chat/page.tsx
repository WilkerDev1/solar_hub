'use client';

import React, { useState } from 'react';
import { Send, Hash, Users, Pin } from 'lucide-react';

interface Message {
  id: string;
  sender: string;
  role: string;
  content: string;
  time: string;
}

export default function ChatModule() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'Carlos Gómez', role: 'Director de Ingeniería', content: '¿Alguien tiene el diagrama unifilar actualizado del Proyecto Solar Copiapó?', time: '11:05 AM' },
    { id: '2', sender: 'Juan Técnico', role: 'Técnico de Campo', content: 'Sí, lo subí a la galería del proyecto hace unos minutos. Revisen si está todo en orden.', time: '11:08 AM' },
    { id: '3', sender: 'Ana Legal', role: 'Asesora Jurídica', content: 'Excelente. Ya preparé la adenda del contrato con los nuevos inversores.', time: '11:15 AM' },
  ]);
  const [inputValue, setInputValue] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'Juan Técnico',
      role: 'Técnico de Campo',
      content: inputValue,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages([...messages, newMessage]);
    setInputValue('');
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
      {/* Channels Sidebar */}
      <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-4 flex flex-col justify-between hidden md:flex">
        <div className="space-y-6">
          <div>
            <h3 className="px-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Canales del Proyecto</h3>
            <nav className="mt-2 space-y-1">
              <button className="flex w-full items-center px-2 py-1.5 text-sm font-semibold rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50">
                <Hash className="mr-2 h-4 w-4 text-zinc-500" />
                # general
              </button>
              <button className="flex w-full items-center px-2 py-1.5 text-sm font-medium rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60">
                <Hash className="mr-2 h-4 w-4 text-zinc-500" />
                # ingenieria
              </button>
              <button className="flex w-full items-center px-2 py-1.5 text-sm font-medium rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60">
                <Hash className="mr-2 h-4 w-4 text-zinc-500" />
                # logistica-despachos
              </button>
            </nav>
          </div>
          <div>
            <h3 className="px-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Miembros del Canal</h3>
            <div className="mt-2 space-y-2 px-2">
              <div className="flex items-center text-sm text-zinc-700 dark:text-zinc-300">
                <div className="h-2 w-2 rounded-full bg-emerald-500 mr-2" />
                Carlos Gómez
              </div>
              <div className="flex items-center text-sm text-zinc-700 dark:text-zinc-300">
                <div className="h-2 w-2 rounded-full bg-emerald-500 mr-2" />
                Ana Legal
              </div>
              <div className="flex items-center text-sm text-zinc-700 dark:text-zinc-300">
                <div className="h-2 w-2 rounded-full bg-amber-500 mr-2" />
                Juan Técnico
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main chat window */}
      <div className="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-950">
        <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 px-6 flex items-center justify-between bg-white dark:bg-zinc-900/60">
          <div className="flex items-center space-x-2">
            <Hash className="h-5 w-5 text-zinc-400" />
            <h2 className="font-bold text-zinc-900 dark:text-zinc-50">general</h2>
          </div>
          <div className="flex items-center space-x-4 text-zinc-400">
            <Users className="h-5 w-5 cursor-pointer hover:text-zinc-600" />
            <Pin className="h-5 w-5 cursor-pointer hover:text-zinc-600" />
          </div>
        </header>

        {/* Message body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="flex flex-col bg-white dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm max-w-2xl">
              <div className="flex justify-between items-baseline">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-sm text-zinc-950 dark:text-zinc-50">{msg.sender}</span>
                  <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded font-mono">
                    {msg.role}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400">{msg.time}</span>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1.5 whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}
        </div>

        {/* Input box */}
        <footer className="p-4 bg-white dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              placeholder="Enviar mensaje a #general..."
              className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-sm font-semibold flex items-center transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
}
