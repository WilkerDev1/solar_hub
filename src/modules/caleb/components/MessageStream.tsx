'use client';

import React from 'react';
import { Brain, Terminal, FileText, Download } from 'lucide-react';
import { Message } from '../hooks/useCaleb';
import { 
  parseCalebMessage, 
  extractMarkdownImages, 
  extractMarkdownFiles, 
  isImageFile, 
  renderMarkdown 
} from '../utils/calebHelpers';
import { getApiUrl } from '@/core/utils/api';

interface MessageStreamProps {
  messages: Message[];
  loading: boolean;
  documentMap: Record<string, { name: string; mime_type: string }>;
  token: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export default function MessageStream({
  messages,
  loading,
  documentMap,
  token,
  messagesEndRef
}: MessageStreamProps) {
  return (
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
                ? 'bg-emerald-600 border-emerald-500/20 text-white'
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
                          className="bg-zinc-105 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl p-3 my-2 text-xs font-sans text-zinc-500 dark:text-zinc-400"
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
                        <div key={bIdx} className="text-zinc-800 dark:text-zinc-200 leading-relaxed font-sans text-sm">
                          {renderMarkdown(block.content)}
                        </div>
                      );
                    }
                  })}
                </div>
              ) : (
                <div className="whitespace-pre-wrap font-sans text-white">{msg.text}</div>
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
                    <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-855 bg-black/5 dark:bg-black/20">
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
                        <div className="text-[9px] text-zinc-555 truncate">ID: {msg.attachment.id.substring(0, 8)}...</div>
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
  );
}
