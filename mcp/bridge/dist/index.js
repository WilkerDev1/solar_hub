import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load .env relative to the compiled file
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const app = express();
app.use(express.json());
app.use(cors());
const PORT = 5000;
const SECRET_TOKEN = "1130_secret_caleb_bridge_token";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
// Multer in-memory storage configuration
const upload = multer({ storage: multer.memoryStorage() });
// Middleware to verify Bearer Token
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${SECRET_TOKEN}`) {
        res.status(401).json({ error: 'No autorizado. Token inválido.' });
        return;
    }
    next();
};
// Helper to get authenticated client inheriting RLS
function getUserClient(userJwt) {
    return createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
            headers: {
                Authorization: `Bearer ${userJwt}`,
            },
        },
    });
}
// -------------------------------------------------------------
// CALEB IA CHAT GATEWAY
// -------------------------------------------------------------
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
REGLA DE SEGURIDAD CRÍTICA: Queda estrictamente PROHIBIDO escribir o ejecutar scripts personalizados (Node.js, mjs, Bash, etc.) para consultar o modificar la base de datos de Supabase. Debes utilizar EXCLUSIVELY las herramientas expuestas por el servidor MCP 'solar-hub' (como 'get_inventory_analytics', 'execute_inventory_transaction', 'update_inventory_item', etc.). Cualquier intento de escribir código para interactuar directamente con Supabase causará fallos en el sistema.
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
// -------------------------------------------------------------
// SECURE HYBRID STORAGE ROUTER
// -------------------------------------------------------------
// POST /api/storage/upload - Upload binary files to Naski local directory
app.post('/api/storage/upload', authMiddleware, upload.single('file'), async (req, res) => {
    const userJwt = req.headers['x-user-jwt'] || req.body.userJwt;
    const { projectId, department, inventoryItemId, folderId, taskId } = req.body;
    if (!req.file) {
        res.status(400).json({ error: 'Se requiere un archivo para la carga.' });
        return;
    }
    if (!userJwt) {
        res.status(400).json({ error: 'Se requiere el JWT del usuario para autenticación.' });
        return;
    }
    try {
        const userClient = getUserClient(userJwt);
        // Verify user JWT token and extract company ID
        const { data: { user }, error: userError } = await userClient.auth.getUser();
        if (userError || !user) {
            res.status(401).json({ error: 'Token de sesión inválido o expirado.' });
            return;
        }
        const { data: profile, error: profileError } = await userClient
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .single();
        if (profileError || !profile) {
            res.status(400).json({ error: 'No se pudo resolver la compañía activa del perfil.' });
            return;
        }
        const companyId = profile.company_id;
        // Build physical file structure
        let targetDir = `/var/lib/solar-hub-storage/tenants/${companyId}`;
        if (projectId) {
            const deptFolder = department ? department.trim().toLowerCase() : 'general';
            targetDir = path.join(targetDir, 'projects', projectId, deptFolder);
        }
        else if (inventoryItemId) {
            targetDir = path.join(targetDir, 'inventory', inventoryItemId);
        }
        else if (department) {
            targetDir = path.join(targetDir, department.trim().toLowerCase());
        }
        else {
            targetDir = path.join(targetDir, 'general');
        }
        // Recursively create target folder
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        // Generate unique name for file to avoid collisions
        const fileExt = path.extname(req.file.originalname);
        const uniqueFilename = `${crypto.randomUUID()}${fileExt}`;
        const physicalPath = path.join(targetDir, uniqueFilename);
        // Write file binary buffer to disk
        fs.writeFileSync(physicalPath, req.file.buffer);
        // Manage folders table indexation
        let resolvedFolderId = null;
        if (folderId) {
            resolvedFolderId = folderId;
        }
        else {
            // Find or create default folder node
            const folderName = inventoryItemId
                ? `Inventario - ${inventoryItemId}`
                : (department || 'General');
            const { data: existingFolder } = await userClient
                .from('folders')
                .select('id')
                .eq('company_id', companyId)
                .eq('name', folderName)
                .eq('project_id', projectId || null)
                .limit(1)
                .maybeSingle();
            if (existingFolder) {
                resolvedFolderId = existingFolder.id;
            }
            else {
                const { data: newFolder, error: folderCreateErr } = await userClient
                    .from('folders')
                    .insert({
                    company_id: companyId,
                    name: folderName,
                    project_id: projectId || null,
                    department_id: department || null
                })
                    .select('id')
                    .single();
                if (!folderCreateErr && newFolder) {
                    resolvedFolderId = newFolder.id;
                }
            }
        }
        // Insert metadata record in Supabase
        const { data: newDoc, error: docError } = await userClient
            .from('documents')
            .insert({
            company_id: companyId,
            folder_id: resolvedFolderId,
            name: req.file.originalname,
            physical_path: physicalPath,
            file_size: req.file.size,
            mime_type: req.file.mimetype,
            uploaded_by: user.id,
            task_id: taskId || null
        })
            .select()
            .single();
        if (docError) {
            // Unlink physical file if DB insert fails
            if (fs.existsSync(physicalPath)) {
                fs.unlinkSync(physicalPath);
            }
            res.status(500).json({ error: 'Error al registrar el metadato en Supabase: ' + docError.message });
            return;
        }
        res.status(200).json({ success: true, document: newDoc });
    }
    catch (err) {
        res.status(500).json({ error: 'Error al procesar la subida de archivo: ' + err.message });
    }
});
// GET /api/storage/file/:document_id - Stream binary file safely
app.get('/api/storage/file/:document_id', authMiddleware, async (req, res) => {
    const { document_id } = req.params;
    const userJwt = req.headers['x-user-jwt'] || req.query.token;
    if (!userJwt) {
        res.status(400).json({ error: 'Se requiere el token JWT del usuario para autenticación.' });
        return;
    }
    try {
        const userClient = getUserClient(userJwt);
        // Verify user JWT token and extract company ID
        const { data: { user }, error: userError } = await userClient.auth.getUser();
        if (userError || !user) {
            res.status(401).json({ error: 'Token de sesión inválido o expirado.' });
            return;
        }
        const { data: profile, error: profileError } = await userClient
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .single();
        if (profileError || !profile) {
            res.status(400).json({ error: 'No se pudo resolver la compañía activa del perfil.' });
            return;
        }
        // Retrieve document metadata from Supabase
        const { data: doc, error: docError } = await userClient
            .from('documents')
            .select('*')
            .eq('id', document_id)
            .single();
        if (docError || !doc) {
            res.status(404).json({ error: 'Documento no encontrado o no tiene privilegios de lectura.' });
            return;
        }
        // Double check company RLS isolation
        if (doc.company_id !== profile.company_id) {
            res.status(403).json({ error: 'Acceso denegado. El documento pertenece a otra organización.' });
            return;
        }
        // Verify physical file exists on disk
        if (!fs.existsSync(doc.physical_path)) {
            res.status(404).json({ error: 'El archivo binario no existe físicamente en el servidor.' });
            return;
        }
        // Stream the file back
        res.sendFile(doc.physical_path, {
            headers: {
                'Content-Type': doc.mime_type,
                'Content-Disposition': `inline; filename="${encodeURIComponent(doc.name)}"`
            }
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Error al procesar la descarga de archivo: ' + err.message });
    }
});
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Caleb API Bridge running on 0.0.0.0:${PORT}`);
});
