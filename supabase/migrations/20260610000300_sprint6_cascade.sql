-- Migración para añadir regla ON DELETE CASCADE a la eliminación de proyectos

-- 1. Actualizar llave foránea en global_tasks
ALTER TABLE public.global_tasks
DROP CONSTRAINT IF EXISTS global_tasks_project_id_fkey;

ALTER TABLE public.global_tasks
ADD CONSTRAINT global_tasks_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES public.projects(id)
ON DELETE CASCADE;

-- 2. Actualizar llave foránea en project_messages
ALTER TABLE public.project_messages
DROP CONSTRAINT IF EXISTS project_messages_project_id_fkey;

ALTER TABLE public.project_messages
ADD CONSTRAINT project_messages_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES public.projects(id)
ON DELETE CASCADE;
