-- Migration: Sprint 9 Multiple Participants on Projects and Tasks
-- Objective: Add member_ids to projects, assigned_to_ids to global_tasks, and initialize them.

-- 1. Add member_ids to projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS member_ids UUID[] DEFAULT '{}'::UUID[];

-- 2. Add assigned_to_ids to global_tasks
ALTER TABLE public.global_tasks
  ADD COLUMN IF NOT EXISTS assigned_to_ids UUID[] DEFAULT '{}'::UUID[];

-- 3. Migrate existing tasks data: set assigned_to_ids = ARRAY[assigned_to] if assigned_to is present
UPDATE public.global_tasks
  SET assigned_to_ids = ARRAY[assigned_to]
  WHERE assigned_to IS NOT NULL AND (assigned_to_ids IS NULL OR cardinality(assigned_to_ids) = 0);

-- 4. Migrate existing projects data: add all profiles of the same company as members to project initially
UPDATE public.projects p
  SET member_ids = (
    SELECT array_agg(id) 
    FROM public.profiles pr 
    WHERE pr.company_id = p.company_id
  )
  WHERE member_ids IS NULL OR cardinality(member_ids) = 0;
