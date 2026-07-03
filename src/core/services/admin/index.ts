import { supabase } from '@/core/database/supabase';
import { getApiUrl } from '@/core/utils/api';
import { Database } from '@/core/database/types';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export interface EmployeeWithRole extends ProfileRow {
  roleName: string;
  roleId: string;
}

/**
 * Fetch all employees (profiles) belonging to the authenticated user's tenant.
 * Optionally filter by active status.
 */
export async function getEmployees(
  filters?: { showArchived?: boolean }
): Promise<EmployeeWithRole[]> {
  let query = supabase
    .from('profiles')
    .select(`
      *,
      user_roles (
        role_id,
        roles (
          id,
          name
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (!filters?.showArchived) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching employees:', error);
    throw new Error(error.message);
  }

  return (data || []).map((p: any) => {
    const urObj = p.user_roles?.[0];
    const role = urObj?.roles;
    return {
      ...p,
      roleName: role ? role.name : 'Sin Rol',
      roleId: role ? role.id : '',
    };
  });
}

/**
 * Create a new employee account via the secure API Route.
 * This keeps the service_role_key on the server side.
 */
export async function createEmployee(data: {
  email: string;
  full_name: string;
  password?: string;
  occupation?: string[];
}): Promise<{ success: boolean; message: string; profileId?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch(getApiUrl('/api/admin/create-employee'), {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || ''}`
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Error al crear el empleado');
  }

  return result;
}

/**
 * Update an employee's profile details (name, occupation, role).
 */
export async function updateEmployee(
  profileId: string,
  updates: {
    full_name?: string;
    occupation?: string[];
    roleId?: string;
    currentRoleId?: string;
  }
): Promise<void> {
  // 1. Update profile fields using proper typed object
  const profileUpdates: Database['public']['Tables']['profiles']['Update'] = {};
  if (updates.full_name !== undefined) profileUpdates.full_name = updates.full_name;
  if (updates.occupation !== undefined) profileUpdates.occupation = updates.occupation;

  if (updates.full_name !== undefined || updates.occupation !== undefined) {
    const { error: profileErr } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', profileId);

    if (profileErr) {
      console.error('Error updating employee profile:', profileErr);
      throw new Error(profileErr.message);
    }
  }

  // 2. Update role assignment if changed
  if (updates.roleId !== undefined && updates.roleId !== updates.currentRoleId) {
    // Remove previous role assignment
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', profileId);

    // Assign new role (if not empty)
    if (updates.roleId) {
      const { error: roleErr } = await supabase
        .from('user_roles')
        .insert({ user_id: profileId, role_id: updates.roleId });

      if (roleErr) {
        console.error('Error assigning new role:', roleErr);
        throw new Error(roleErr.message);
      }
    }
  }
}

/**
 * Archive an employee (logical deletion). Sets is_active = false.
 * Preserves all data for audit trail integrity.
 */
export async function archiveEmployee(profileId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', profileId);

  if (error) {
    console.error('Error archiving employee:', error);
    throw new Error(error.message);
  }
}

/**
 * Restore a previously archived employee. Sets is_active = true.
 */
export async function restoreEmployee(profileId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: true })
    .eq('id', profileId);

  if (error) {
    console.error('Error restoring employee:', error);
    throw new Error(error.message);
  }
}

/**
 * Extract the unique non-empty occupation strings already present in profiles
 */
export async function getUniqueOccupations(): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('occupation')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching unique occupations:', error);
    return [];
  }

  const uniqueSet = new Set<string>();
  data.forEach((p: any) => {
    if (p.occupation && Array.isArray(p.occupation)) {
      p.occupation.forEach((occ: string) => {
        const clean = occ?.trim();
        if (clean) uniqueSet.add(clean);
      });
    }
  });

  return Array.from(uniqueSet).sort();
}

/**
 * Fetch all dynamic role permissions templates for the active company
 */
export type RoleTemplateRow = Database['public']['Tables']['role_permissions_templates']['Row'];

export async function getRoleTemplates(): Promise<RoleTemplateRow[]> {
  const { data, error } = await supabase
    .from('role_permissions_templates')
    .select('*')
    .order('role_name', { ascending: true });

  if (error) {
    console.error('Error fetching role templates:', error);
    throw new Error(error.message);
  }
  return data || [];
}

/**
 * Upsert dynamic permissions configuration for a specific role
 */
export async function saveRoleTemplate(
  roleName: string,
  permissionActions: string[]
): Promise<void> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('No active user session');

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (profileErr || !profile || !profile.company_id) {
    throw new Error('User company not found');
  }

  const { error } = await supabase
    .from('role_permissions_templates')
    .upsert({
      company_id: profile.company_id,
      role_name: roleName,
      permission_actions: permissionActions,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'company_id,role_name',
    });

  if (error) {
    console.error('Error saving role template:', error);
    throw new Error(error.message);
  }
}

/**
 * Alias for saveRoleTemplate to fulfill the creation of a custom role.
 */
export const createCustomRole = saveRoleTemplate;

/**
 * Trigger backend password reset for a given employee (Admin privilege required)
 */
export async function resetEmployeePassword(
  profileId: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch(getApiUrl('/api/admin/reset-password'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || ''}`,
    },
    body: JSON.stringify({ userId: profileId, password: newPassword }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Error al restablecer la contraseña');
  }

  return result;
}
