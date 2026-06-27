import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

import { Capacitor } from '@capacitor/core';

// Retrieve configuration from environment variables
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';

// If running natively on Android, localhost/127.0.0.1 needs to be mapped to 10.0.2.2 (host loopback)
if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
  if (supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')) {
    supabaseUrl = supabaseUrl.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
  }
}

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Initialize the Supabase client with strongly typed database schema
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export type Company = Database['public']['Tables']['companies']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Role = Database['public']['Tables']['roles']['Row'];
export type Permission = Database['public']['Tables']['permissions']['Row'];
export type UserRole = Database['public']['Tables']['user_roles']['Row'];
export type RolePermission = Database['public']['Tables']['role_permissions']['Row'];
