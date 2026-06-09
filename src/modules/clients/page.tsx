'use client';

import React, { useState, useEffect, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Filter, 
  MapPin, 
  Phone, 
  FileText, 
  User, 
  Building, 
  Briefcase, 
  MoreVertical,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Loader2
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

export default function ClientsModule() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Form States
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<'activo' | 'inactivo' | 'prospecto'>('prospecto');
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

    if (!name.trim() || !documentId.trim()) {
      setFormError('Nombre y Cédula/RNC son campos obligatorios.');
      setFormSubmitting(false);
      return;
    }

    try {
      await createClient({
        name,
        document_id: documentId,
        phone: phone || null,
        address: address || null,
        status,
      });

      // Clear Form and Close Dialog
      setName('');
      setDocumentId('');
      setPhone('');
      setAddress('');
      setStatus('prospecto');
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-emerald-400" />
            Clientes CRM
          </h1>
          <p className="text-zinc-400 text-xs mt-1">
            Gestión centralizada de cuentas industriales, contratos y auditoría local.
          </p>
        </div>

        {/* Dialog of creation */}
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
            <DialogContent className="max-w-md bg-zinc-900 border border-zinc-800 text-white p-6 rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  Nuevo Registro de Cliente
                </DialogTitle>
                <DialogDescription className="text-zinc-400 text-xs">
                  Completa los datos fiscales y de contacto. Todos los registros se auditan e inyectan automáticamente en el tenant actual.
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
                  <Label htmlFor="name" className="text-zinc-400 text-xs">Nombre Completo / Razón Social</Label>
                  <Input 
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Distribuidora de Energía Solar S.A."
                    className="bg-zinc-950 border-zinc-800 text-white text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="documentId" className="text-zinc-400 text-xs">Cédula / RNC (Identificación Fiscal)</Label>
                  <Input 
                    id="documentId"
                    value={documentId}
                    onChange={(e) => setDocumentId(e.target.value)}
                    placeholder="1-31-88888-2"
                    className="bg-zinc-950 border-zinc-800 text-white text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="phone" className="text-zinc-400 text-xs">Teléfono de Contacto</Label>
                    <Input 
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (809) 555-0199"
                      className="bg-zinc-950 border-zinc-800 text-white text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="status" className="text-zinc-400 text-xs">Estado Inicial</Label>
                    <select
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg text-sm p-2 text-white h-9 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="prospecto">Prospecto</option>
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="address" className="text-zinc-400 text-xs">Dirección Física</Label>
                  <Input 
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Av. Winston Churchill, Santo Domingo"
                    className="bg-zinc-950 border-zinc-800 text-white text-sm"
                  />
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
                    disabled={formSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  >
                    {formSubmitting ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Guardando...
                      </span>
                    ) : 'Guardar Cliente'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </RequirePermission>
      </div>

      {/* Toolbar / Filters */}
      <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-xl flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente por nombre o RNC/Cédula..."
              className="pl-10 bg-zinc-950 border-zinc-800 text-white h-11 w-full"
            />
          </div>
          <Button type="submit" className="bg-zinc-800 hover:bg-zinc-700 text-white h-11 px-4 rounded-xl">
            Buscar
          </Button>
        </form>

        <div className="flex gap-2">
          <Button
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className={`flex items-center gap-2 h-11 px-4 rounded-xl border ${
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
            className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white h-11 px-3 rounded-xl"
            title="Limpiar filtros"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Expandable filters panel */}
      {showFiltersPanel && (
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div>
            <label className="block text-zinc-400 text-xs font-bold uppercase mb-1.5">Estado del Contrato</label>
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
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
        <div className="bg-zinc-900/40 border border-zinc-850 p-12 text-center rounded-xl">
          <Building className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-white font-bold text-base">No se encontraron clientes</h3>
          <p className="text-zinc-500 text-xs mt-1">Registra nuevos clientes o prueba cambiando los filtros de búsqueda.</p>
        </div>
      ) : (
        <>
          {/* PC Desktop View: Advanced Grid Table */}
          <div className="hidden md:block overflow-hidden bg-zinc-900 border border-zinc-800 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Identificación</th>
                  <th className="p-4">Contacto</th>
                  <th className="p-4">Dirección</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-sm text-zinc-300">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-zinc-850/30 transition-colors">
                    <td className="p-4 font-bold text-white">
                      <button 
                        onClick={() => router.push(`/clients/${client.id}`)}
                        className="hover:text-emerald-400 hover:underline transition-colors text-left"
                      >
                        {client.name}
                      </button>
                    </td>
                    <td className="p-4 font-mono text-xs">{client.document_id}</td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                          <Phone className="h-3 w-3" />
                          <span>{client.phone || 'N/D'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-zinc-400 max-w-xs truncate" title={client.address || ''}>
                      {client.address || 'Sin dirección registrada'}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
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
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-zinc-800" />
                          }
                        >
                          <MoreVertical className="h-4 w-4 text-zinc-400" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-zinc-900 border border-zinc-800 text-zinc-300">
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
                className="bg-zinc-900 border-2 border-zinc-800 rounded-xl p-5 shadow-lg space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-extrabold text-white text-base leading-tight truncate">
                      <button
                        onClick={() => router.push(`/clients/${client.id}`)}
                        className="hover:text-emerald-400 hover:underline transition-colors text-left font-extrabold"
                      >
                        {client.name}
                      </button>
                    </h3>
                    <p className="text-[10px] font-mono text-zinc-500 mt-1 uppercase">Identificación: {client.document_id}</p>
                  </div>
                  <span className={`text-[10px] font-extrabold uppercase px-3 py-1 rounded-md border ${
                    client.status === 'activo' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50' :
                    client.status === 'prospecto' ? 'bg-amber-950/80 text-amber-300 border-amber-500/50' :
                    'bg-zinc-800 text-zinc-400 border-zinc-600'
                  }`}>
                    {client.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5 text-sm text-zinc-300 pt-3 border-t border-zinc-850">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-zinc-400" />
                    <span className="font-semibold">{client.phone || 'Sin teléfono'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-zinc-400">{client.address || 'Sin dirección registrada'}</span>
                  </div>
                </div>

                {/* Tactile Action buttons - Minimum 48px tactile height */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {client.status !== 'activo' && (
                    <button
                      onClick={() => handleStatusChange(client.id, 'activo')}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 rounded-lg border border-emerald-500 transition-colors flex items-center justify-center gap-1.5"
                      style={{ minHeight: '48px' }}
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Activar</span>
                    </button>
                  )}
                  {client.status !== 'prospecto' && (
                    <button
                      onClick={() => handleStatusChange(client.id, 'prospecto')}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-3 rounded-lg border border-amber-500 transition-colors flex items-center justify-center gap-1.5"
                      style={{ minHeight: '48px' }}
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Prospecto</span>
                    </button>
                  )}
                  {client.status !== 'inactivo' && (
                    <button
                      onClick={() => handleStatusChange(client.id, 'inactivo')}
                      className="bg-zinc-800 hover:bg-zinc-700 text-rose-400 font-bold text-xs py-3 rounded-lg border border-zinc-700 transition-colors flex items-center justify-center gap-1.5"
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
