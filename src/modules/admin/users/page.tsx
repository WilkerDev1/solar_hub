'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/core/database/supabase';
import { RequirePermission } from '@/core/auth/AuthContext';
import { 
  ArrowLeft, 
  Users, 
  ShieldCheck, 
  UserCog, 
  Loader2, 
  AlertCircle, 
  Check,
  CheckSquare,
  Square,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { Label } from '@/core/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogClose
} from '@/core/components/ui/dialog';

interface ProfileWithRole {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  roleName: string;
  roleId: string;
}

interface RoleOption {
  id: string;
  name: string;
}

interface PermissionOption {
  id: string;
  action: string;
  description: string | null;
}

export default function EmployeeManagementModule() {
  const router = useRouter();
  
  // Data States
  const [employees, setEmployees] = useState<ProfileWithRole[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal States
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ProfileWithRole | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [activePermissionIds, setActivePermissionIds] = useState<Set<string>>(new Set());
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Load all data
  const loadEmployeeData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch profiles
      const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          avatar_url,
          user_roles (
            role_id,
            roles (
              id,
              name
            )
          )
        `);

      if (profileErr) throw profileErr;

      // 2. Fetch roles
      const { data: dbRoles, error: rolesErr } = await supabase
        .from('roles')
        .select('id, name');

      if (rolesErr) throw rolesErr;

      // 3. Fetch permissions
      const { data: dbPerms, error: permsErr } = await supabase
        .from('permissions')
        .select('id, action, description');

      if (permsErr) throw permsErr;

      // Map profiles with role names
      const mappedEmployees: ProfileWithRole[] = (profiles || []).map((p: any) => {
        const urObj = p.user_roles?.[0];
        const role = urObj?.roles;
        return {
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          avatar_url: p.avatar_url,
          roleName: role ? role.name : 'Sin Rol',
          roleId: role ? role.id : '',
        };
      });

      setEmployees(mappedEmployees);
      setRoles(dbRoles || []);
      setAllPermissions(dbPerms || []);
    } catch (err: any) {
      console.error('Error loading employee config:', err);
      setError(err.message || 'Error al obtener perfiles o roles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployeeData();
  }, []);

  // Open Edit Dialog and pre-fill form
  const handleOpenEdit = async (employee: ProfileWithRole) => {
    setSelectedUser(employee);
    setSelectedRoleId(employee.roleId);
    setModalError(null);
    setEditDialogOpen(true);

    if (employee.roleId) {
      // Fetch currently active permissions for this role
      try {
        const { data: rolePerms, error } = await supabase
          .from('role_permissions')
          .select('permission_id')
          .eq('role_id', employee.roleId);

        if (error) throw error;
        
        const activeIds = new Set<string>((rolePerms || []).map(rp => rp.permission_id));
        setActivePermissionIds(activeIds);
      } catch (err: any) {
        console.error('Error loading role permissions:', err);
      }
    } else {
      setActivePermissionIds(new Set());
    }
  };

  // Toggle permission ID in local modal state
  const handleTogglePermission = (permissionId: string) => {
    const nextSet = new Set(activePermissionIds);
    if (nextSet.has(permissionId)) {
      nextSet.delete(permissionId);
    } else {
      nextSet.add(permissionId);
    }
    setActivePermissionIds(nextSet);
  };

  // When changing role in dropdown, reload the permissions associated with that role
  const handleRoleSelectChange = async (newRoleId: string) => {
    setSelectedRoleId(newRoleId);
    setModalError(null);
    
    if (newRoleId) {
      try {
        const { data: rolePerms, error } = await supabase
          .from('role_permissions')
          .select('permission_id')
          .eq('role_id', newRoleId);

        if (error) throw error;
        
        const activeIds = new Set<string>((rolePerms || []).map(rp => rp.permission_id));
        setActivePermissionIds(activeIds);
      } catch (err: any) {
        console.error('Error switching role permissions:', err);
      }
    } else {
      setActivePermissionIds(new Set());
    }
  };

  // Save changes to Supabase
  const handleSaveConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setModalSubmitting(true);
    setModalError(null);

    try {
      // 1. Update user role
      if (selectedRoleId !== selectedUser.roleId) {
        // Delete previous roles for user
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', selectedUser.id);

        if (selectedRoleId) {
          // Assign new role
          const { error: insertRoleErr } = await supabase
            .from('user_roles')
            .insert({
              user_id: selectedUser.id,
              role_id: selectedRoleId,
            });

          if (insertRoleErr) throw insertRoleErr;
        }
      }

      // 2. Save permissions configuration for the selected role
      if (selectedRoleId) {
        // Clear all current permissions for the role
        await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', selectedRoleId);

        // Map selected permissions
        if (activePermissionIds.size > 0) {
          const insertData = Array.from(activePermissionIds).map(permId => ({
            role_id: selectedRoleId,
            permission_id: permId
          }));

          const { error: insertPermsErr } = await supabase
            .from('role_permissions')
            .insert(insertData);

          if (insertPermsErr) throw insertPermsErr;
        }
      }

      setEditDialogOpen(false);
      loadEmployeeData();
    } catch (err: any) {
      console.error('Error saving user roles configuration:', err);
      setModalError(err.message || 'Error al guardar cambios.');
    } finally {
      setModalSubmitting(false);
    }
  };

  return (
    <RequirePermission action="admin:*" fallback={
      <div className="bg-zinc-900 border border-zinc-800 p-8 text-center rounded-2xl max-w-md mx-auto mt-12">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-4" />
        <h3 className="text-white font-bold text-lg">Acceso Denegado</h3>
        <p className="text-zinc-400 text-sm mt-2">No tienes privilegios administrativos para gestionar roles y permisos.</p>
      </div>
    }>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/?tab=admin')}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              style={{ minHeight: '40px', minWidth: '40px' }}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">Gestión de Empleados</h1>
              <p className="text-zinc-400 text-xs mt-1">Administra accesos y define privilegios de seguridad RBAC en caliente.</p>
            </div>
          </div>
        </div>

        {/* Error panel */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl flex items-center space-x-3 text-sm">
            <AlertCircle className="h-5 w-5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Employees list */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
            <span className="text-zinc-500 text-sm font-medium">Cargando perfiles de personal...</span>
          </div>
        ) : (
          <>
            {/* PC Table */}
            <div className="hidden md:block overflow-hidden bg-zinc-900 border border-zinc-800 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                    <th className="p-4">Colaborador</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Rol Activo</th>
                    <th className="p-4 text-center">Configuración</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-sm text-zinc-300">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-zinc-850/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-emerald-700/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
                            {emp.full_name?.charAt(0).toUpperCase() || emp.email.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-white">{emp.full_name || 'Sin Nombre'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-zinc-400 font-mono text-xs">{emp.email}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          emp.roleName === 'Administrador' 
                            ? 'bg-purple-950/50 text-purple-400 border border-purple-500/20' 
                            : 'bg-zinc-850 text-zinc-400 border border-zinc-750'
                        }`}>
                          {emp.roleName}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <Button
                          onClick={() => handleOpenEdit(emp)}
                          className="bg-zinc-800 hover:bg-zinc-700 hover:text-white text-zinc-300 text-xs px-3 rounded-lg flex items-center gap-1.5 mx-auto"
                        >
                          <UserCog className="h-3.5 w-3.5" />
                          <span>Ajustar Rol</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {employees.map((emp) => (
                <div key={emp.id} className="bg-zinc-900 border-2 border-zinc-800 rounded-xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-emerald-700/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
                        {emp.full_name?.charAt(0).toUpperCase() || emp.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{emp.full_name || 'Sin Nombre'}</h4>
                        <p className="text-[10px] text-zinc-500 font-mono">{emp.email}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 bg-zinc-850 text-zinc-400 rounded border border-zinc-750">
                      {emp.roleName}
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenEdit(emp)}
                    className="w-full flex items-center justify-center gap-1.5 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg border border-zinc-700"
                    style={{ minHeight: '48px' }}
                  >
                    <UserCog className="h-4 w-4" />
                    <span>Modificar Rol / Permisos</span>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Edit Modal (Dialog) */}
        {selectedUser && (
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="max-w-md bg-zinc-900 border border-zinc-800 text-white p-6 rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <UserCog className="h-5 w-5 text-emerald-400" />
                  Editar Privilegios: {selectedUser.full_name || selectedUser.email}
                </DialogTitle>
              </DialogHeader>

              {modalError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-lg flex items-start space-x-2 text-xs my-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{modalError}</span>
                </div>
              )}

              <form onSubmit={handleSaveConfigSubmit} className="space-y-4 pt-3">
                {/* Role dropdown selection */}
                <div className="space-y-1">
                  <Label htmlFor="roleSelect" className="text-zinc-400 text-xs font-bold">Rol Principal del Sistema</Label>
                  <select
                    id="roleSelect"
                    value={selectedRoleId}
                    onChange={(e) => handleRoleSelectChange(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg text-sm p-2 text-white h-9 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Ningún Rol (Sin acceso)</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                {/* Permissions checkboxes list */}
                {selectedRoleId && (
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs font-bold block pb-1 border-b border-zinc-800/60">
                      Permisos Específicos Mapeados
                    </Label>
                    
                    <div className="max-h-52 overflow-y-auto space-y-1.5 pr-2">
                      {allPermissions.map((perm) => {
                        const isActive = activePermissionIds.has(perm.id);
                        return (
                          <button
                            key={perm.id}
                            type="button"
                            onClick={() => handleTogglePermission(perm.id)}
                            className="w-full flex items-start text-left gap-3 p-2 hover:bg-zinc-850/40 rounded-lg transition-colors border border-transparent hover:border-zinc-800"
                          >
                            <span className="mt-0.5 shrink-0">
                              {isActive ? (
                                <CheckSquare className="h-4 w-4 text-emerald-400" />
                              ) : (
                                <Square className="h-4 w-4 text-zinc-650" />
                              )}
                            </span>
                            <div>
                              <span className="block text-xs font-bold text-white font-mono">{perm.action}</span>
                              {perm.description && (
                                <span className="block text-[10px] text-zinc-500 leading-tight mt-0.5">{perm.description}</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <DialogFooter className="mt-6 flex gap-2">
                  <DialogClose
                    render={
                      <Button type="button" variant="outline" className="bg-transparent border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-850" />
                    }
                  >
                    Cancelar
                  </DialogClose>
                  <Button 
                    type="submit" 
                    disabled={modalSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  >
                    {modalSubmitting ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Guardando...
                      </span>
                    ) : 'Guardar Ajustes'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </RequirePermission>
  );
}
