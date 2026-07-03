-- Migration: Expand task statuses
-- Objective: Alter the check constraint on global_tasks to support 'backlog' and 'bloqueada' statuses.

ALTER TABLE public.global_tasks DROP CONSTRAINT IF EXISTS global_tasks_status_check;

ALTER TABLE public.global_tasks ADD CONSTRAINT global_tasks_status_check 
  CHECK (status IN ('backlog', 'pendiente', 'en_progreso', 'bloqueada', 'completada'));
