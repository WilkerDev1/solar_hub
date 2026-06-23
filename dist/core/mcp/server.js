"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const supabase_js_1 = require("@supabase/supabase-js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const child_process_1 = require("child_process");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const server = new index_js_1.Server({
    name: "solar-hub-mcp",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// Helper to get authenticated client inheriting RLS
async function getSupabaseClient(userJwt) {
    if (userJwt) {
        const client = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey || supabaseKey, {
            auth: { persistSession: false, autoRefreshToken: false },
            global: {
                headers: {
                    Authorization: `Bearer ${userJwt}`,
                },
            },
        });
        return client;
    }
    return (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
}
// Sanitizes folder/file names to make them safe as directory names on Unix/Windows
function sanitizePathSegment(name) {
    return name.replace(/[\\\/\?\*\:\|\"<>]/g, '_').trim();
}
// Formats department names nicely for the Supabase folders UI
function formatDeptName(dept) {
    if (!dept)
        return 'General';
    const trimmed = dept.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}
// Traverses up from folderId using parent_id to build the physical path segments
async function getPhysicalPathForFolder(client, folderId, companyId) {
    const segments = [];
    let currentId = folderId;
    while (currentId) {
        const response = await client
            .from('folders')
            .select('name, parent_id')
            .eq('id', currentId)
            .eq('company_id', companyId)
            .limit(1)
            .maybeSingle();
        if (response.error || !response.data)
            break;
        const folder = response.data;
        segments.unshift(folder.name);
        currentId = folder.parent_id;
    }
    return segments;
}
function getMimeType(filename) {
    const ext = path_1.default.extname(filename).toLowerCase();
    if (ext === '.csv')
        return 'text/csv';
    if (ext === '.txt')
        return 'text/plain';
    if (ext === '.json')
        return 'application/json';
    if (ext === '.md')
        return 'text/markdown';
    if (ext === '.html')
        return 'text/html';
    if (ext === '.pdf')
        return 'application/pdf';
    return 'application/octet-stream';
}
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "get_inventory_analytics",
                description: "Obtener estadísticas de inventario, stock bajo mínimos y valor total de inventario",
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
                description: "Ejecutar transacciones de stock (entrada, salida, ajuste, despacho a proyecto)",
                inputSchema: {
                    type: "object",
                    properties: {
                        userJwt: { type: "string", description: "JWT del usuario activo" },
                        itemId: { type: "string", description: "UUID del material en inventario" },
                        projectId: { type: "string", description: "UUID del proyecto (solo para despachos/salidas)" },
                        type: { type: "string", enum: ["entrada", "salida", "ajuste"], description: "Tipo de transacción" },
                        quantity: { type: "number", description: "Cantidad (debe ser positiva, la función RPC la ajusta)" },
                        reason: { type: "string", description: "Motivo del movimiento de stock" }
                    },
                    required: ["userJwt", "itemId", "type", "quantity", "reason"]
                }
            },
            {
                name: "get_tasks",
                description: "Listar o consultar tareas globales con detalles de proyectos y responsables",
                inputSchema: {
                    type: "object",
                    properties: {
                        userJwt: { type: "string", description: "JWT del usuario activo" },
                        projectId: { type: "string", description: "Filtrar por proyecto (UUID)" },
                        status: { type: "string", description: "Filtrar por estado (pendiente, en_progreso, completada)" }
                    },
                    required: ["userJwt"]
                }
            },
            {
                name: "create_task",
                description: "Crear una nueva tarea en el sistema",
                inputSchema: {
                    type: "object",
                    properties: {
                        userJwt: { type: "string", description: "JWT del usuario activo" },
                        title: { type: "string", description: "Título de la tarea" },
                        description: { type: "string", description: "Descripción detallada de la tarea (opcional)" },
                        projectId: { type: "string", description: "UUID de la obra/proyecto asociado (opcional)" },
                        assignedTo: { type: "string", description: "UUID del responsable asignado (opcional, por defecto el creador)" },
                        priority: { type: "string", enum: ["baja", "media", "alta"], description: "Prioridad (opcional, por defecto 'baja')" },
                        dueDate: { type: "string", description: "Fecha de vencimiento en formato ISO (opcional)" },
                        requiresAudit: { type: "boolean", description: "Indica si requiere aprobación antes de marcarse como completada (opcional)" },
                        area: { type: "string", enum: ["legal", "almacen", "operaciones", "administracion", "general"], description: "Área operativa de la tarea (opcional)" }
                    },
                    required: ["userJwt", "title"]
                }
            },
            {
                name: "update_task",
                description: "Actualizar o editar campos de una tarea existente (incluyendo estado, asignación y auditoría)",
                inputSchema: {
                    type: "object",
                    properties: {
                        userJwt: { type: "string", description: "JWT del usuario activo" },
                        taskId: { type: "string", description: "UUID de la tarea a actualizar" },
                        title: { type: "string", description: "Nuevo título (opcional)" },
                        description: { type: "string", description: "Nueva descripción (opcional)" },
                        assignedTo: { type: "string", description: "UUID del nuevo responsable asignado (opcional)" },
                        priority: { type: "string", enum: ["baja", "media", "alta"], description: "Nueva prioridad (opcional)" },
                        dueDate: { type: "string", description: "Nueva fecha de vencimiento ISO (opcional)" },
                        status: { type: "string", enum: ["pendiente", "en_progreso", "completada"], description: "Nuevo estado de la tarea (opcional)" },
                        requiresAudit: { type: "boolean", description: "Modificar si requiere auditoría (opcional)" },
                        completedOnBehalfOf: { type: "string", description: "Nombre de la persona en la empresa a nombre de quien Caleb marca completada la tarea (opcional)" }
                    },
                    required: ["userJwt", "taskId"]
                }
            },
            {
                name: "delete_task",
                description: "Eliminar una tarea del sistema",
                inputSchema: {
                    type: "object",
                    properties: {
                        userJwt: { type: "string", description: "JWT del usuario activo" },
                        taskId: { type: "string", description: "UUID de la tarea a eliminar" }
                    },
                    required: ["userJwt", "taskId"]
                }
            },
            {
                name: "get_projects",
                description: "Listar los proyectos activos en la empresa",
                inputSchema: {
                    type: "object",
                    properties: {
                        userJwt: { type: "string", description: "JWT del usuario activo" }
                    },
                    required: ["userJwt"]
                }
            },
            {
                name: "get_project_details",
                description: "Obtener información completa de un proyecto por su UUID: fase, tareas, materiales requeridos (BOM) e historial de mensajes de chat de la obra",
                inputSchema: {
                    type: "object",
                    properties: {
                        userJwt: { type: "string", description: "JWT del usuario activo" },
                        projectId: { type: "string", description: "UUID de la obra/proyecto" }
                    },
                    required: ["userJwt", "projectId"]
                }
            },
            {
                name: "request_project_materials",
                description: "Registrar una solicitud o requerimiento de material para un proyecto (añade/actualiza la cantidad requerida en la BOM de la obra)",
                inputSchema: {
                    type: "object",
                    properties: {
                        userJwt: { type: "string", description: "JWT del usuario activo" },
                        projectId: { type: "string", description: "UUID del proyecto" },
                        itemId: { type: "string", description: "UUID del material/ítem del inventario" },
                        requiredQuantity: { type: "number", description: "Cantidad total requerida del material" }
                    },
                    required: ["userJwt", "projectId", "itemId", "requiredQuantity"]
                }
            },
            {
                name: "update_inventory_item",
                description: "Modificar/editar los detalles y metadatos de un material en el inventario general",
                inputSchema: {
                    type: "object",
                    properties: {
                        userJwt: { type: "string", description: "JWT del usuario activo" },
                        itemId: { type: "string", description: "UUID del material/ítem a editar" },
                        name: { type: "string", description: "Nuevo nombre del material (opcional)" },
                        sku: { type: "string", description: "Nuevo código SKU único (opcional)" },
                        categoryId: { type: "string", description: "Nuevo UUID de la categoría (opcional)" },
                        description: { type: "string", description: "Nueva descripción del material (opcional)" },
                        providers: { type: "array", items: { type: "string" }, description: "Nueva lista de proveedores (opcional)" },
                        tags: { type: "array", items: { type: "string" }, description: "Nueva lista de etiquetas (opcional)" },
                        cost: { type: "number", description: "Nuevo costo de reposición (opcional)" },
                        unit: { type: "string", description: "Nueva unidad de medida (opcional)" },
                        packaging: { type: "string", description: "Nuevo tipo de empaque (opcional)" },
                        length: { type: "number", description: "Nueva longitud (opcional)" },
                        weight: { type: "number", description: "Nuevo peso (opcional)" },
                        minStock: { type: "number", description: "Nuevo stock mínimo para alertas críticas (opcional)" },
                        stock: { type: "number", description: "Nuevo stock físico disponible (opcional)" }
                    },
                    required: ["userJwt", "itemId"]
                }
            },
            {
                name: "read_document_content",
                description: "Leer el contenido de un archivo/documento en Naski utilizando su UUID. Soporta archivos de texto plano (.txt, .csv, .json, .md, etc.) y documentos PDF.",
                inputSchema: {
                    type: "object",
                    properties: {
                        userJwt: { type: "string", description: "JWT del usuario activo para RLS" },
                        documentId: { type: "string", description: "UUID del documento a leer" }
                    },
                    required: ["userJwt", "documentId"]
                }
            },
            {
                name: "write_document_file",
                description: "Crear un nuevo documento/archivo físico en Naski y registrar sus metadatos en Supabase. Útil para guardar reportes, listas de materiales, etc.",
                inputSchema: {
                    type: "object",
                    properties: {
                        userJwt: { type: "string", description: "JWT del usuario activo" },
                        name: { type: "string", description: "Nombre del archivo a crear (ej: reporte_bom.csv)" },
                        content: { type: "string", description: "Contenido textual a escribir en el archivo" },
                        projectId: { type: "string", description: "UUID de la obra/proyecto asociado (opcional)" },
                        department: { type: "string", description: "Departamento/Área operativa (opcional)" }
                    },
                    required: ["userJwt", "name", "content"]
                }
            },
            {
                name: "list_project_documents",
                description: "Listar carpetas y documentos asociados a un proyecto o dentro de una carpeta específica. Útil para navegar y explorar la base de datos de archivos.",
                inputSchema: {
                    type: "object",
                    properties: {
                        userJwt: { type: "string", description: "JWT del usuario activo" },
                        projectId: { type: "string", description: "UUID del proyecto/obra (opcional)" },
                        folderId: { type: "string", description: "UUID de la carpeta específica (opcional)" }
                    },
                    required: ["userJwt"]
                }
            },
            {
                name: "search_documents",
                description: "Buscar documentos en el sistema por coincidencia de nombre.",
                inputSchema: {
                    type: "object",
                    properties: {
                        userJwt: { type: "string", description: "JWT del usuario activo" },
                        query: { type: "string", description: "Texto a buscar en el nombre del archivo (búsqueda parcial insensible a mayúsculas)" }
                    },
                    required: ["userJwt", "query"]
                }
            }
        ]
    };
});
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = (request.params.arguments || {});
    const userJwt = args.userJwt;
    const db = await getSupabaseClient(userJwt);
    try {
        switch (name) {
            case "get_inventory_analytics": {
                const { data: items, error: itemsError } = await db.from("inventory_items").select("*");
                if (itemsError)
                    throw itemsError;
                const lowStock = items.filter(i => i.stock <= i.min_stock);
                const totalCost = items.reduce((acc, curr) => acc + (curr.stock * (Number(curr.cost) || 0)), 0);
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
                const itemId = args.itemId;
                const projectId = args.projectId || null;
                const type = args.type;
                const quantity = args.quantity;
                const reason = args.reason;
                if (projectId && type === "salida") {
                    // Dispatch to project using the atomic RPC function
                    const { error: dispatchErr } = await db.rpc("dispatch_material_to_project", {
                        proj_id: projectId,
                        it_id: itemId,
                        qty: quantity,
                        reason: reason
                    });
                    if (dispatchErr)
                        throw dispatchErr;
                    return {
                        content: [{
                                type: "text",
                                text: `Despacho exitoso. Asignado ${quantity} unidades a la obra (${projectId}).`
                            }]
                    };
                }
                else {
                    // General stock adjustment (entrada / ajuste / salida sin obra)
                    // Compute sign (+ for entrada, - for salida)
                    const multiplier = type === "salida" ? -1 : 1;
                    const signedQty = quantity * multiplier;
                    const adjustments = [{
                            item_id: itemId,
                            quantity: signedQty,
                            transaction_type: type,
                            reason: reason
                        }];
                    const { error: rpcErr } = await db.rpc("process_inventory_transactions", {
                        adjustments: adjustments
                    });
                    if (rpcErr)
                        throw rpcErr;
                    return {
                        content: [{
                                type: "text",
                                text: `Transacción de inventario registrada con éxito (${type}): ${quantity} unidades.`
                            }]
                    };
                }
            }
            case "get_tasks": {
                const projectId = args.projectId;
                const status = args.status;
                let query = db.from("global_tasks").select("*, projects(name), profiles(full_name)");
                if (projectId)
                    query = query.eq("project_id", projectId);
                if (status)
                    query = query.eq("status", status);
                const { data: tasks, error } = await query;
                if (error)
                    throw error;
                return {
                    content: [{
                            type: "text",
                            text: JSON.stringify(tasks, null, 2)
                        }]
                };
            }
            case "create_task": {
                const title = args.title;
                const description = args.description || null;
                const projectId = args.projectId || null;
                const assignedTo = args.assignedTo || null;
                const priority = args.priority || "baja";
                const dueDate = args.dueDate || null;
                const requiresAudit = args.requiresAudit || false;
                const area = args.area || "general";
                const { data: { user }, error: userError } = await db.auth.getUser(userJwt);
                if (userError || !user)
                    throw new Error("No se pudo obtener el usuario del token JWT.");
                const { data: profile } = await db
                    .from("profiles")
                    .select("company_id, full_name, email")
                    .eq("id", user.id)
                    .single();
                if (!profile || !profile.company_id)
                    throw new Error("No se encontró la empresa del usuario.");
                const creatorName = profile.full_name || profile.email || "Usuario";
                const creationActivity = {
                    id: Math.random().toString(36).substring(2),
                    profile_id: user.id,
                    user_name: `Caleb (IA)`,
                    action: "Creación de Tarea",
                    details: `Caleb (IA) creó la tarea "${title}" a petición de ${creatorName}`,
                    created_at: new Date().toISOString()
                };
                const assignedUser = assignedTo || user.id;
                const newTask = {
                    company_id: profile.company_id,
                    created_by: user.id,
                    title,
                    description,
                    origin: "consulta",
                    task_type: "check",
                    assigned_to: assignedUser,
                    assigned_to_ids: [assignedUser],
                    project_id: projectId,
                    area,
                    status: "pendiente",
                    audit_status: "pendiente",
                    requires_audit: requiresAudit,
                    priority,
                    due_date: dueDate,
                    tags: [],
                    subtasks: [],
                    task_materials: [],
                    task_comments: [],
                    task_activities: [creationActivity],
                };
                const { data, error } = await db
                    .from("global_tasks")
                    .insert(newTask)
                    .select()
                    .single();
                if (error)
                    throw error;
                return {
                    content: [{
                            type: "text",
                            text: `Tarea "${data.title}" creada exitosamente con ID: ${data.id}.`
                        }]
                };
            }
            case "update_task": {
                const taskId = args.taskId;
                const completedOnBehalfOf = args.completedOnBehalfOf;
                const { data: { user }, error: userError } = await db.auth.getUser(userJwt);
                if (userError || !user)
                    throw new Error("No se pudo obtener el usuario del token JWT.");
                const { data: currentTask, error: getTaskErr } = await db
                    .from("global_tasks")
                    .select("task_activities, status, title, assigned_to, priority, description, due_date, requires_audit")
                    .eq("id", taskId)
                    .single();
                if (getTaskErr || !currentTask) {
                    throw new Error(`No se encontró la tarea con ID: ${taskId}`);
                }
                const nextActivities = Array.isArray(currentTask.task_activities) ? [...currentTask.task_activities] : [];
                const changes = [];
                const updateFields = {};
                if (args.title !== undefined) {
                    updateFields.title = args.title;
                    if (args.title !== currentTask.title) {
                        changes.push(`título a "${args.title}"`);
                    }
                }
                if (args.description !== undefined) {
                    updateFields.description = args.description;
                    if (args.description !== currentTask.description) {
                        changes.push(`descripción`);
                    }
                }
                if (args.assignedTo !== undefined) {
                    updateFields.assigned_to = args.assignedTo;
                    updateFields.assigned_to_ids = [args.assignedTo];
                    if (args.assignedTo !== currentTask.assigned_to) {
                        changes.push(`responsable asignado`);
                    }
                }
                if (args.priority !== undefined) {
                    updateFields.priority = args.priority;
                    if (args.priority !== currentTask.priority) {
                        changes.push(`prioridad de "${currentTask.priority}" a "${args.priority}"`);
                    }
                }
                if (args.dueDate !== undefined) {
                    updateFields.due_date = args.dueDate;
                    if (args.dueDate !== currentTask.due_date) {
                        changes.push(`fecha de vencimiento a "${args.dueDate}"`);
                    }
                }
                if (args.requiresAudit !== undefined) {
                    updateFields.requires_audit = args.requiresAudit;
                    if (args.requiresAudit !== currentTask.requires_audit) {
                        changes.push(`requiere auditoría a "${args.requiresAudit ? 'Sí' : 'No'}"`);
                    }
                }
                if (args.status !== undefined) {
                    updateFields.status = args.status;
                    if (args.status !== currentTask.status) {
                        const statusLabels = {
                            'pendiente': 'Pendiente',
                            'en_progreso': 'En Progreso',
                            'completada': 'Completada'
                        };
                        const oldLabel = statusLabels[currentTask.status] || currentTask.status;
                        const newLabel = statusLabels[args.status] || args.status;
                        if (args.status === 'completada') {
                            if (completedOnBehalfOf) {
                                changes.push(`estado de "${oldLabel}" a "${newLabel}" (marcado por Caleb IA a nombre de ${completedOnBehalfOf})`);
                            }
                            else {
                                changes.push(`estado de "${oldLabel}" a "${newLabel}" (marcado y terminado por Caleb IA)`);
                            }
                        }
                        else {
                            changes.push(`estado de "${oldLabel}" a "${newLabel}"`);
                        }
                    }
                }
                if (changes.length > 0) {
                    const details = `Caleb (IA) actualizó: ${changes.join(", ")}`;
                    const userName = completedOnBehalfOf
                        ? `Caleb (IA) a nombre de ${completedOnBehalfOf}`
                        : `Caleb (IA)`;
                    nextActivities.unshift({
                        id: Math.random().toString(36).substring(2),
                        profile_id: user.id,
                        user_name: userName,
                        action: args.status === 'completada' && args.status !== currentTask.status ? 'Completado de Tarea' : 'Actualización de Tarea',
                        details: details,
                        created_at: new Date().toISOString()
                    });
                    updateFields.task_activities = nextActivities;
                }
                const { data, error } = await db
                    .from("global_tasks")
                    .update(updateFields)
                    .eq("id", taskId)
                    .select()
                    .single();
                if (error)
                    throw error;
                return {
                    content: [{
                            type: "text",
                            text: `Tarea "${data.title}" actualizada exitosamente.`
                        }]
                };
            }
            case "delete_task": {
                const taskId = args.taskId;
                const { error } = await db
                    .from("global_tasks")
                    .delete()
                    .eq("id", taskId);
                if (error)
                    throw error;
                return {
                    content: [{
                            type: "text",
                            text: `Tarea con ID: ${taskId} eliminada exitosamente.`
                        }]
                };
            }
            case "get_projects": {
                const { data: projects, error } = await db
                    .from("projects")
                    .select("*")
                    .order("created_at", { ascending: false });
                if (error)
                    throw error;
                return {
                    content: [{
                            type: "text",
                            text: JSON.stringify(projects, null, 2)
                        }]
                };
            }
            case "get_project_details": {
                const projectId = args.projectId;
                // 1. Info del proyecto y cliente
                const { data: project, error: projErr } = await db
                    .from("projects")
                    .select("*, clients(*)")
                    .eq("id", projectId)
                    .single();
                if (projErr)
                    throw projErr;
                // 2. Materiales BOM
                const { data: materials, error: matErr } = await db
                    .from("project_materials")
                    .select("*, inventory_items(*)")
                    .eq("project_id", projectId);
                if (matErr)
                    throw matErr;
                // 3. Tareas
                const { data: tasks, error: taskErr } = await db
                    .from("global_tasks")
                    .select("*")
                    .eq("project_id", projectId);
                if (taskErr)
                    throw taskErr;
                // 4. Mensajes de chat
                const { data: messages, error: msgErr } = await db
                    .from("project_messages")
                    .select("*, profiles(full_name)")
                    .eq("project_id", projectId)
                    .order("created_at", { ascending: true });
                if (msgErr)
                    throw msgErr;
                return {
                    content: [{
                            type: "text",
                            text: JSON.stringify({
                                project_info: project,
                                bom_materials: materials,
                                tasks: tasks,
                                chat_messages: messages
                            }, null, 2)
                        }]
                };
            }
            case "request_project_materials": {
                const projectId = args.projectId;
                const itemId = args.itemId;
                const requiredQuantity = args.requiredQuantity;
                // Obtener la empresa del usuario
                const { data: { user }, error: userError } = await db.auth.getUser(userJwt);
                if (userError || !user)
                    throw new Error("No se pudo obtener el usuario del token JWT.");
                const { data: profile } = await db
                    .from("profiles")
                    .select("company_id")
                    .eq("id", user.id)
                    .single();
                if (!profile || !profile.company_id)
                    throw new Error("No se encontró la empresa del usuario.");
                // Verificar si ya existe en project_materials
                const { data: existing, error: fetchErr } = await db
                    .from("project_materials")
                    .select("*")
                    .eq("project_id", projectId)
                    .eq("item_id", itemId)
                    .maybeSingle();
                if (fetchErr)
                    throw fetchErr;
                let result;
                if (existing) {
                    const { data, error: updateErr } = await db
                        .from("project_materials")
                        .update({
                        required_quantity: requiredQuantity,
                        updated_at: new Date().toISOString()
                    })
                        .eq("id", existing.id)
                        .select()
                        .single();
                    if (updateErr)
                        throw updateErr;
                    result = data;
                }
                else {
                    const { data, error: insertErr } = await db
                        .from("project_materials")
                        .insert({
                        company_id: profile.company_id,
                        project_id: projectId,
                        item_id: itemId,
                        quantity: 0,
                        required_quantity: requiredQuantity
                    })
                        .select()
                        .single();
                    if (insertErr)
                        throw insertErr;
                    result = data;
                }
                return {
                    content: [{
                            type: "text",
                            text: `Requerimiento registrado con éxito. Solicitado ${requiredQuantity} unidades del material (${itemId}) para la obra (${projectId}).`
                        }]
                };
            }
            case "update_inventory_item": {
                const itemId = args.itemId;
                // Armamos el objeto con los campos a actualizar
                const updateFields = {};
                if (args.name !== undefined)
                    updateFields.name = args.name;
                if (args.sku !== undefined)
                    updateFields.sku = args.sku;
                if (args.categoryId !== undefined)
                    updateFields.category_id = args.categoryId;
                if (args.description !== undefined)
                    updateFields.description = args.description;
                if (args.providers !== undefined)
                    updateFields.providers = args.providers;
                if (args.tags !== undefined)
                    updateFields.tags = args.tags;
                if (args.cost !== undefined)
                    updateFields.cost = args.cost;
                if (args.unit !== undefined)
                    updateFields.unit = args.unit;
                if (args.packaging !== undefined)
                    updateFields.packaging = args.packaging;
                if (args.length !== undefined)
                    updateFields.length = args.length;
                if (args.weight !== undefined)
                    updateFields.weight = args.weight;
                if (args.minStock !== undefined)
                    updateFields.min_stock = args.minStock;
                // Si se actualiza el stock físico, debemos calcular el delta y registrar una transacción
                if (args.stock !== undefined) {
                    // Obtener el stock actual
                    const { data: item, error: fetchErr } = await db
                        .from("inventory_items")
                        .select("stock, company_id")
                        .eq("id", itemId)
                        .single();
                    if (fetchErr || !item)
                        throw new Error("Material no encontrado o sin acceso para el ajuste de stock.");
                    const oldStock = item.stock;
                    const newStock = args.stock;
                    if (oldStock !== newStock) {
                        updateFields.stock = newStock;
                        // Registrar transacción de ajuste
                        const delta = newStock - oldStock;
                        const { data: { user }, error: userError } = await db.auth.getUser(userJwt);
                        if (userError || !user)
                            throw new Error("No se pudo obtener el usuario del token JWT.");
                        const { data: profile } = await db
                            .from("profiles")
                            .select("company_id")
                            .eq("id", user.id)
                            .single();
                        const finalCompanyId = item.company_id || profile?.company_id;
                        if (!finalCompanyId) {
                            throw new Error("No se encontró una empresa asociada para registrar la transacción.");
                        }
                        const { error: logErr } = await db.from("inventory_transactions").insert({
                            company_id: finalCompanyId,
                            item_id: itemId,
                            quantity: delta,
                            transaction_type: "ajuste",
                            reason: `Ajuste automático por Caleb (de ${oldStock} a ${newStock})`,
                            created_by: user.id
                        });
                        if (logErr)
                            throw logErr;
                    }
                }
                updateFields.updated_at = new Date().toISOString();
                const { data: updatedItem, error: updateErr } = await db
                    .from("inventory_items")
                    .update(updateFields)
                    .eq("id", itemId)
                    .select()
                    .single();
                if (updateErr)
                    throw updateErr;
                return {
                    content: [{
                            type: "text",
                            text: `Material "${updatedItem.name}" (SKU: ${updatedItem.sku}) actualizado con éxito.`
                        }]
                };
            }
            case "read_document_content": {
                const documentId = args.documentId;
                // Fetch document metadata
                const { data: doc, error: docError } = await db
                    .from("documents")
                    .select("name, physical_path, mime_type, company_id")
                    .eq("id", documentId)
                    .single();
                if (docError || !doc) {
                    throw new Error(`No se encontró el documento o no tiene permisos de acceso: ${docError?.message || 'No encontrado'}`);
                }
                // Verify physical file exists
                if (!fs_1.default.existsSync(doc.physical_path)) {
                    throw new Error(`El archivo físico no se encuentra en el servidor: ${doc.physical_path}`);
                }
                // Read content
                const ext = path_1.default.extname(doc.name).toLowerCase();
                const isPdf = doc.mime_type === "application/pdf" || ext === ".pdf";
                if (isPdf) {
                    try {
                        // Run pdftotext from poppler-utils
                        const textContent = (0, child_process_1.execSync)(`pdftotext "${doc.physical_path}" -`, {
                            encoding: "utf-8",
                            maxBuffer: 10 * 1024 * 1024
                        });
                        return {
                            content: [{
                                    type: "text",
                                    text: textContent || "[El PDF no contiene texto extraíble]"
                                }]
                        };
                    }
                    catch (execErr) {
                        throw new Error(`Error al extraer texto del PDF con pdftotext: ${execErr.message}`);
                    }
                }
                else {
                    // Check if it's text-like (best effort)
                    const isText = doc.mime_type.startsWith("text/") ||
                        [".csv", ".json", ".txt", ".md", ".xml", ".html", ".js", ".ts", ".ini", ".cfg", ".yaml", ".yml"].includes(ext);
                    if (!isText) {
                        return {
                            content: [{
                                    type: "text",
                                    text: `El tipo de archivo (${doc.mime_type}) no es un formato de texto plano compatible para lectura directa. Datos: Nombre: ${doc.name}, Ruta: ${doc.physical_path}`
                                }]
                        };
                    }
                    try {
                        const textContent = fs_1.default.readFileSync(doc.physical_path, "utf-8");
                        return {
                            content: [{
                                    type: "text",
                                    text: textContent
                                }]
                        };
                    }
                    catch (readErr) {
                        throw new Error(`Error al leer el archivo de texto: ${readErr.message}`);
                    }
                }
            }
            case "write_document_file": {
                const name = args.name;
                const content = args.content;
                const projectId = args.projectId || null;
                const department = args.department || null;
                // Verify session and fetch company
                const { data: { user }, error: userError } = await db.auth.getUser();
                if (userError || !user)
                    throw new Error("Token de sesión inválido o expirado.");
                const { data: profile, error: profileErr } = await db
                    .from("profiles")
                    .select("company_id")
                    .eq("id", user.id)
                    .single();
                if (profileErr || !profile?.company_id) {
                    throw new Error("No se pudo obtener la compañía del perfil del usuario.");
                }
                const companyId = profile.company_id;
                // Manage folders table indexation
                let resolvedFolderId = null;
                if (projectId) {
                    // 1. Find or create master folder "proyectos" (parent_id = null, project_id = null)
                    const { data: existingProyectosFolder } = await db
                        .from('folders')
                        .select('id')
                        .eq('company_id', companyId)
                        .eq('name', 'proyectos')
                        .is('parent_id', null)
                        .is('project_id', null)
                        .limit(1)
                        .maybeSingle();
                    let proyectosFolderId;
                    if (existingProyectosFolder) {
                        proyectosFolderId = existingProyectosFolder.id;
                    }
                    else {
                        const { data: newProyectosFolder, error: createProyectosErr } = await db
                            .from('folders')
                            .insert({
                            company_id: companyId,
                            name: 'proyectos',
                            parent_id: null,
                            project_id: null,
                            department_id: null
                        })
                            .select('id')
                            .single();
                        if (createProyectosErr || !newProyectosFolder) {
                            throw new Error('Error al crear la carpeta maestra proyectos: ' + (createProyectosErr?.message || 'Unknown error'));
                        }
                        proyectosFolderId = newProyectosFolder.id;
                    }
                    // 2. Resolve project name
                    let projectFolderName = projectId; // Fallback
                    try {
                        const { data: projectData, error: projectErr } = await db
                            .from('projects')
                            .select('name')
                            .eq('id', projectId)
                            .limit(1)
                            .maybeSingle();
                        if (!projectErr && projectData?.name) {
                            projectFolderName = projectData.name.trim();
                        }
                    }
                    catch (err) {
                        console.error('Error fetching project name, using UUID instead:', err);
                    }
                    // 3. Find or create project folder under "proyectos"
                    const { data: existingProjectFolder } = await db
                        .from('folders')
                        .select('id')
                        .eq('company_id', companyId)
                        .eq('parent_id', proyectosFolderId)
                        .eq('project_id', projectId)
                        .limit(1)
                        .maybeSingle();
                    let projectFolderId;
                    if (existingProjectFolder) {
                        projectFolderId = existingProjectFolder.id;
                    }
                    else {
                        const { data: newProjectFolder, error: createProjectErr } = await db
                            .from('folders')
                            .insert({
                            company_id: companyId,
                            name: projectFolderName,
                            parent_id: proyectosFolderId,
                            project_id: projectId,
                            department_id: null
                        })
                            .select('id')
                            .single();
                        if (createProjectErr || !newProjectFolder) {
                            throw new Error('Error al crear la carpeta del proyecto: ' + (createProjectErr?.message || 'Unknown error'));
                        }
                        projectFolderId = newProjectFolder.id;
                    }
                    // 4. Find or create department folder under the project folder
                    const deptFolderName = formatDeptName(department || 'Caleb');
                    const { data: existingDeptFolder } = await db
                        .from('folders')
                        .select('id')
                        .eq('company_id', companyId)
                        .eq('parent_id', projectFolderId)
                        .eq('project_id', projectId)
                        .eq('name', deptFolderName)
                        .limit(1)
                        .maybeSingle();
                    if (existingDeptFolder) {
                        resolvedFolderId = existingDeptFolder.id;
                    }
                    else {
                        const { data: newDeptFolder, error: createDeptErr } = await db
                            .from('folders')
                            .insert({
                            company_id: companyId,
                            name: deptFolderName,
                            parent_id: projectFolderId,
                            project_id: projectId,
                            department_id: department || 'Caleb'
                        })
                            .select('id')
                            .single();
                        if (createDeptErr || !newDeptFolder) {
                            throw new Error('Error al crear la carpeta del departamento: ' + (createDeptErr?.message || 'Unknown error'));
                        }
                        resolvedFolderId = newDeptFolder.id;
                    }
                }
                else {
                    // Non-project: Create under folder "Caleb" or general
                    const folderName = department ? formatDeptName(department) : "Caleb";
                    const { data: existingFolder } = await db
                        .from('folders')
                        .select('id')
                        .eq('company_id', companyId)
                        .eq('name', folderName)
                        .is('project_id', null)
                        .is('parent_id', null)
                        .limit(1)
                        .maybeSingle();
                    if (existingFolder) {
                        resolvedFolderId = existingFolder.id;
                    }
                    else {
                        const { data: newFolder, error: folderCreateErr } = await db
                            .from('folders')
                            .insert({
                            company_id: companyId,
                            name: folderName,
                            project_id: null,
                            parent_id: null,
                            department_id: department || 'Caleb'
                        })
                            .select('id')
                            .single();
                        if (!folderCreateErr && newFolder) {
                            resolvedFolderId = newFolder.id;
                        }
                        else if (folderCreateErr) {
                            throw new Error('Error al crear la carpeta Caleb: ' + folderCreateErr.message);
                        }
                    }
                }
                // Build physical path
                let targetDir = `/var/lib/solar-hub-storage/tenants/${companyId}`;
                if (resolvedFolderId) {
                    const segments = await getPhysicalPathForFolder(db, resolvedFolderId, companyId);
                    const sanitizedSegments = segments.map(sanitizePathSegment);
                    targetDir = path_1.default.join(targetDir, ...sanitizedSegments);
                }
                else {
                    targetDir = path_1.default.join(targetDir, 'general');
                }
                // Recursively create target folder
                if (!fs_1.default.existsSync(targetDir)) {
                    fs_1.default.mkdirSync(targetDir, { recursive: true });
                }
                // Generate safe unique filename
                const safeName = path_1.default.basename(name);
                const fileExt = path_1.default.extname(safeName);
                const uniqueFilename = `${crypto_1.default.randomUUID()}${fileExt}`;
                const physicalPath = path_1.default.join(targetDir, uniqueFilename);
                // Write file text content to disk
                fs_1.default.writeFileSync(physicalPath, content, 'utf-8');
                // Insert metadata record in Supabase
                const { data: newDoc, error: docError } = await db
                    .from('documents')
                    .insert({
                    company_id: companyId,
                    folder_id: resolvedFolderId,
                    name: safeName,
                    physical_path: physicalPath,
                    file_size: Buffer.byteLength(content, 'utf-8'),
                    mime_type: getMimeType(safeName),
                    uploaded_by: user.id
                })
                    .select()
                    .single();
                if (docError) {
                    if (fs_1.default.existsSync(physicalPath)) {
                        fs_1.default.unlinkSync(physicalPath);
                    }
                    throw new Error('Error al registrar el metadato del archivo en Supabase: ' + docError.message);
                }
                return {
                    content: [{
                            type: "text",
                            text: `Archivo guardado con éxito. URL de descarga: /api/storage/file/${newDoc.id}?name=${encodeURIComponent(newDoc.name)}`
                        }]
                };
            }
            case "list_project_documents": {
                const projectId = args.projectId || null;
                const folderId = args.folderId || null;
                // Fetch companyId of user
                const { data: { user }, error: userError } = await db.auth.getUser();
                if (userError || !user)
                    throw new Error("Token de sesión inválido o expirado.");
                const { data: profile } = await db
                    .from("profiles")
                    .select("company_id")
                    .eq("id", user.id)
                    .single();
                if (!profile?.company_id)
                    throw new Error("Compañía no encontrada.");
                const companyId = profile.company_id;
                let queryFolders = db.from("folders").select("id, name, parent_id, project_id, department_id").eq("company_id", companyId);
                let queryDocs = db.from("documents").select("id, folder_id, name, file_size, mime_type, created_at").eq("company_id", companyId);
                if (folderId) {
                    queryFolders = queryFolders.eq("parent_id", folderId);
                    queryDocs = queryDocs.eq("folder_id", folderId);
                }
                else if (projectId) {
                    queryFolders = queryFolders.eq("project_id", projectId);
                    const { data: projectFolders } = await db
                        .from("folders")
                        .select("id")
                        .eq("company_id", companyId)
                        .eq("project_id", projectId);
                    const folderIds = (projectFolders || []).map((f) => f.id);
                    if (folderIds.length > 0) {
                        queryDocs = queryDocs.in("folder_id", folderIds);
                    }
                    else {
                        queryDocs = queryDocs.is("folder_id", null);
                    }
                }
                else {
                    queryFolders = queryFolders.is("parent_id", null).is("project_id", null);
                    queryDocs = queryDocs.is("folder_id", null);
                }
                const { data: folders, error: foldersErr } = await queryFolders;
                if (foldersErr)
                    throw foldersErr;
                const { data: documents, error: docsErr } = await queryDocs;
                if (docsErr)
                    throw docsErr;
                return {
                    content: [{
                            type: "text",
                            text: JSON.stringify({
                                folders: folders || [],
                                documents: (documents || []).map((d) => ({
                                    id: d.id,
                                    name: d.name,
                                    folder_id: d.folder_id,
                                    file_size: d.file_size,
                                    mime_type: d.mime_type,
                                    created_at: d.created_at,
                                    download_url: `/api/storage/file/${d.id}?name=${encodeURIComponent(d.name)}`
                                }))
                            }, null, 2)
                        }]
                };
            }
            case "search_documents": {
                const query = args.query;
                const { data: { user }, error: userError } = await db.auth.getUser();
                if (userError || !user)
                    throw new Error("Token de sesión inválido o expirado.");
                const { data: profile } = await db
                    .from("profiles")
                    .select("company_id")
                    .eq("id", user.id)
                    .single();
                if (!profile?.company_id)
                    throw new Error("Compañía no encontrada.");
                const companyId = profile.company_id;
                const { data: documents, error } = await db
                    .from("documents")
                    .select("id, folder_id, name, file_size, mime_type, created_at")
                    .eq("company_id", companyId)
                    .ilike("name", `%${query}%`);
                if (error)
                    throw error;
                return {
                    content: [{
                            type: "text",
                            text: JSON.stringify((documents || []).map((d) => ({
                                id: d.id,
                                name: d.name,
                                folder_id: d.folder_id,
                                file_size: d.file_size,
                                mime_type: d.mime_type,
                                created_at: d.created_at,
                                download_url: `/api/storage/file/${d.id}?name=${encodeURIComponent(d.name)}`
                            })), null, 2)
                        }]
                };
            }
            default:
                throw new Error(`Tool no soportada: ${name}`);
        }
    }
    catch (err) {
        return {
            isError: true,
            content: [{ type: "text", text: err.message || String(err) }]
        };
    }
});
async function run() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
}
run().catch(console.error);
