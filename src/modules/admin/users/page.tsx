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
  getUniqueOccupations,
  resetEmployeePassword,
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

  // Suggested occupations and password reset states
  const [suggestedOccupations, setSuggestedOccupations] = useState<string[]>([]);
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [resetPasswordSubmitting, setResetPasswordSubmitting] = useState(false);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(false);

  // Load all data
  const loadEmployeeData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch employees
      const data = await getEmployees();
      setEmployees(data);

      // 2. Fetch role templates
      const { data: dbRoles, error: rolesErr } = await supabase
        .from('roles')
        .select('id, name');
      
      if (rolesErr) throw rolesErr;
      setRoles(dbRoles || []);

      // 3. Fetch permissions catalog
      const { data: dbPerms, error: permsErr } = await supabase
        .from('permissions')
        .select('id, action, description');
      
      if (permsErr) throw permsErr;
      setAllPermissions(dbPerms || []);

      // 4. Fetch suggested occupations
      const occs = await getUniqueOccupations();
      setSuggestedOccupations(occs);

    } catch (err: any) {
      console.error('Error loading employee config data:', err);
      setError(err.message || 'Error al cargar listado de personal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployeeData();
  }, []);

  // Filter list
  const filteredEmployees = employees.filter(emp => {
    if (showArchived) return !emp.is_active;
    return emp.is_active;
  });

  // Modal open
  const handleOpenEdit = async (emp: EmployeeWithRole) => {
    setSelectedUser(emp);
    setEditName(emp.full_name || '');
    setSelectedRoleId(emp.roleId || '');
    setEditOccupation(emp.occupation ? emp.occupation.join(', ') : '');
    setModalError(null);
    setResetPasswordVal('');
    setResetPasswordSuccess(false);

    // Load active specific perms for this user (if any)
    if (emp.roleId) {
      try {
        const { data: activePerms } = await supabase
          .from('role_permissions')
          .select('permission_id')
          .eq('role_id', emp.roleId);
        
        const activeSet = new Set((activePerms || []).map(p => p.permission_id));
        setActivePermissionIds(activeSet);
      } catch (e) {
        console.error('Error loading role permissions:', e);
      }
    } else {
      setActivePermissionIds(new Set());
    }

    setEditDialogOpen(true);
  };

  // Toggle permission in dialog local state
  const handleTogglePermission = (permId: string) => {
    const next = new Set(activePermissionIds);
    if (next.has(permId)) {
      next.delete(permId);
    } else {
      next.add(permId);
    }
    setActivePermissionIds(next);
  };

  const handleRoleSelectChange = async (roleId: string) => {
    setSelectedRoleId(roleId);
    if (roleId) {
      try {
        const { data: activePerms } = await supabase
          .from('role_permissions')
          .select('permission_id')
          .eq('role_id', roleId);
        
        const activeSet = new Set((activePerms || []).map(p => p.permission_id));
        setActivePermissionIds(activeSet);
      } catch (e) {
        console.error('Error fetching role permissions on select change:', e);
      }
    } else {
      setActivePermissionIds(new Set());
    }
  };

  // Create Submit
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      setCreateError('El nombre y el correo electrónico corporativo son mandatorios.');
      return;
    }
    setCreateSubmitting(true);
    setCreateError(null);

    try {
      const occupationArr = newOccupation
        .split(',')
        .map(o => o.trim())
        .filter(o => o.length > 0);

      // Trigger user profile creation
      await createEmployee({
        email: newEmail.trim(),
        full_name: newName.trim(),
        occupation: occupationArr
      });

      // Clear states & reload
      setNewName('');
      setNewEmail('');
      setNewOccupation('');
      setCreateDialogOpen(false);
      loadEmployeeData();
    } catch (err: any) {
      console.error('Error creating employee:', err);
      setCreateError(err.message || 'Error al guardar colaborador.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Edit Submit
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
    if (!occ || occ.length === 0) return <span className="text-zinc-500 italic text-xs">Sin asignar</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {occ.map((o, i) => (
          <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded-none text-[9px] font-bold bg-zinc-900 text-zinc-300 border border-zinc-700">
            {o}
          </span>
        ))}
      </div>
    );
  };

  return (
    <RequirePermission action="admin:*" fallback={
      <div className="bg-zinc-800 border border-zinc-700 p-8 text-center rounded-none max-w-md mx-auto mt-12">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-4" />
        <h3 className="text-white font-bold text-lg">Acceso Denegado</h3>
        <p className="text-zinc-400 text-sm mt-2">No tienes privilegios administrativos para gestionar roles y permisos.</p>
      </div>
    }>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-700 pb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/?tab=admin')}
              className="h-10 w-10 flex items-center justify-center rounded-none bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              style={{ minHeight: '40px', minWidth: '40px' }}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="text-left">
              <h1 className="text-xl font-bold text-white tracking-wide">Gestión de Empleados</h1>
              <p className="text-zinc-500 text-xs mt-1">Panel de recursos humanos — Alta, edición, roles y borrado lógico.</p>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            {/* Toggle archived */}
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-none text-xs font-bold border transition-colors cursor-pointer ${
                showArchived
                  ? 'bg-amber-950/20 text-amber-405 border-amber-500/30'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-zinc-200'
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
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-none flex items-center gap-2 h-10 px-4 text-sm cursor-pointer"
                  />
                }
              >
                <UserPlus className="h-4 w-4" />
                Nuevo Empleado
              </DialogTrigger>
              <DialogContent className="max-w-md bg-[#24252a] border border-[#2c2d34]/80 text-white p-6 rounded-none">
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
                  <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-none flex items-start space-x-2 text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-455" />
                    <span>{createError}</span>
                  </div>
                )}

                <form onSubmit={handleCreateEmployee} className="space-y-4 pt-3 text-left">
                  <div className="space-y-1">
                    <Label className="text-zinc-405 text-xs">Nombre Completo *</Label>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="María García López"
                      className="bg-[#1e1e24] border-[#2c2d34]/60 text-white text-sm h-11 rounded-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-zinc-405 text-xs flex items-center gap-1">
                      <Mail className="h-3 w-3" /> Email Corporativo *
                    </Label>
                    <Input
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      type="email"
                      placeholder="maria@solarhub.cl"
                      className="bg-[#1e1e24] border-[#2c2d34]/60 text-white text-sm h-11 rounded-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-zinc-405 text-xs flex items-center gap-1">
                      <Briefcase className="h-3 w-3" /> Ocupación (separar por comas)
                    </Label>
                    <Input
                      value={newOccupation}
                      onChange={(e) => setNewOccupation(e.target.value)}
                      placeholder="Almacén, Administración"
                      className="bg-[#1e1e24] border-[#2c2d34]/60 text-white text-sm h-11 rounded-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                      list="suggested-occupations-list"
                    />
                    <p className="text-zinc-500 text-[10px]">Opcional. Define las áreas de responsabilidad del colaborador.</p>
                  </div>

                  <DialogFooter className="mt-6 flex gap-2">
                    <DialogClose
                      render={
                        <Button type="button" variant="outline" className="bg-transparent border-[#2c2d34]/60 text-zinc-400 hover:text-white hover:bg-[#2c2d34] rounded-none" />
                      }
                    >
                      Cancelar
                    </DialogClose>
                    <Button
                      type="submit"
                      disabled={createSubmitting}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-none cursor-pointer"
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
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-350 p-4 rounded-none flex items-center space-x-3 text-sm">
            <AlertCircle className="h-5 w-5 text-rose-455" />
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
            <div className="hidden md:block overflow-hidden bg-[#24252a] border border-[#2c2d34]/60 rounded-none">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1e1e24] border-b border-[#2c2d34]/60 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                    <th className="p-4">Colaborador</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Rol</th>
                    <th className="p-4">Ocupación</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2c2d34]/40 text-sm text-zinc-300">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className={`transition-colors ${emp.is_active ? 'hover:bg-[#2c2d34]/40' : 'opacity-50 bg-[#1e1e24]/20'}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-none bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                            {emp.full_name?.charAt(0).toUpperCase() || emp.email.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-white">{emp.full_name || 'Sin Nombre'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-zinc-400 font-mono text-xs">{emp.email}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-none text-[10px] font-bold uppercase ${
                          emp.roleName === 'Administrador' 
                            ? 'bg-purple-950/50 text-purple-400 border border-purple-500/20' 
                            : emp.roleName === 'Técnico de Campo'
                            ? 'bg-amber-950/50 text-amber-400 border border-amber-500/20'
                            : 'bg-[#1e1e24] text-zinc-400 border border-[#2c2d34]/60'
                        }`}>
                          {emp.roleName}
                        </span>
                      </td>
                      <td className="p-4">{occupationBadges(emp.occupation)}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-none text-[9px] font-bold uppercase ${
                          emp.is_active
                            ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-950/50 text-rose-455 border border-rose-500/20'
                        }`}>
                          {emp.is_active ? 'Activo' : 'Archivado'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            onClick={() => handleOpenEdit(emp)}
                            className="bg-[#1e1e24] border border-[#2c2d34]/60 hover:bg-[#2c2d34] text-zinc-300 hover:text-white text-xs px-2.5 py-1 rounded-none flex items-center gap-1 cursor-pointer"
                          >
                            <Pencil className="h-3 w-3" />
                            Editar
                          </Button>
                          <Button
                            onClick={() => handleArchiveToggle(emp)}
                            className={`text-xs px-2.5 py-1 rounded-none flex items-center gap-1 cursor-pointer ${
                              emp.is_active
                                ? 'bg-[#1e1e24] border border-[#2c2d34]/60 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-350'
                                : 'bg-[#1e1e24] border border-[#2c2d34]/60 hover:bg-emerald-950/40 text-zinc-400 hover:text-emerald-350'
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
              {filteredEmployees.map((emp) => (
                <div key={emp.id} className={`bg-[#24252a] border border-[#2c2d34]/60 rounded-none p-5 space-y-4 text-left ${!emp.is_active ? 'opacity-60' : ''}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <div className="h-10 w-10 rounded-none bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                        {emp.full_name?.charAt(0).toUpperCase() || emp.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{emp.full_name || 'Sin Nombre'}</h4>
                        <p className="text-[10px] text-zinc-500 font-mono">{emp.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 bg-[#1e1e24] text-zinc-400 rounded-none border border-[#2c2d34]/60">
                        {emp.roleName}
                      </span>
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-none border ${
                        emp.is_active
                          ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-950/50 text-rose-455 border border-rose-500/20'
                      }`}>
                        {emp.is_active ? 'Activo' : 'Archivado'}
                      </span>
                    </div>
                  </div>

                  {(emp.occupation && emp.occupation.length > 0) && (
                    <div className="pt-2 border-t border-[#2c2d34]/40">
                      <span className="text-[9px] text-zinc-500 uppercase font-mono block mb-1">Ocupación</span>
                      {occupationBadges(emp.occupation)}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={() => handleOpenEdit(emp)}
                      className="flex items-center justify-center gap-1.5 py-3 bg-[#1e1e24] hover:bg-[#2c2d34] text-zinc-300 hover:text-white text-xs font-bold rounded-none border border-[#2c2d34]/60 cursor-pointer"
                      style={{ minHeight: '48px' }}
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleArchiveToggle(emp)}
                      className={`flex items-center justify-center gap-1.5 py-3 text-xs font-bold rounded-none border cursor-pointer ${
                        emp.is_active
                          ? 'bg-[#1e1e24] hover:bg-rose-950/40 text-rose-405 border-[#2c2d34]/60'
                          : 'bg-[#1e1e24] hover:bg-emerald-950/40 text-emerald-405 border-[#2c2d34]/60'
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
            <DialogContent className="max-w-md bg-[#24252a] border border-[#2c2d34]/80 text-white p-6 rounded-none text-left">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <UserCog className="h-5 w-5 text-emerald-400" />
                  Editar: {selectedUser.full_name || selectedUser.email}
                </DialogTitle>
              </DialogHeader>

              {modalError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-none flex items-start space-x-2 text-xs my-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-455" />
                  <span>{modalError}</span>
                </div>
              )}

              <form onSubmit={handleSaveConfigSubmit} className="space-y-4 pt-3 text-left">
                <div className="space-y-1">
                  <Label className="text-zinc-405 text-xs font-bold">Nombre</Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-[#1e1e24] border-[#2c2d34]/60 text-white text-sm h-10 rounded-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-zinc-405 text-xs font-bold flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> Ocupación (separar por comas)
                  </Label>
                  <Input
                    value={editOccupation}
                    onChange={(e) => setEditOccupation(e.target.value)}
                    placeholder="Ingeniería, Ventas"
                    className="bg-[#1e1e24] border-[#2c2d34]/60 text-white text-sm h-10 rounded-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                    list="suggested-occupations-list"
                  />
                </div>

                {/* Role dropdown */}
                <div className="space-y-1">
                  <Label className="text-zinc-405 text-xs font-bold">Rol del Sistema</Label>
                  <select
                    value={selectedRoleId}
                    onChange={(e) => handleRoleSelectChange(e.target.value)}
                    className="w-full bg-[#1e1e24] border border-[#2c2d34]/60 rounded-none text-sm p-2 text-white h-9 focus:border-emerald-500 outline-none"
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
                    <Label className="text-zinc-405 text-xs font-bold block pb-1 border-b border-[#2c2d34]/60">
                      Permisos del Rol
                    </Label>
                    
                    <div className="max-h-52 overflow-y-auto space-y-1.5 pr-2 scrollbar-thin">
                      {allPermissions.map((perm) => {
                        const isActive = activePermissionIds.has(perm.id);
                        return (
                          <button
                            key={perm.id}
                            type="button"
                            onClick={() => handleTogglePermission(perm.id)}
                            className="w-full flex items-start text-left gap-3 p-2 bg-[#1e1e24] border border-[#2c2d34]/60 hover:border-zinc-550 rounded-none transition-colors"
                          >
                            <span className="mt-0.5 shrink-0">
                              {isActive ? (
                                <CheckSquare className="h-4 w-4 text-emerald-400" />
                              ) : (
                                <Square className="h-4 w-4 text-zinc-500" />
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

                {/* Password Reset Section */}
                <div className="space-y-2 pt-4 border-t border-[#2c2d34]/60">
                  <Label className="text-zinc-405 text-xs font-bold block">Restablecer Contraseña</Label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="Nueva contraseña temporal"
                      value={resetPasswordVal}
                      onChange={(e) => setResetPasswordVal(e.target.value)}
                      className="bg-[#1e1e24] border-[#2c2d34]/60 text-white text-sm h-10 flex-1 rounded-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                    />
                    <Button
                      type="button"
                      disabled={resetPasswordSubmitting || !resetPasswordVal.trim()}
                      onClick={async () => {
                        if (!selectedUser) return;
                        setResetPasswordSubmitting(true);
                        try {
                          await resetEmployeePassword(selectedUser.id, resetPasswordVal);
                          setResetPasswordSuccess(true);
                          setResetPasswordVal('');
                          setTimeout(() => setResetPasswordSuccess(false), 3000);
                        } catch (err: any) {
                          alert(err.message || 'Error al restablecer la contraseña.');
                        } finally {
                          setResetPasswordSubmitting(false);
                        }
                      }}
                      className="bg-[#1e1e24] border border-[#2c2d34]/60 hover:bg-[#2c2d34] text-white text-xs px-3 font-semibold h-10 rounded-none cursor-pointer"
                    >
                      {resetPasswordSubmitting ? 'Procesando...' : resetPasswordSuccess ? '¡Listo!' : 'Cambiar'}
                    </Button>
                  </div>
                  <p className="text-zinc-550 text-[10px]">Permite soporte técnico inmediato en campo para el usuario.</p>
                </div>

                <DialogFooter className="mt-6 flex gap-2">
                  <DialogClose
                    render={
                      <Button type="button" variant="outline" className="bg-transparent border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-none" />
                    }
                  >
                    Cancelar
                  </DialogClose>
                  <Button 
                    type="submit" 
                    disabled={modalSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-none cursor-pointer"
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
      <datalist id="suggested-occupations-list">
        {suggestedOccupations.map((occ) => (
          <option key={occ} value={occ} />
        ))}
      </datalist>
    </RequirePermission>
  );
}
