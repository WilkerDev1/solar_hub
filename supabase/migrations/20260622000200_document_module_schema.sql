-- Migration: Document Module Schema
-- Objective: Create folders and documents tables with row-level security for secure storage.

-- 1. Create folders table
CREATE TABLE IF NOT EXISTS public.folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  department_id TEXT,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  physical_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.global_tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for folders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'folders' AND policyname = 'Users can view folders in their company'
  ) THEN
    CREATE POLICY "Users can view folders in their company" ON public.folders
      FOR SELECT USING (company_id = get_user_active_company());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'folders' AND policyname = 'Users can insert folders in their company'
  ) THEN
    CREATE POLICY "Users can insert folders in their company" ON public.folders
      FOR INSERT WITH CHECK (company_id = get_user_active_company());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'folders' AND policyname = 'Users can update folders in their company'
  ) THEN
    CREATE POLICY "Users can update folders in their company" ON public.folders
      FOR UPDATE USING (company_id = get_user_active_company());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'folders' AND policyname = 'Users can delete folders in their company'
  ) THEN
    CREATE POLICY "Users can delete folders in their company" ON public.folders
      FOR DELETE USING (company_id = get_user_active_company());
  END IF;
END $$;

-- 5. RLS Policies for documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'Users can view documents in their company'
  ) THEN
    CREATE POLICY "Users can view documents in their company" ON public.documents
      FOR SELECT USING (company_id = get_user_active_company());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'Users can insert documents in their company'
  ) THEN
    CREATE POLICY "Users can insert documents in their company" ON public.documents
      FOR INSERT WITH CHECK (company_id = get_user_active_company());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'Users can update documents in their company'
  ) THEN
    CREATE POLICY "Users can update documents in their company" ON public.documents
      FOR UPDATE USING (company_id = get_user_active_company());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'Users can delete documents in their company'
  ) THEN
    CREATE POLICY "Users can delete documents in their company" ON public.documents
      FOR DELETE USING (company_id = get_user_active_company());
  END IF;
END $$;
