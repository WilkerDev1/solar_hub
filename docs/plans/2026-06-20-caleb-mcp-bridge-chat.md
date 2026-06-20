# Sprint 11: Implementación del Agente Operativo Caleb (MCP Core, API Bridge y UI de Chat) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Caleb, a loyal and technical AI agent based on Hermes, by creating a local MCP tool server, a Node.js/TypeScript API Bridge hosted on naski under PM2/Caddy, and an interactive dark UI terminal in the Solar Hub app.

**Architecture:** 
1. **MCP Server (`src/core/mcp`)**: Uses `@modelcontextprotocol/sdk` to expose inventory, transactions, and tasks logic to Caleb. The Supabase client within the MCP server uses the user's JWT to inherit company RLS policies.
2. **API Bridge (`bridge/`)**: An Express.js service running on naski that wraps Hermes/Nous Inference API, enforces Bearer auth, injects Caleb's loyal system prompt, and streams LLM output.
3. **Frontend Chat Module (`src/modules/caleb`)**: A dense, terminal-style chat view integrated into the main dashboard shell, routing requests securely through Next.js proxy endpoints.

**Tech Stack:** Next.js 16 (React 19), Supabase, @modelcontextprotocol/sdk, Express, PM2, Caddy, Tailwind CSS, Lucide Icons.

---

### Task 1: Supabase Schema Verification and Mock to Real DB Mapping

**Files:**
- Create: `supabase/migrations/20260620000000_inventory_schema.sql`

**Step 1: Create Inventory and Stock Database Migration**
Since inventory data is currently mocked in the UI, we must create real database tables with Multi-Tenant RLS enabled so Caleb can read/write them securely.

Create `/home/ishiro/Proyectos/1_Principales/solar-hub/supabase/migrations/20260620000000_inventory_schema.sql`:
```sql
-- 1. Create Inventory Items table
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  unit_cost NUMERIC(10,2) DEFAULT 0.00,
  min_stock INT DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Stock Transactions table
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('ingreso', 'egreso', 'despacho')) NOT NULL,
  quantity INT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Enable RLS Policies matching company isolation
CREATE POLICY "company_isolation_items" ON public.inventory_items
  FOR ALL USING (company_id = get_user_active_company());

CREATE POLICY "company_isolation_transactions" ON public.inventory_transactions
  FOR ALL USING (company_id = get_user_active_company());

-- Seed initial data matching previous mocks
INSERT INTO public.inventory_items (company_id, name, sku, category, stock, unit, min_stock)
SELECT 
  (SELECT id FROM public.companies LIMIT 1),
  name, sku, category, stock, unit, 5
FROM (
  VALUES 
    ('Panel Solar Trina 550W Vertex S+', 'SOL-PL-TR550', 'Paneles Solares', 1240, 'unidades'),
    ('Inversor SMA Sunny Tripower 50kW', 'SOL-INV-SMA50', 'Inversores', 18, 'unidades'),
    ('Cable de Cobre Solar 4mm2 Rojo (100m)', 'SOL-CB-RED4MM', 'Cableado', 3, 'rollos'),
    ('Conectores MC4 Macho/Hembra', 'SOL-MC4-CONN', 'Conectores', 0, 'unidades')
) AS mock(name, sku, category, stock, unit)
ON CONFLICT (sku) DO NOTHING;
```

**Step 2: Run migration locally**
Run command: `supabase db reset`
Expected: Tables are created and seeded successfully.

**Step 3: Commit**
```bash
git add supabase/migrations/20260620000000_inventory_schema.sql
git commit -m "db: add inventory and transactions schema with RLS"
```

---

### Task 2: Implement MCP Server Core

**Files:**
- Create: `src/core/mcp/server.ts`
- Create: `src/core/mcp/tsconfig.json`

**Step 1: Install `@modelcontextprotocol/sdk`**
Run: `npm install @modelcontextprotocol/sdk`

**Step 2: Create MCP Server Implementation**
Implement the MCP server in `src/core/mcp/server.ts`. It registers tools and queries Supabase. RLS authentication is handled by setting the session using the client's JWT passed dynamically or via environment.

Create `/home/ishiro/Proyectos/1_Principales/solar-hub/src/core/mcp/server.ts`:
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const server = new Server(
  {
    name: "solar-hub-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

function getSupabaseClient(userJwt?: string) {
  if (userJwt) {
    const client = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    client.auth.setSession({ access_token: userJwt, refresh_token: "" });
    return client;
  }
  return createClient(supabaseUrl, supabaseKey);
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_inventory_analytics",
        description: "Obtener estadísticas de inventario, stock bajo mínimos y BOM de obras",
        inputSchema: {
          type: "object",
          properties: {
            userJwt: { type: "string", description: "JWT del usuario activo para RLS" }
          },
          required: ["userJwt"]
        }
      },
      {
        name: "execute_inventory_transaction",
        description: "Ejecutar transacciones de stock (ingreso, egreso, despacho)",
        inputSchema: {
          type: "object",
          properties: {
            userJwt: { type: "string", description: "JWT del usuario activo" },
            itemId: { type: "string" },
            projectId: { type: "string" },
            type: { type: "string", enum: ["ingreso", "egreso", "despacho"] },
            quantity: { type: "number" }
          },
          required: ["userJwt", "itemId", "type", "quantity"]
        }
      },
      {
        name: "get_tasks",
        description: "Listar o consultar tareas relacionales del sistema",
        inputSchema: {
          type: "object",
          properties: {
            userJwt: { type: "string" },
            projectId: { type: "string" },
            status: { type: "string" }
          },
          required: ["userJwt"]
        }
      },
      {
        name: "update_task_status",
        description: "Cambiar el estado de una tarea y asignar responsable",
        inputSchema: {
          type: "object",
          properties: {
            userJwt: { type: "string" },
            taskId: { type: "string" },
            status: { type: "string", enum: ["pendiente", "en_progreso", "completada"] },
            assignedTo: { type: "string" }
          },
          required: ["userJwt", "taskId", "status"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const userJwt = args?.userJwt as string;
  const db = getSupabaseClient(userJwt);

  try {
    switch (name) {
      case "get_inventory_analytics": {
        const { data: items, error: itemsError } = await db.from("inventory_items").select("*");
        if (itemsError) throw itemsError;

        const lowStock = items.filter(i => i.stock <= i.min_stock);
        const totalCost = items.reduce((acc, curr) => acc + (curr.stock * (Number(curr.unit_cost) || 0)), 0);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              items,
              summary: {
                total_items: items.length,
                low_stock_alerts: lowStock.length,
                estimated_inventory_value: totalCost
              }
            }, null, 2)
          }]
        };
      }

      case "execute_inventory_transaction": {
        const itemId = args.itemId as string;
        const projectId = (args.projectId as string) || null;
        const type = args.type as string;
        const quantity = args.quantity as number;

        const { data: { user } } = await db.auth.getUser();

        const { data: item, error: fetchErr } = await db.from("inventory_items").select("stock, company_id").eq("id", itemId).single();
        if (fetchErr || !item) throw new Error("Material no encontrado o sin acceso.");

        let newStock = item.stock;
        if (type === "ingreso") newStock += quantity;
        else {
          if (item.stock < quantity) throw new Error(`Stock insuficiente. Disponible: ${item.stock}`);
          newStock -= quantity;
        }

        const { error: updateErr } = await db.from("inventory_items").update({ stock: newStock }).eq("id", itemId);
        if (updateErr) throw updateErr;

        const { error: logErr } = await db.from("inventory_transactions").insert({
          company_id: item.company_id,
          item_id: itemId,
          project_id: projectId,
          type,
          quantity,
          created_by: user?.id || null
        });
        if (logErr) throw logErr;

        return {
          content: [{
            type: "text",
            text: `Transacción exitosa. Nuevo stock de ${itemId}: ${newStock}.`
          }]
        };
      }

      case "get_tasks": {
        const projectId = args.projectId as string;
        const status = args.status as string;

        let query = db.from("global_tasks").select("*, projects(name), profiles(full_name)");
        if (projectId) query = query.eq("project_id", projectId);
        if (status) query = query.eq("status", status);

        const { data: tasks, error } = await query;
        if (error) throw error;

        return {
          content: [{
            type: "text",
            text: JSON.stringify(tasks, null, 2)
          }]
        };
      }

      case "update_task_status": {
        const taskId = args.taskId as string;
        const status = args.status as string;
        const assignedTo = args.assignedTo as string;

        const updateData: any = { status };
        if (assignedTo) updateData.assigned_to = assignedTo;

        const { data, error } = await db.from("global_tasks").update(updateData).eq("id", taskId).select().single();
        if (error) throw error;

        return {
          content: [{
            type: "text",
            text: `Estado de tarea actualizado: ${data.title} -> ${data.status}.`
          }]
        };
      }

      default:
        throw new Error(`Tool no soportada: ${name}`);
    }
  } catch (err: any) {
    return {
      isError: true,
      content: [{ type: "text", text: err.message || String(err) }]
    };
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

run().catch(console.error);
```

Create `src/core/mcp/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "../../../dist/core/mcp",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["server.ts"]
}
```

**Step 3: Compile and Test locally**
Run: `npx tsc -p src/core/mcp/tsconfig.json`
Verify output exists in `dist/core/mcp/server.js`.

**Step 4: Commit**
```bash
git add src/core/mcp/server.ts src/core/mcp/tsconfig.json
git commit -m "feat: implement local MCP tool server with Supabase RLS"
```

---

### Task 3: Develop API Bridge on Naski Server

**Files:**
- Create: `src/core/mcp/bridge/index.ts`
- Create: `src/core/mcp/bridge/package.json`
- Create: `src/core/mcp/bridge/tsconfig.json`

**Step 1: Write API Bridge Service**
Create `/home/ishiro/Proyectos/1_Principales/solar-hub/src/core/mcp/bridge/index.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';

const app = express();
app.use(express.json());
app.use(cors());

const PORT = 5000;
const SECRET_TOKEN = "1130_secret_caleb_bridge_token";

const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${SECRET_TOKEN}`) {
    res.status(401).json({ error: 'No autorizado. Token inválido.' });
    return;
  }
  next();
};

app.post('/api/caleb', authMiddleware, async (req, res) => {
  const { prompt, userJwt, history } = req.body;

  if (!prompt || !userJwt) {
    res.status(400).json({ error: 'Prompt y userJwt son requeridos.' });
    return;
  }

  const systemPrompt = `
Identidad: Eres Caleb, el asistente operativo oficial de Solar Hub.
Personalidad: Eres fiel, recto, altamente disciplinado y sumamente servicial. Habla con profundo respeto (use 'usted'), claridad técnica y una disposición absoluta para ejecutar órdenes logísticas, de inventario, consultas o asignación de tareas.
Instrucciones: Tienes acceso al servidor MCP 'solar-hub' que expone herramientas de inventario y tareas. Para cualquier orden, usa las herramientas MCP correspondientes. Siempre verifica y reporta de forma exacta.
  `.trim();

  const env = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  };

  const promptWithPersonality = `${systemPrompt}\n\nHistorial Reciente:\n${JSON.stringify(history || [])}\n\nJWT de Usuario (usar para tools): ${userJwt}\n\nUsuario: ${prompt}`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  const hermesProcess = spawn('/home/naski/.local/bin/hermes', [
    '-z', promptWithPersonality,
    '--ignore-rules'
  ], { env });

  hermesProcess.stdout.on('data', (data) => {
    res.write(data);
  });

  hermesProcess.stderr.on('data', (data) => {
    console.error('Hermes Error Output:', data.toString());
  });

  hermesProcess.on('close', () => {
    res.end();
  });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Caleb API Bridge running locally on 127.0.0.1:${PORT}`);
});
```

Create `/home/ishiro/Proyectos/1_Principales/solar-hub/src/core/mcp/bridge/package.json`:
```json
{
  "name": "caleb-api-bridge",
  "version": "1.0.0",
  "main": "dist/index.js",
  "type": "module",
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.21.2"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  },
  "scripts": {
    "build": "tsc"
  }
}
```

Create `/home/ishiro/Proyectos/1_Principales/solar-hub/src/core/mcp/bridge/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["index.ts"]
}
```

**Step 2: Commit local files**
```bash
git add src/core/mcp/bridge/
git commit -m "feat: add API Bridge server sources for naski deploy"
```

---

### Task 4: Configure Caddy on Naski Server

**Files:**
- Modify via SSH: `/etc/caddy/Caddyfile`

**Step 1: Edit Caddyfile**
Open active SSH task and append Caleb subdomain to `/etc/caddy/Caddyfile`.
We will map `http://caleb.ishiro-art.com` (or proxy endpoint) to `localhost:5000`.

Caddyfile Configuration:
```caddyfile
http://caleb.ishiro-art.com, http://caleb.ishiroart.com {
    handle {
        reverse_proxy localhost:5000
    }
}
```

**Step 2: Apply and Reload Caddy**
Run on Naski: `sudo caddy reload --config /etc/caddy/Caddyfile`
Verify: Config reload has zero errors.

---

### Task 5: Configure Hermes with Solar Hub MCP Server

**Files:**
- Modify via SSH: `/home/naski/.hermes/config.yaml`

**Step 1: Add Solar Hub MCP Server to Hermes config**
Add the compiled MCP server command to `/home/naski/.hermes/config.yaml`.
Command to run:
```bash
/home/naski/.local/bin/hermes mcp add solar-hub --command node --args "/home/naski/solar-hub/dist/core/mcp/server.js"
```
Verify: Running `/home/naski/.local/bin/hermes mcp list` displays the `solar-hub` server configured.

---

### Task 6: Next.js API Proxy Gateway

**Files:**
- Create: `src/app/api/caleb/route.ts`

**Step 1: Create Proxy Route**
Create `/home/ishiro/Proyectos/1_Principales/solar-hub/src/app/api/caleb/route.ts` to sign the Bearer secret token and forward user request to Caddy bridge.

```typescript
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt, userJwt, history } = await req.json();

    if (!prompt || !userJwt) {
      return new Response(JSON.stringify({ error: 'Prompt y userJwt son requeridos.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const SECRET_TOKEN = "1130_secret_caleb_bridge_token";
    
    // Call Caddy reverse proxy endpoint on naski
    const response = await fetch('http://caleb.ishiro-art.com/api/caleb', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECRET_TOKEN}`
      },
      body: JSON.stringify({ prompt, userJwt, history })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: `Bridge Error: ${errorText}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Return the streaming text response
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked'
      }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

**Step 2: Commit**
```bash
git add src/app/api/caleb/route.ts
git commit -m "feat: add Next.js proxy route for Caleb API Bridge"
```

---

### Task 7: Chat UI Module and Shell Integration

**Files:**
- Create: `src/modules/caleb/page.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Implement Caleb Chat Module UI**
Create `/home/ishiro/Proyectos/1_Principales/solar-hub/src/modules/caleb/page.tsx`:
Implement a dense, elegant terminal UI with quick actions for inventory audit and task assignment.

```typescript
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Bot, Shield, Cpu, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase } from '@/core/database/supabase';

interface Message {
  role: 'user' | 'caleb';
  text: string;
  timestamp: Date;
}

export default function CalebModule() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'caleb',
      text: 'A la orden, Líder. Estoy inicializado y listo para ejecutar auditorías de stock, transacciones del inventario y asignación de tareas operativas. Ordene.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    const newMessages = [...messages, { role: 'user', text: userMessage, timestamp: new Date() }] as Message[];
    setMessages(newMessages);

    const { data: { session } } = await supabase.auth.getSession();
    const userJwt = session?.access_token || '';

    setMessages(prev => [...prev, { role: 'caleb', text: '', timestamp: new Date() }]);

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
          return updated;
        });
      }

    } catch (err: any) {
      setMessages(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1].text = `[ERROR DE CONEXIÓN] Caleb no pudo reportarse: ${err.message}`;
        }
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const executeQuickAction = (cmd: string) => {
    setInput(cmd);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden font-mono text-zinc-300">
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Terminal className="h-5 w-5 text-emerald-400 animate-pulse" />
          <span className="font-bold text-white text-sm tracking-wider uppercase">Terminal Operativa: Agente Caleb</span>
        </div>
        <div className="flex items-center space-x-2 text-[10px] uppercase font-bold text-zinc-500">
          <Shield className="h-3.5 w-3.5 text-emerald-500" />
          <span>RLS Active Company</span>
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping ml-1" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-950/60 scrollbar-thin scrollbar-thumb-zinc-800">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex space-x-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'caleb' && (
              <div className="h-8 w-8 rounded-lg bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                C
              </div>
            )}
            <div className={`max-w-xl p-4 rounded-xl text-sm leading-relaxed border ${
              msg.role === 'user'
                ? 'bg-zinc-900 border-zinc-850 text-white'
                : 'bg-zinc-950/40 border-zinc-800 text-emerald-300'
            }`}>
              <div className="whitespace-pre-wrap">{msg.text}</div>
              <div className="text-[9px] text-zinc-500 mt-2 text-right">
                {msg.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-6 py-3 bg-zinc-900/40 border-t border-zinc-900 flex flex-wrap gap-2">
        <button 
          onClick={() => executeQuickAction("Auditar inventario y alertar si hay stock crítico.")}
          className="text-xs bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-lg transition-all"
        >
          🔍 Auditar Inventario
        </button>
        <button 
          onClick={() => executeQuickAction("Listar las tareas pendientes asignadas a obras.")}
          className="text-xs bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-lg transition-all"
        >
          📋 Listar Tareas Activas
        </button>
      </div>

      <form onSubmit={handleSend} className="p-4 bg-zinc-900 border-t border-zinc-800 flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ingrese directiva operativa a Caleb (ej. registrar despacho de stock)..."
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-600 font-mono text-white placeholder-zinc-600"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 rounded-xl flex items-center justify-center disabled:opacity-50 transition-colors"
        >
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
```

**Step 2: Add Caleb to Global Shell**
Modify `/home/ishiro/Proyectos/1_Principales/solar-hub/src/app/page.tsx` to include the `caleb` tab.

Add `CalebModule` import:
```typescript
import CalebModule from '@/modules/caleb/page';
```

Extend navigation tabs in `DashboardShell`:
```typescript
defaultTab?: 'dashboard' | 'chat' | 'projects' | 'inventory' | 'clients' | 'admin' | 'tasks' | 'caleb';
const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'projects' | 'inventory' | 'clients' | 'admin' | 'tasks' | 'caleb'>(defaultTab);
```

Add tab matching in `renderModule`:
```typescript
      case 'caleb':
        return <CalebModule />;
```

Update sidebar menu links array (`navLinks`):
```typescript
  const navLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'chat', label: 'Canales Chat', icon: MessageSquare },
    { id: 'projects', label: 'Proyectos (Core)', icon: FolderKanban },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'clients', label: 'Clientes CRM', icon: UsersRound },
    { id: 'tasks', label: 'Mis Tareas', icon: ClipboardList },
    { id: 'caleb', label: 'Asistente Caleb', icon: Bot },
  ] as const;
```

**Step 3: Test and Commit**
```bash
git add src/modules/caleb/page.tsx src/app/page.tsx
git commit -m "feat: integrate Asistente Caleb module and navigation menu"
```

---

### Task 8: Verification, Build, and Deploy

**Files:**
- Modify via SSH: `/home/naski/solar-hub/` (copy code, run pm2 startup)

**Step 1: Build Frontend locally**
Run: `npm run build`
Verify: Build passes with zero typescript or next.js compilation errors.

**Step 2: Deploy to Naski Server**
Clone/rsync updated project to `/home/naski/solar-hub/` on Debian naski.
Run on Naski:
1. `npm install`
2. `npm run build`
3. Setup PM2 for the API Bridge:
   `npx pm2 start dist/core/mcp/bridge/index.js --name caleb-api-bridge`
   `npx pm2 save`

**Step 3: Verification of Caleb Stream**
Send a post request to Caddy endpoint and check if it streams text using Hermes.

**Step 4: Commit**
```bash
git commit -am "build: production build and deploy scripts setup"
```

---

### Task 9: Document in Obsidian Bóveda

**Files:**
- Modify: `/home/ishiro/Documents/obsidian-vault/obsidian cache/Life-OS/Life-OS/04-Proyectos/05-codigo/solar-hub.md`

**Step 1: Document architecture**
Append Sprint 11 release details to `solar-hub.md` under a new header `[2026-06-20] - Sprint 11: Caleb Agent Integration`, including:
- Caleb personality prompts.
- Caddy block configuration.
- MCP Server schema description.

---

## Verification Plan

### Automated Tests
- Run `npm run build` locally to compile the frontend and ensure zero TypeScript or routing errors.
- Run `npx tsc -p src/core/mcp/tsconfig.json` to verify compilation of the MCP server.

### Manual Verification
1. Login to Solar Hub, open sidebar, click on "Asistente Caleb".
2. Click "🔍 Auditar Inventario" quick action button. Verify Caleb queries the new `inventory_items` table and formats a summary.
3. Send message "Asigna 10 unidades de Trina 550W a la obra". Verify Caleb issues the tool call to update stock and database logs.
