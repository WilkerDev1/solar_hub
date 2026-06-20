-- Migración para madurar tareas y configuraciones de proyectos
-- Sprint 7: Añadir prioridad, due_date, tags, subtasks, task_materials, task_comments, task_activities, delivery_date y detalles de proyectos.

-- 1. Expansión de global_tasks con nuevos campos y restricciones
ALTER TABLE public.global_tasks
  ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('baja', 'media', 'alta')) DEFAULT 'baja',
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS task_materials JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS task_comments JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS task_activities JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS delivery_date TIMESTAMP WITH TIME ZONE;

-- 2. Expansión de projects para soportar configuraciones ejecutivas
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT;
