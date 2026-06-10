'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/core/database/supabase';
import { RequirePermission } from '@/core/auth/AuthContext';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  archiveEmployee,
  restoreEmployee,
  EmployeeWithRole,
} from '@/core/services/admin';
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
  Plus,
  UserPlus,
  Archive,
  RotateCcw,
  Pencil,
  Eye,
  EyeOff,
  Briefcase,
  Mail,
  Tag
} from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Label } from '@/core/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger,
  DialogClose
} from '@/core/components/ui/dialog';

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
  const [employees, setEmployees] = useState<EmployeeWithRole[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Create Employee Dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newOccupation, setNewOccupation] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal States
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<EmployeeWithRole | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [editName, setEditName] = useState('');
  const [editOccupation, setEditOccupation] = useState('');
  const [activePermissionIds, setActivePermissionIds] = useState<Set<string>>(new Set());
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Load all data
  const loadEmployeeData = async () => {
    setLoading(true);
    setError(null);
    try {
      const emps = await getEmployees({ showArchived });

      // Fetch roles
      const { data: dbRoles, error: rolesErr } = await supabase
        .from('roles')
        .select('id, name');

      if (rolesErr) throw rolesErr;

      // Fetch permissions
      const { data: dbPerms, error: permsErr } = await supabase
        .from('permissions')
        .select('id, action, description');

      if (permsErr) throw permsErr;

      setEmployees(emps);
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
  }, [showArchived]);

  // Create new employee
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSubmitting(true);

    if (!newName.trim() || !newEmail.trim()) {
      setCreateError('Nombre y Email son campos obligatorios.');
      setCreateSubmitting(false);
      return;
    }

    try {
      const occupationArr = newOccupation
        .split(',')
        .map(o => o.trim())
        .filter(o => o.length > 0);

      await createEmployee({
        email: newEmail.trim(),
        full_name: newName.trim(),
        occupation: occupationArr.length > 0 ? occupationArr : undefined,
      });

      // Reset & close
      setNewName('');
      setNewEmail('');
      setNewOccupation('');
      setCreateDialogOpen(false);
      loadEmployeeData();
    } catch (err: any) {
      setCreateError(err.message || 'Error al crear la cuenta.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Open Edit Dialog and pre-fill form
  const handleOpenEdit = async (employee: EmployeeWithRole) => {
    setSelectedUser(employee);
    setSelectedRoleId(employee.roleId);
    setEditName(employee.full_name || '');
    setEditOccupation((employee.occupation || []).join(', '));
    setModalError(null);
    setEditDialogOpen(true);

    if (employee.roleId) {
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

  // When changing role in dropdown, reload the permissions
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

  // Save changes
  const handleSaveConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setModalSubmitting(true);
    setModalError(null);

    try {
      const occupationArr = editOccupation
        .split(',')
        .map(o => o.trim())
        .filter(o => o.length > 0);

      // Update profile + role via service
      await updateEmployee(selectedUser.id, {
        full_name: editName.trim() || undefined,
        occupation: occupationArr,
        roleId: selectedRoleId,
        currentRoleId: selectedUser.roleId,
      });

      // Save permissions for the selected role
      if (selectedRoleId) {
        await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', selectedRoleId);

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
      console.error('Error saving user configuration:', err);
      setModalError(err.message || 'Error al guardar cambios.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Archive / Restore
  const handleArchiveToggle = async (emp: EmployeeWithRole) => {
    try {
      if (emp.is_active) {
        await archiveEmployee(emp.id);
      } else {
        await restoreEmployee(emp.id);
      }
      loadEmployeeData();
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado del empleado.');
    }
  };

  const occupationBadges = (occ: string[] | null) => {
    if (!occ || occ.length === 0) return <span className="text-zinc-600 italic text-xs">Sin asignar</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {occ.map((o, i) => (
          <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
            {o}
          </span>
        ))}
      </div>
    );
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
              <p className="text-zinc-400 text-xs mt-1">Panel de recursos humanos — Alta, edición, roles y borrado lógico.</p>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            {/* Toggle archived */}
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                showArchived
                  ? 'bg-amber-950/20 text-amber-400 border-amber-500/30'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              }`}
            >
              {showArchived ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {showArchived ? 'Mostrando Archivados' : 'Mostrar Archivados'}
            </button>

            {/* Create employee button */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger
                render={
                  <Button 
                    onClick={() => setCreateDialogOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2 h-10 px-4 text-sm shadow-lg shadow-emerald-950/40"
                  />
                }
              >
                <UserPlus className="h-4 w-4" />
                Nuevo Empleado
              </DialogTrigger>
              <DialogContent className="max-w-md bg-zinc-900 border border-zinc-800 text-white p-6 rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-emerald-400" />
                    Alta de Empleado
                  </DialogTitle>
                  <DialogDescription className="text-zinc-400 text-xs">
                    Crea una cuenta nueva. El empleado recibirá automáticamente el rol de Administrador y podrás cambiarlo después.
                  </DialogDescription>
                </DialogHeader>

                {createError && (
                  <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-lg flex items-start space-x-2 text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                    <span>{createError}</span>
                  </div>
                )}

                <form onSubmit={handleCreateEmployee} className="space-y-4 pt-3">
                  <div className="space-y-1">
                    <Label className="text-zinc-400 text-xs">Nombre Completo *</Label>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="María García López"
                      className="bg-zinc-950 border-zinc-800 text-white text-sm h-11"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-zinc-400 text-xs flex items-center gap-1">
                      <Mail className="h-3 w-3" /> Email Corporativo *
                    </Label>
                    <Input
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      type="email"
                      placeholder="maria@solarhub.cl"
                      className="bg-zinc-950 border-zinc-800 text-white text-sm h-11"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-zinc-400 text-xs flex items-center gap-1">
                      <Briefcase className="h-3 w-3" /> Ocupación (separar por comas)
                    </Label>
                    <Input
                      value={newOccupation}
                      onChange={(e) => setNewOccupation(e.target.value)}
                      placeholder="Almacén, Administración"
                      className="bg-zinc-950 border-zinc-800 text-white text-sm h-11"
                    />
                    <p className="text-zinc-600 text-[10px]">Opcional. Define las áreas de responsabilidad del colaborador.</p>
                  </div>

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
                      disabled={createSubmitting}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                    >
                      {createSubmitting ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creando...
                        </span>
                      ) : 'Crear Cuenta'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
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
                    <th className="p-4">Rol</th>
                    <th className="p-4">Ocupación</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-sm text-zinc-300">
                  {employees.map((emp) => (
                    <tr key={emp.id} className={`transition-colors ${emp.is_active ? 'hover:bg-zinc-850/30' : 'opacity-50 bg-zinc-950/30'}`}>
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
                            : emp.roleName === 'Técnico de Campo'
                            ? 'bg-amber-950/50 text-amber-400 border border-amber-500/20'
                            : 'bg-zinc-850 text-zinc-400 border border-zinc-750'
                        }`}>
                          {emp.roleName}
                        </span>
                      </td>
                      <td className="p-4">{occupationBadges(emp.occupation)}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          emp.is_active
                            ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-950/50 text-rose-400 border border-rose-500/20'
                        }`}>
                          {emp.is_active ? 'Activo' : 'Archivado'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            onClick={() => handleOpenEdit(emp)}
                            className="bg-zinc-800 hover:bg-zinc-700 hover:text-white text-zinc-300 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1"
                          >
                            <Pencil className="h-3 w-3" />
                            Editar
                          </Button>
                          <Button
                            onClick={() => handleArchiveToggle(emp)}
                            className={`text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                              emp.is_active
                                ? 'bg-zinc-800 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-300'
                                : 'bg-zinc-800 hover:bg-emerald-950/40 text-zinc-400 hover:text-emerald-300'
                            }`}
                          >
                            {emp.is_active ? (
                              <><Archive className="h-3 w-3" /> Archivar</>
                            ) : (
                              <><RotateCcw className="h-3 w-3" /> Restaurar</>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {employees.map((emp) => (
                <div key={emp.id} className={`bg-zinc-900 border-2 border-zinc-800 rounded-xl p-5 space-y-4 ${!emp.is_active ? 'opacity-60' : ''}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <div className="h-10 w-10 rounded-xl bg-emerald-700/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
                        {emp.full_name?.charAt(0).toUpperCase() || emp.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{emp.full_name || 'Sin Nombre'}</h4>
                        <p className="text-[10px] text-zinc-500 font-mono">{emp.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 bg-zinc-850 text-zinc-400 rounded border border-zinc-750">
                        {emp.roleName}
                      </span>
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                        emp.is_active
                          ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-950/50 text-rose-400 border-rose-500/20'
                      }`}>
                        {emp.is_active ? 'Activo' : 'Archivado'}
                      </span>
                    </div>
                  </div>

                  {(emp.occupation && emp.occupation.length > 0) && (
                    <div className="pt-2 border-t border-zinc-850">
                      <span className="text-[9px] text-zinc-500 uppercase font-mono block mb-1">Ocupación</span>
                      {occupationBadges(emp.occupation)}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={() => handleOpenEdit(emp)}
                      className="flex items-center justify-center gap-1.5 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg border border-zinc-700"
                      style={{ minHeight: '48px' }}
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleArchiveToggle(emp)}
                      className={`flex items-center justify-center gap-1.5 py-3 text-xs font-bold rounded-lg border ${
                        emp.is_active
                          ? 'bg-zinc-800 hover:bg-rose-950/40 text-rose-400 border-zinc-700'
                          : 'bg-zinc-800 hover:bg-emerald-950/40 text-emerald-400 border-zinc-700'
                      }`}
                      style={{ minHeight: '48px' }}
                    >
                      {emp.is_active ? (
                        <><Archive className="h-4 w-4" /> Archivar</>
                      ) : (
                        <><RotateCcw className="h-4 w-4" /> Restaurar</>
                      )}
                    </button>
                  </div>
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
                  Editar: {selectedUser.full_name || selectedUser.email}
                </DialogTitle>
              </DialogHeader>

              {modalError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-lg flex items-start space-x-2 text-xs my-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{modalError}</span>
                </div>
              )}

              <form onSubmit={handleSaveConfigSubmit} className="space-y-4 pt-3">
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs font-bold">Nombre</Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white text-sm h-10"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs font-bold flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> Ocupación (separar por comas)
                  </Label>
                  <Input
                    value={editOccupation}
                    onChange={(e) => setEditOccupation(e.target.value)}
                    placeholder="Ingeniería, Ventas"
                    className="bg-zinc-950 border-zinc-800 text-white text-sm h-10"
                  />
                </div>

                {/* Role dropdown */}
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs font-bold">Rol del Sistema</Label>
                  <select
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

                {/* Permissions checkboxes */}
                {selectedRoleId && (
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs font-bold block pb-1 border-b border-zinc-800/60">
                      Permisos del Rol
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
                    ) : 'Guardar Cambios'}
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
