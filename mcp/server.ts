import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../src/core/database/types.js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

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

// Helper to get authenticated client inheriting RLS
async function getSupabaseClient(userJwt?: string) {
  if (userJwt) {
    const client = createClient<Database>(supabaseUrl, supabaseAnonKey || supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {
          Authorization: `Bearer ${userJwt}`,
        },
      },
    });
    return client;
  }
  return createClient<Database>(supabaseUrl, supabaseKey);
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
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
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params.name;
  const args = (request.params.arguments || {}) as Record<string, any>;
  const userJwt = args.userJwt as string;
  const db = await getSupabaseClient(userJwt);

  try {
    switch (name) {
      case "get_inventory_analytics": {
        const { data: items, error: itemsError } = await db.from("inventory_items").select("*");
        if (itemsError) throw itemsError;

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
        const itemId = args.itemId as string;
        const projectId = (args.projectId as string) || null;
        const type = args.type as "entrada" | "salida" | "ajuste";
        const quantity = args.quantity as number;
        const reason = args.reason as string;

        if (projectId && type === "salida") {
          // Dispatch to project using the atomic RPC function
          const { error: dispatchErr } = await db.rpc("dispatch_material_to_project", {
            proj_id: projectId,
            it_id: itemId,
            qty: quantity,
            reason: reason
          });
          if (dispatchErr) throw dispatchErr;

          return {
            content: [{
              type: "text",
              text: `Despacho exitoso. Asignado ${quantity} unidades a la obra (${projectId}).`
            }]
          };
        } else {
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
          if (rpcErr) throw rpcErr;

          return {
            content: [{
              type: "text",
              text: `Transacción de inventario registrada con éxito (${type}): ${quantity} unidades.`
            }]
          };
        }
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

      case "create_task": {
        const title = args.title as string;
        const description = (args.description as string) || null;
        const projectId = (args.projectId as string) || null;
        const assignedTo = (args.assignedTo as string) || null;
        const priority = (args.priority as "baja" | "media" | "alta") || "baja";
        const dueDate = (args.dueDate as string) || null;
        const requiresAudit = (args.requiresAudit as boolean) || false;
        const area = (args.area as "legal" | "almacen" | "operaciones" | "administracion" | "general") || "general";

        const { data: { user }, error: userError } = await db.auth.getUser(userJwt);
        if (userError || !user) throw new Error("No se pudo obtener el usuario del token JWT.");

        const { data: profile } = await db
          .from("profiles")
          .select("company_id, full_name, email")
          .eq("id", user.id)
          .single();

        if (!profile || !profile.company_id) throw new Error("No se encontró la empresa del usuario.");

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

        if (error) throw error;

        return {
          content: [{
            type: "text",
            text: `Tarea "${data.title}" creada exitosamente con ID: ${data.id}.`
          }]
        };
      }

      case "update_task": {
        const taskId = args.taskId as string;
        const completedOnBehalfOf = args.completedOnBehalfOf as string | undefined;

        const { data: { user }, error: userError } = await db.auth.getUser(userJwt);
        if (userError || !user) throw new Error("No se pudo obtener el usuario del token JWT.");

        const { data: currentTask, error: getTaskErr } = await db
          .from("global_tasks")
          .select("task_activities, status, title, assigned_to, priority, description, due_date, requires_audit")
          .eq("id", taskId)
          .single();

        if (getTaskErr || !currentTask) {
          throw new Error(`No se encontró la tarea con ID: ${taskId}`);
        }

        const nextActivities = Array.isArray(currentTask.task_activities) ? [...currentTask.task_activities] : [];
        const changes: string[] = [];
        const updateFields: any = {};

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
            const statusLabels: Record<string, string> = {
              'pendiente': 'Pendiente',
              'en_progreso': 'En Progreso',
              'completada': 'Completada'
            };
            const oldLabel = statusLabels[currentTask.status] || currentTask.status;
            const newLabel = statusLabels[args.status] || args.status;

            if (args.status === 'completada') {
              if (completedOnBehalfOf) {
                changes.push(`estado de "${oldLabel}" a "${newLabel}" (marcado por Caleb IA a nombre de ${completedOnBehalfOf})`);
              } else {
                changes.push(`estado de "${oldLabel}" a "${newLabel}" (marcado y terminado por Caleb IA)`);
              }
            } else {
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

        if (error) throw error;

        return {
          content: [{
            type: "text",
            text: `Tarea "${data.title}" actualizada exitosamente.`
          }]
        };
      }

      case "delete_task": {
        const taskId = args.taskId as string;
        const { error } = await db
          .from("global_tasks")
          .delete()
          .eq("id", taskId);

        if (error) throw error;

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
        if (error) throw error;

        return {
          content: [{
            type: "text",
            text: JSON.stringify(projects, null, 2)
          }]
        };
      }

      case "get_project_details": {
        const projectId = args.projectId as string;

        // 1. Info del proyecto y cliente
        const { data: project, error: projErr } = await db
          .from("projects")
          .select("*, clients(*)")
          .eq("id", projectId)
          .single();
        if (projErr) throw projErr;

        // 2. Materiales BOM
        const { data: materials, error: matErr } = await db
          .from("project_materials")
          .select("*, inventory_items(*)")
          .eq("project_id", projectId);
        if (matErr) throw matErr;

        // 3. Tareas
        const { data: tasks, error: taskErr } = await db
          .from("global_tasks")
          .select("*")
          .eq("project_id", projectId);
        if (taskErr) throw taskErr;

        // 4. Mensajes de chat
        const { data: messages, error: msgErr } = await db
          .from("project_messages")
          .select("*, profiles(full_name)")
          .eq("project_id", projectId)
          .order("created_at", { ascending: true });
        if (msgErr) throw msgErr;

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
        const projectId = args.projectId as string;
        const itemId = args.itemId as string;
        const requiredQuantity = args.requiredQuantity as number;

        // Obtener la empresa del usuario
        const { data: { user }, error: userError } = await db.auth.getUser(userJwt);
        if (userError || !user) throw new Error("No se pudo obtener el usuario del token JWT.");

        const { data: profile } = await db
          .from("profiles")
          .select("company_id")
          .eq("id", user.id)
          .single();

        if (!profile || !profile.company_id) throw new Error("No se encontró la empresa del usuario.");

        // Verificar si ya existe en project_materials
        const { data: existing, error: fetchErr } = await db
          .from("project_materials")
          .select("*")
          .eq("project_id", projectId)
          .eq("item_id", itemId)
          .maybeSingle();

        if (fetchErr) throw fetchErr;

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

          if (updateErr) throw updateErr;
          result = data;
        } else {
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

          if (insertErr) throw insertErr;
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
        const itemId = args.itemId as string;

        // Armamos el objeto con los campos a actualizar
        const updateFields: any = {};
        if (args.name !== undefined) updateFields.name = args.name;
        if (args.sku !== undefined) updateFields.sku = args.sku;
        if (args.categoryId !== undefined) updateFields.category_id = args.categoryId;
        if (args.description !== undefined) updateFields.description = args.description;
        if (args.providers !== undefined) updateFields.providers = args.providers;
        if (args.tags !== undefined) updateFields.tags = args.tags;
        if (args.cost !== undefined) updateFields.cost = args.cost;
        if (args.unit !== undefined) updateFields.unit = args.unit;
        if (args.packaging !== undefined) updateFields.packaging = args.packaging;
        if (args.length !== undefined) updateFields.length = args.length;
        if (args.weight !== undefined) updateFields.weight = args.weight;
        if (args.minStock !== undefined) updateFields.min_stock = args.minStock;

        // Si se actualiza el stock físico, debemos calcular el delta y registrar una transacción
        if (args.stock !== undefined) {
          // Obtener el stock actual
          const { data: item, error: fetchErr } = await db
            .from("inventory_items")
            .select("stock, company_id")
            .eq("id", itemId)
            .single();
          if (fetchErr || !item) throw new Error("Material no encontrado o sin acceso para el ajuste de stock.");

          const oldStock = item.stock;
          const newStock = args.stock as number;

          if (oldStock !== newStock) {
            updateFields.stock = newStock;
            
            // Registrar transacción de ajuste
            const delta = newStock - oldStock;
            const { data: { user }, error: userError } = await db.auth.getUser(userJwt);
            if (userError || !user) throw new Error("No se pudo obtener el usuario del token JWT.");

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
            if (logErr) throw logErr;
          }
        }

        updateFields.updated_at = new Date().toISOString();

        const { data: updatedItem, error: updateErr } = await db
          .from("inventory_items")
          .update(updateFields)
          .eq("id", itemId)
          .select()
          .single();

        if (updateErr) throw updateErr;

        return {
          content: [{
            type: "text",
            text: `Material "${updatedItem.name}" (SKU: ${updatedItem.sku}) actualizado con éxito.`
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
