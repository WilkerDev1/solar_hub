'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Filter, 
  Phone, 
  User, 
  Building, 
  Briefcase, 
  MoreVertical,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Loader2,
  Tag,
  ChevronRight
} from 'lucide-react';
import { 
  getClients, 
  createClient, 
  updateClientStatus, 
  ClientRow 
} from '@/core/services/clients';
import { RequirePermission } from '@/core/auth/AuthContext';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Label } from '@/core/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose
} from '@/core/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/core/components/ui/dropdown-menu';

const categoryBadge = (cat: string | null) => {
  switch (cat) {
    case 'Residencial':
      return 'bg-blue-950/50 text-blue-400 border-blue-500/20';
    case 'Comercial':
      return 'bg-amber-950/50 text-amber-400 border-amber-500/20';
    case 'Industrial':
      return 'bg-purple-950/50 text-purple-400 border-purple-500/20';
    default:
      return 'bg-zinc-800 text-zinc-400 border-zinc-700';
  }
};

export default function ClientsModule() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Form States — Solo nombre obligatorio
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch clients from services
  const loadClientsList = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getClients({
        status: statusFilter,
        search: search.trim() !== '' ? search : undefined
      });
      setClients(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los clientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientsList();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadClientsList();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    loadClientsList();
  };

  const handleCreateClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);

    if (!name.trim()) {
      setFormError('El nombre del cliente es obligatorio.');
      setFormSubmitting(false);
      return;
    }

    try {
      await createClient({ name: name.trim() });

      // Clear Form and Close Dialog
      setName('');
      setDialogOpen(false);
      
      // Reload list
      loadClientsList();
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar el cliente.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleStatusChange = async (clientId: string, newStatus: 'activo' | 'inactivo' | 'prospecto') => {
    try {
      await updateClientStatus(clientId, newStatus);
      loadClientsList();
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800 dark:text-white tracking-wide flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-emerald-400" />
            Clientes CRM
          </h1>
          <p className="text-zinc-550 dark:text-zinc-400 text-xs mt-1">
            Gestión centralizada de cuentas industriales, contratos y auditoría local.
          </p>
        </div>

        {/* Dialog of creation — SIMPLIFIED: Solo nombre */}
        <RequirePermission action="client:write">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger
              render={
                <Button 
                  onClick={() => setDialogOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2 h-11 px-4 text-sm w-full sm:w-auto shadow-lg shadow-emerald-950/40"
                />
              }
            >
              <Plus className="h-4 w-4" />
              Registrar Cliente
            </DialogTrigger>
            <DialogContent className="max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-white p-6 rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-zinc-800 dark:text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  Registro Rápido
                </DialogTitle>
                <DialogDescription className="text-zinc-550 dark:text-zinc-400 text-xs">
                  Ingresa el nombre del cliente o empresa. Los datos técnicos se completan después desde el expediente.
                </DialogDescription>
              </DialogHeader>

              {formError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-lg flex items-start space-x-2 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateClientSubmit} className="space-y-4 pt-3">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-zinc-550 dark:text-zinc-400 text-xs">Nombre Completo / Razón Social</Label>
                  <Input 
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Distribuidora de Energía Solar S.A."
                    className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-white text-sm h-11"
                    autoFocus
                  />
                </div>

                <DialogFooter className="mt-6 flex gap-2">
                  <DialogClose
                    render={
                      <Button type="button" variant="outline" className="bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-550 dark:text-zinc-400 hover:text-white hover:bg-zinc-850" />
                    }
                  >
                    Cancelar
                  </DialogClose>
                  <Button 
                    type="submit" 
                    disabled={formSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  >
                    {formSubmitting ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Guardando...
                      </span>
                    ) : 'Crear Cliente'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </RequirePermission>
      </div>

      {/* Toolbar / Filters */}
      <div className="bg-zinc-50/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente por nombre o RNC/Cédula..."
              className="pl-10 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-white h-11 w-full"
            />
          </div>
          <Button type="submit" className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-white h-11 px-4 rounded-xl">
            Buscar
          </Button>
        </form>

        <div className="flex gap-2">
          <Button
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className={`flex items-center gap-2 h-11 px-4 rounded-xl border${
              showFiltersPanel 
                ? 'bg-emerald-950/20 text-emerald-400 border-emerald-500/30' 
                : 'bg-zinc-850 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
            }`}
          >
            <Filter className="h-4 w-4" />
            <span>Filtros</span>
          </Button>

          <Button
            onClick={handleResetFilters}
            className="bg-white dark:bg-zinc-950 hover:bg-zinc-150 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-550 dark:text-zinc-400 hover:text-white h-11 px-3 rounded-xl"
            title="Limpiar filtros"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Expandable filters panel */}
      {showFiltersPanel && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div>
            <label className="block text-zinc-550 dark:text-zinc-400 text-xs font-bold uppercase mb-1.5">Estado del Contrato</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'activo', label: 'Activo' },
                { id: 'prospecto', label: 'Prospecto' },
                { id: 'inactivo', label: 'Inactivo' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setStatusFilter(filter.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border${
                    statusFilter === filter.id
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                  style={{ minHeight: '36px' }}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error / Loading States */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl flex items-center space-x-3 text-sm">
          <AlertCircle className="h-5 w-5 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
          <span className="text-zinc-500 text-xs font-medium">Buscando en base de datos...</span>
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-850 p-12 text-center rounded-xl">
          <Building className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-zinc-800 dark:text-white font-bold text-base">No se encontraron clientes</h3>
          <p className="text-zinc-500 text-xs mt-1">Registra nuevos clientes o prueba cambiando los filtros de búsqueda.</p>
        </div>
      ) : (
        <>
          {/* PC Desktop View: Advanced Grid Table */}
          <div className="hidden md:block overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-550 dark:text-zinc-400 font-bold uppercase tracking-wider">
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Identificación</th>
                  <th className="p-4">Contacto</th>
                  <th className="p-4">Categoría</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-sm text-zinc-700 dark:text-zinc-300">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-zinc-100 dark:hover:bg-zinc-850/30 transition-colors group">
                    <td className="p-4 font-bold text-zinc-800 dark:text-white">
                      <button 
                        onClick={() => router.push(`/clients/${client.id}`)}
                        className="hover:text-emerald-400 hover:underline transition-colors text-left flex items-center gap-2"
                      >
                        {client.name}
                        <ChevronRight className="h-3 w-3 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
                      </button>
                    </td>
                    <td className="p-4 font-mono text-xs">{client.document_id || <span className="text-zinc-600 italic">Sin ID</span>}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-zinc-550 dark:text-zinc-400 text-xs">
                        <Phone className="h-3 w-3" />
                        <span>{client.phone || 'N/D'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${categoryBadge(client.category)}`}>
                        <Tag className="h-2.5 w-2.5" />
                        {client.category || 'Sin categoría'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase${
                        client.status === 'activo' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/20' :
                        client.status === 'prospecto' ? 'bg-amber-950/50 text-amber-400 border border-amber-500/20' :
                        'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-800" />
                          }
                        >
                          <MoreVertical className="h-4 w-4 text-zinc-550 dark:text-zinc-400" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
                          <DropdownMenuItem 
                            onClick={() => router.push(`/clients/${client.id}`)}
                            className="hover:bg-zinc-850 focus:bg-zinc-850 cursor-pointer"
                          >
                            Ver Expediente
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(client.id, 'activo')}
                            className="hover:bg-zinc-850 focus:bg-zinc-850 cursor-pointer"
                          >
                            Marcar como Activo
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(client.id, 'prospecto')}
                            className="hover:bg-zinc-850 focus:bg-zinc-850 cursor-pointer"
                          >
                            Marcar como Prospecto
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(client.id, 'inactivo')}
                            className="hover:bg-zinc-850 focus:bg-zinc-850 cursor-pointer text-rose-400 focus:text-rose-400"
                          >
                            Marcar como Inactivo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View: High Contrast Cards optimized for Outdoor/Field Work */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {clients.map((client) => (
              <div 
                key={client.id} 
                className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-lg space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-extrabold text-zinc-800 dark:text-white text-base leading-tight truncate">
                      <button
                        onClick={() => router.push(`/clients/${client.id}`)}
                        className="hover:text-emerald-400 hover:underline transition-colors text-left font-extrabold"
                      >
                        {client.name}
                      </button>
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${categoryBadge(client.category)}`}>
                        {client.category || 'Sin cat.'}
                      </span>
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border${
                        client.status === 'activo' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50' :
                        client.status === 'prospecto' ? 'bg-amber-950/80 text-amber-300 border-amber-500/50' :
                        'bg-zinc-800 text-zinc-400 border-zinc-600'
                      }`}>
                        {client.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 pt-2 border-t border-zinc-200 dark:border-zinc-850">
                  <Phone className="h-4 w-4 text-zinc-550 dark:text-zinc-400" />
                  <span className="font-semibold">{client.phone || 'Sin teléfono'}</span>
                </div>

                {/* Tactile Action buttons - Minimum 48px tactile height */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => router.push(`/clients/${client.id}`)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 rounded-lg border border-emerald-500 transition-colors flex items-center justify-center gap-1.5 col-span-2"
                    style={{ minHeight: '48px' }}
                  >
                    <User className="h-4 w-4" />
                    <span>Ver Expediente</span>
                  </button>
                  {client.status !== 'activo' && (
                    <button
                      onClick={() => handleStatusChange(client.id, 'activo')}
                      className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-emerald-400 font-bold text-xs py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors flex items-center justify-center gap-1.5"
                      style={{ minHeight: '48px' }}
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Activar</span>
                    </button>
                  )}
                  {client.status !== 'inactivo' && (
                    <button
                      onClick={() => handleStatusChange(client.id, 'inactivo')}
                      className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-rose-400 font-bold text-xs py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors flex items-center justify-center gap-1.5"
                      style={{ minHeight: '48px' }}
                    >
                      <AlertCircle className="h-4 w-4" />
                      <span>Inactivar</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
