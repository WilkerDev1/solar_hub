import { supabase } from '@/core/database/supabase';
import { Database } from '@/core/database/types';

export type ProjectMessageRow = Database['public']['Tables']['project_messages']['Row'];

/**
 * Fetch messages for a specific project.
 */
export async function getProjectMessages(projectId: string): Promise<ProjectMessageRow[]> {
  const { data, error } = await supabase
    .from('project_messages')
    .select(`
      *,
      profiles:profile_id (
        id,
        full_name,
        avatar_url,
        email
      )
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching project messages:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Send a new message to a project chat.
 */
export async function sendMessage(projectId: string, message: string): Promise<ProjectMessageRow> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('No active user session');
  }

  const { data, error } = await supabase
    .from('project_messages')
    .insert({
      project_id: projectId,
      profile_id: user.id,
      message,
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending message:', error);
    throw new Error(error.message);
  }

  return data;
}
