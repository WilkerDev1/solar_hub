-- Migration: Task Auditing features
ALTER TABLE public.global_tasks
  ADD COLUMN IF NOT EXISTS requires_audit BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS audit_comments TEXT;
