import { createClient } from '@supabase/supabase-js';

// Retrieve configuration from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Types representing core entities retrieved from our PostgreSQL DB schema.
 * You can regenerate these using: `supabase gen types typescript` once local CLI is fully configured.
 */

export interface Company {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'pending';
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  company_id: string | null;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Role {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Permission {
  id: string;
  action: string;
  description: string | null;
  created_at: string;
}

export interface UserRoleRelation {
  user_id: string;
  role_id: string;
  created_at: string;
}
