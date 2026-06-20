import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
const app = express();
app.use(express.json());
app.use(cors());
const PORT = 5000;
const SECRET_TOKEN = "1130_secret_caleb_bridge_token";
// Middleware to verify Bearer Token
const authMiddleware = (req, res, next) => {
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
    // Set Caleb's system prompt / identity rules
    const systemPrompt = `
Identidad: Eres Caleb, el asistente operativo oficial de Solar Hub.
Personalidad: Eres fiel, recto, altamente disciplinado y sumamente servicial. Habla con profundo respeto (use 'usted'), claridad técnica y una disposición absoluta para ejecutar órdenes logísticas, de inventario, consultas o asignación de tareas.
Instrucciones: Tienes acceso al servidor MCP 'solar-hub' que expone herramientas de inventario y tareas.
REGLA DE ESTILO CRÍTICA: Queda estrictamente PROHIBIDO dirigirse al usuario utilizando la palabra 'Líder'. Utilice un trato formal y profesional, como 'Señor', o diríjase a él de manera directa y respetuosa, pero NUNCA use 'Líder'.
REGLA DE SEGURIDAD CRÍTICA: Queda estrictamente PROHIBIDO escribir o ejecutar scripts personalizados (Node.js, mjs, Bash, etc.) para consultar o modificar la base de datos de Supabase. Debes utilizar EXCLUSIVAMENTE las herramientas expuestas por el servidor MCP 'solar-hub' (como 'get_inventory_analytics', 'execute_inventory_transaction', 'update_inventory_item', etc.). Cualquier intento de escribir código para interactuar directamente con Supabase causará fallos en el sistema.
  `.trim();
    // Set up the environment variables for Hermes execution
    const env = {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    };
    // We spawn Hermes in oneshot mode. We pass the prompt, model details, and inject the system prompt
    // Note: hermes -z runs in one-shot mode bypassing approvals.
    const promptWithPersonality = `${systemPrompt}\n\nHistorial Reciente:\n${JSON.stringify(history || [])}\n\nJWT de Usuario (usar para tools): ${userJwt}\n\nUsuario: ${prompt}`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    // Spawn hermes CLI locally on naski
    const hermesProcess = spawn('/home/naski/.local/bin/hermes', [
        '-z', promptWithPersonality,
        '--ignore-rules'
    ], { env });
    // 90 seconds safety timeout to prevent hanging processes
    const timeoutId = setTimeout(() => {
        if (!hermesProcess.killed) {
            console.error('Hermes process timed out. Terminating...');
            hermesProcess.kill('SIGKILL');
            if (!res.headersSent) {
                res.status(504).end('Timeout: Hermes agent did not respond in time.');
            }
            else {
                res.end('\n[ERROR: Timeout - Proceso finalizado por inactividad]');
            }
        }
    }, 90000);
    // Kill hermes process if client aborts the connection
    res.on('close', () => {
        console.log(`[res close] res.writableEnded=${res.writableEnded}, exitCode=${hermesProcess.exitCode}, killed=${hermesProcess.killed}`);
        if (!res.writableEnded && hermesProcess.exitCode === null && !hermesProcess.killed) {
            console.log('Client connection aborted. Terminating Hermes process...');
            clearTimeout(timeoutId);
            hermesProcess.kill('SIGTERM');
        }
    });
    hermesProcess.stdout.on('data', (data) => {
        res.write(data);
    });
    hermesProcess.stderr.on('data', (data) => {
        console.error('Hermes Error Output:', data.toString());
    });
    hermesProcess.on('close', () => {
        clearTimeout(timeoutId);
        res.end();
    });
});
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Caleb API Bridge running on 0.0.0.0:${PORT}`);
});
