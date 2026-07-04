import React from 'react';
import { Brain, Terminal } from 'lucide-react';

export interface ParsedBlock {
  type: 'text' | 'thought' | 'tool';
  content: string;
}

// Extract markdown images: ![alt](url)
export const extractMarkdownImages = (text: string): { alt: string; url: string }[] => {
  if (!text) return [];
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

// Extract markdown files: [name](url) (not starting with !)
export const extractMarkdownFiles = (text: string): { name: string; url: string; id: string }[] => {
  if (!text) return [];
  const regex = /(!)?\[([^\]]*)\]\(([^)]*)\)/gi;
  const files: { name: string; url: string; id: string }[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const isImage = !!match[1];
    const url = match[3] || '';
    const fileIdMatch = url.match(/\/api\/storage\/file\/([a-f0-9\-]+)/i);
    if (!isImage && fileIdMatch) {
      files.push({
        name: match[2] || 'Archivo',
        url: url,
        id: fileIdMatch[1]
      });
    }
  }
  return files;
};

export const isImageFile = (name: string): boolean => {
  const ext = name.split('.').pop()?.toLowerCase();
  return !!ext && ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext);
};

// Splits response into internal thought blocks (<thought>...</thought>), tool calls, and standard content text
export const parseCalebMessage = (text: string): ParsedBlock[] => {
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

  // Further split text blocks to pull tool calls
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

// Inline markdown elements renderer: **bold** | *italic* | `code`
export const renderInline = (text: string): React.ReactNode => {
  const parts: React.ReactNode[] = [];
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

// Block markdown renderer
export const renderMarkdown = (text: string): React.ReactNode => {
  const lines = text.split('\n');
  const output: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      output.push(<div key={i} className="h-2" />);
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      output.push(
        <h3 key={i} className="text-sm font-bold text-zinc-100 mt-3 mb-1">
          {renderInline(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      output.push(
        <h2 key={i} className="text-sm font-bold text-zinc-100 mt-4 mb-1">
          {renderInline(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      output.push(
        <h1 key={i} className="text-base font-bold text-zinc-100 mt-4 mb-2">
          {renderInline(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    const orderedMatch = line.match(/^(\d+)\. (.*)/);
    if (orderedMatch) {
      const listItems: React.ReactNode[] = [];
      let n = parseInt(orderedMatch[1], 10);
      while (i < lines.length) {
        const om = lines[i].match(/^(\d+)\. (.*)/);
        if (!om) break;
        listItems.push(
          <li key={i} className="ml-4 list-decimal text-zinc-200">
            {renderInline(om[2])}
          </li>
        );
        i++;
        n++;
      }
      output.push(
        <ol key={`ol-${i}`} className="space-y-0.5 my-1">
          {listItems}
        </ol>
      );
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        listItems.push(
          <li key={i} className="ml-4 list-disc text-zinc-255">
            {renderInline(lines[i].slice(2))}
          </li>
        );
        i++;
      }
      output.push(
        <ul key={`ul-${i}`} className="space-y-0.5 my-1">
          {listItems}
        </ul>
      );
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      output.push(<hr key={i} className="border-zinc-700 my-3" />);
      i++;
      continue;
    }

    output.push(
      <p key={i} className="leading-relaxed text-zinc-200">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <>{output}</>;
};
