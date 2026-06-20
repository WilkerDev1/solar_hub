'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  FileText,
  Tag,
  Zap,
  Folder,
  LayoutGrid,
  Loader2,
  AlertCircle,
  Save,
  Plus,
  ExternalLink,
  CheckCircle
} from 'lucide-react';
import {
  getClientProfile,
  updateClient,
  createProject,
  createClientInline,
  searchClients,
  ClientProfile,
  ProjectRow,
  ClientRow
} from '@/core/services/clients';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/components/ui/select';

interface ClientProfileModuleProps {
  clientId: string;
}

export default function ClientProfileModule({ clientId }: ClientProfileModuleProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable form states
  const [editName, setEditName] = useState('');
  const [editDocumentId, setEditDocumentId] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editKwh, setEditKwh] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Project Dialog
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projName, setProjName] = useState('');
  const [projLocation, setProjLocation] = useState('');
  const [projGps, setProjGps] = useState('');
  const [projCapacity, setProjCapacity] = useState('');
  const [projPhase, setProjPhase] = useState<'Diseno' | 'Permisos' | 'Construccion' | 'Operacion'>('Diseno');
  const [projSubmitting, setProjSubmitting] = useState(false);
  const [projError, setProjError] = useState<string | null>(null);

  // Combobox search and inline client states inside Add Project Form
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState(clientId);
  const [selectedClientName, setSelectedClientName] = useState('');
  const [searchResults, setSearchResults] = useState<ClientRow[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [creatingClientInline, setCreatingClientInline] = useState(false);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getClientProfile(clientId);
      setProfile(data);
      // Pre-fill editable fields
      setEditName(data.name || '');
      setEditDocumentId(data.document_id || '');
      setEditPhone(data.phone || '');
      setEditAddress(data.address || '');
      setEditCategory(data.category || '');
      setEditKwh(data.avg_kwh_consumption?.toString() || '');
      setEditStatus(data.status || 'prospecto');
      setSelectedClientName(data.name || '');
    } catch (err: any) {
      setError(err.message || 'Error al cargar el perfil del cliente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [clientId]);

  // Debounced search for clients combobox
  useEffect(() => {
    if (clientSearchQuery.trim().length > 1) {
      const delay = setTimeout(async () => {
        const results = await searchClients(clientSearchQuery);
        setSearchResults(results);
      }, 300);
      return () => clearTimeout(delay);
    } else {
      setSearchResults([]);
    }
  }, [clientSearchQuery]);

  const handleStatusChange = async (newStatus: string) => {
    if (!profile) return;
    setEditStatus(newStatus);
    try {
      await updateClient(profile.id, {
        status: newStatus as any
      });
      // reload
      const data = await getClientProfile(profile.id);
      setProfile(data);
    } catch (err: any) {
      alert(err.message || 'Error al actualizar el estado.');
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      await updateClient(profile.id, {
        name: editName.trim() || profile.name,
        document_id: editDocumentId.trim() || null,
        phone: editPhone.trim() || null,
        address: editAddress.trim() || null,
        category: editCategory || null,
        avg_kwh_consumption: editKwh ? parseFloat(editKwh) : null,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadProfile();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar el expediente.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setProjError(null);
    setProjSubmitting(true);

    if (!projName.trim()) {
      setProjError('El nombre del proyecto es obligatorio.');
      setProjSubmitting(false);
      return;
    }

    try {
      await createProject({
        client_id: selectedClientId,
        name: projName.trim(),
        location: projLocation.trim() || undefined,
        gps_coordinates: projGps.trim() || undefined,
        capacity: projCapacity.trim() || undefined,
        phase: projPhase,
      });

      // Reset & close
      setProjName('');
      setProjLocation('');
      setProjGps('');
      setProjCapacity('');
      setProjPhase('Diseno');
      setProjectDialogOpen(false);

      // Reload profile to show new project
      await loadProfile();
    } catch (err: any) {
      setProjError(err.message || 'Error al crear el proyecto.');
    } finally {
      setProjSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
        <span className="text-zinc-500 text-sm font-medium">Cargando expediente del cliente...</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-6 rounded-xl flex items-center space-x-3 text-sm max-w-lg mx-auto mt-12">
        <AlertCircle className="h-6 w-6 text-rose-400" />
        <span>{error || 'Cliente no encontrado.'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Back Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/?tab=clients')}
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-550 dark:text-zinc-400 hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            style={{ minHeight: '40px', minWidth: '40px' }}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-zinc-800 dark:text-white tracking-wide">{profile.name}</h1>
            <p className="text-zinc-550 dark:text-zinc-400 text-xs mt-0.5">
              Expediente detallado — Edita los campos y guarda los cambios.
            </p>
          </div>
        </div>

        {/* Save button */}
        <Button
          onClick={handleSaveProfile}
          disabled={saving}
          className={`flex items-center gap-2 h-11 px-5 rounded-xl font-bold text-sm transition-all${
            saveSuccess
              ? 'bg-emerald-600 text-white'
              : 'bg-zinc-800 hover:bg-emerald-600 text-zinc-300 hover:text-white border border-zinc-700 hover:border-emerald-500'
          }`}
        >
          {saving ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
          ) : saveSuccess ? (
            <><CheckCircle className="h-4 w-4" /> Guardado</>
          ) : (
            <><Save className="h-4 w-4" /> Actualizar Expediente</>
          )}
        </Button>
      </div>

      {/* Editable Profile Fields */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Identity & Contact */}
        <div className="bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl space-y-5">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-white tracking-wide flex items-center gap-2 pb-3 border-b border-zinc-200/60 dark:border-zinc-800/60">
            <User className="h-4 w-4 text-emerald-400" />
            Datos del Cliente
          </h3>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-zinc-500 text-xs uppercase tracking-wider font-mono">Nombre / Razón Social</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-white text-sm h-11"
                placeholder="Nombre del cliente"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-zinc-500 text-xs uppercase tracking-wider font-mono flex items-center gap-1">
                <FileText className="h-3 w-3" /> Identificación Fiscal
              </Label>
              <Input
                value={editDocumentId}
                onChange={(e) => setEditDocumentId(e.target.value)}
                className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-white text-sm h-11"
                placeholder="Cédula / RNC (opcional)"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-zinc-500 text-xs uppercase tracking-wider font-mono flex items-center gap-1">
                <Phone className="h-3 w-3" /> Teléfono de Contacto
              </Label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-white text-sm h-11"
                placeholder="+1 (809) 555-0199"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-zinc-500 text-xs uppercase tracking-wider font-mono flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Dirección Física
              </Label>
              <Input
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-white text-sm h-11"
                placeholder="Av. Apoquindo 4500, Las Condes"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Technical Data */}
        <div className="bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl space-y-5">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-white tracking-wide flex items-center gap-2 pb-3 border-b border-zinc-200/60 dark:border-zinc-800/60">
            <Zap className="h-4 w-4 text-amber-500" />
            Datos Técnicos
          </h3>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-zinc-500 text-xs uppercase tracking-wider font-mono flex items-center gap-1">
                <Tag className="h-3 w-3" /> Categoría
              </Label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm p-2.5 text-zinc-800 dark:text-white h-11 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Sin categoría</option>
                <option value="Residencial">Residencial</option>
                <option value="Comercial">Comercial</option>
                <option value="Industrial">Industrial</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-zinc-500 text-xs uppercase tracking-wider font-mono flex items-center gap-1">
                <Zap className="h-3 w-3" /> Consumo Promedio Mensual (kWh)
              </Label>
              <Input
                value={editKwh}
                onChange={(e) => setEditKwh(e.target.value)}
                type="number"
                className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-white text-sm h-11"
                placeholder="0"
              />
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-800/50 rounded-xl p-4 mt-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="block text-zinc-500 font-mono uppercase text-[9px] mb-1">Estado</span>
                  <Select value={editStatus} onValueChange={(val) => { if (val) handleStatusChange(val); }}>
                    <SelectTrigger className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-[11px] h-8 text-zinc-800 dark:text-white w-full rounded-md px-2 flex justify-between items-center focus-visible:ring-1 focus-visible:ring-emerald-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
                      <SelectItem value="prospecto" className="text-amber-400 hover:bg-zinc-850 px-2 py-1 cursor-pointer">PROSPECTO</SelectItem>
                      <SelectItem value="activo" className="text-emerald-400 hover:bg-zinc-850 px-2 py-1 cursor-pointer">ACTIVO</SelectItem>
                      <SelectItem value="inactivo" className="text-zinc-550 dark:text-zinc-400 hover:bg-zinc-850 px-2 py-1 cursor-pointer">INACTIVO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <span className="block text-zinc-500 font-mono uppercase text-[9px]">Proyectos</span>
                  <span className="block font-bold text-zinc-800 dark:text-white mt-0.5">{profile.projects.length}</span>
                </div>
                <div>
                  <span className="block text-zinc-500 font-mono uppercase text-[9px]">Registrado</span>
                  <span className="block font-bold text-zinc-700 dark:text-zinc-300 mt-0.5">
                    {new Date(profile.created_at).toLocaleDateString('es-CL')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Associated Projects Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-lg font-bold text-zinc-800 dark:text-white tracking-wide flex items-center gap-2">
            <Folder className="h-5 w-5 text-emerald-400" />
            Proyectos Solares Asociados
          </h2>

          {/* Add Project Button */}
          <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
            <DialogTrigger
              render={
                <Button
                  onClick={() => setProjectDialogOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2 h-11 px-4 text-sm shadow-lg shadow-emerald-950/40"
                />
              }
            >
              <Plus className="h-4 w-4" />
              Añadir Proyecto
            </DialogTrigger>
            <DialogContent className="max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-white p-6 rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-zinc-800 dark:text-white flex items-center gap-2">
                  <Folder className="h-5 w-5 text-emerald-400" />
                  Nuevo Proyecto para {profile.name}
                </DialogTitle>
                <DialogDescription className="text-zinc-550 dark:text-zinc-400 text-xs">
                  Registra una obra solar vinculada a este cliente. El ID del cliente se inyecta automáticamente.
                </DialogDescription>
              </DialogHeader>

              {projError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-lg flex items-start space-x-2 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{projError}</span>
                </div>
              )}

              <form onSubmit={handleCreateProject} className="space-y-4 pt-3 text-left">
                {/* Client Selection Combobox with inline creation support */}
                <div className="space-y-1 relative">
                  <Label className="text-zinc-550 dark:text-zinc-450 text-xs font-semibold">Cliente Asociado *</Label>
                  <div className="relative">
                    <Input
                      value={clientSearchQuery || selectedClientName}
                      onChange={(e) => {
                        setClientSearchQuery(e.target.value);
                        setSelectedClientName(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                      placeholder="Buscar o escribir para crear cliente..."
                      className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-white text-sm h-11"
                    />
                    {showSuggestions && (
                      <div className="absolute top-full left-0 right-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl mt-1 max-h-48 overflow-y-auto z-50 text-sm shadow-2xl divide-y divide-zinc-800/80">
                        {searchResults.length > 0 ? (
                          searchResults.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedClientId(c.id);
                                setSelectedClientName(c.name);
                                setClientSearchQuery('');
                                setShowSuggestions(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-white transition-colors"
                              style={{ minHeight: '40px' }}
                            >
                              {c.name}
                            </button>
                          ))
                        ) : (
                          clientSearchQuery.trim().length > 1 && (
                            <div className="p-3 text-xs text-zinc-500 italic">
                              No se encontraron coincidencias.
                            </div>
                          )
                        )}
                        {clientSearchQuery.trim().length > 0 && (
                          <button
                            type="button"
                            onClick={async () => {
                              setCreatingClientInline(true);
                              try {
                                const newClient = await createClientInline(clientSearchQuery);
                                setSelectedClientId(newClient.id);
                                setSelectedClientName(newClient.name);
                                setClientSearchQuery('');
                                setShowSuggestions(false);
                              } catch (err: any) {
                                alert('Error al crear cliente inline: ' + err.message);
                              } finally {
                                setCreatingClientInline(false);
                              }
                            }}
                            disabled={creatingClientInline}
                            className="w-full text-left px-4 py-3 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/40 hover:text-emerald-300 font-bold text-xs transition-colors flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800"
                            style={{ minHeight: '48px' }}
                          >
                            <span>+ Crear "{clientSearchQuery}" en caliente</span>
                            {creatingClientInline && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-zinc-550 dark:text-zinc-400 text-xs">Nombre del Proyecto *</Label>
                  <Input
                    value={projName}
                    onChange={(e) => setProjName(e.target.value)}
                    placeholder="Planta Solar Copiapó 50MW"
                    className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-white text-sm h-11"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-zinc-550 dark:text-zinc-400 text-xs">Ubicación</Label>
                    <Input
                      value={projLocation}
                      onChange={(e) => setProjLocation(e.target.value)}
                      placeholder="Copiapó, Atacama"
                      className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-white text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-zinc-550 dark:text-zinc-400 text-xs">Capacidad (kWp/MWp)</Label>
                    <Input
                      value={projCapacity}
                      onChange={(e) => setProjCapacity(e.target.value)}
                      placeholder="100 MWp"
                      className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-white text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-zinc-550 dark:text-zinc-400 text-xs">Coordenadas GPS de la Obra</Label>
                  <Input
                    value={projGps}
                    onChange={(e) => setProjGps(e.target.value)}
                    placeholder="-27.3670,-70.3320"
                    className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-white text-sm font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-zinc-550 dark:text-zinc-400 text-xs">Fase Inicial</Label>
                  <select
                    value={projPhase}
                    onChange={(e) => setProjPhase(e.target.value as any)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm p-2 text-zinc-800 dark:text-white h-9 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Diseno">Diseño</option>
                    <option value="Permisos">Permisos</option>
                    <option value="Construccion">Construcción</option>
                    <option value="Operacion">Operación</option>
                  </select>
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
                    disabled={projSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  >
                    {projSubmitting ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creando...
                      </span>
                    ) : 'Crear Proyecto'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {profile.projects.length === 0 ? (
          <div className="bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-850 p-12 text-center rounded-xl">
            <LayoutGrid className="h-10 w-10 text-zinc-650 mx-auto mb-3" />
            <h3 className="text-zinc-550 dark:text-zinc-400 font-bold text-sm">Ningún proyecto contratado</h3>
            <p className="text-zinc-500 text-xs mt-1">Añade el primer proyecto solar para este cliente.</p>
          </div>
        ) : (
          <>
            {/* PC Desktop View: Projects Grid-Table */}
            <div className="hidden md:block overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-850 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                    <th className="p-4">Proyecto</th>
                    <th className="p-4">Ubicación</th>
                    <th className="p-4">Capacidad</th>
                    <th className="p-4">GPS Obra</th>
                    <th className="p-4">Fase</th>
                    <th className="p-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-sm text-zinc-700 dark:text-zinc-300">
                  {profile.projects.map((proj) => (
                    <tr key={proj.id} className="hover:bg-zinc-100 dark:hover:bg-zinc-850/20 transition-colors">
                      <td className="p-4 font-bold text-zinc-800 dark:text-white">{proj.name}</td>
                      <td className="p-4 text-xs text-zinc-550 dark:text-zinc-400">{proj.location || 'N/D'}</td>
                      <td className="p-4 text-xs font-mono text-zinc-700 dark:text-zinc-300">{proj.capacity || 'N/D'}</td>
                      <td className="p-4">
                        {proj.gps_coordinates ? (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(proj.gps_coordinates)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 hover:underline font-mono"
                          >
                            <MapPin className="h-3 w-3" />
                            {proj.gps_coordinates}
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        ) : (
                          <span className="text-xs text-zinc-600 italic">Sin GPS</span>
                        )}
                      </td>
                      <td className="p-4 text-xs font-semibold text-emerald-400">{proj.phase}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          proj.status === 'completado' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/20' :
                          proj.status === 'en_progreso' ? 'bg-amber-950/50 text-amber-400 border border-amber-500/20' :
                          'bg-rose-950/50 text-rose-400 border border-rose-500/20'
                        }`}>
                          {proj.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View: Projects Cards */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {profile.projects.map((proj) => (
                <div key={proj.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-zinc-800 dark:text-white text-sm truncate">{proj.name}</h4>
                      <p className="text-[10px] text-emerald-400 mt-1 uppercase font-semibold">Fase: {proj.phase}</p>
                    </div>
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                      proj.status === 'completado' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30' :
                      proj.status === 'en_progreso' ? 'bg-amber-950/80 text-amber-300 border-amber-500/30' :
                      'bg-rose-950/80 text-rose-300 border-rose-500/30'
                    }`}>
                      {proj.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-zinc-200 dark:border-zinc-850">
                    <div className="space-y-0.5">
                      <span className="block text-[9px] text-zinc-500 uppercase font-mono">Ubicación</span>
                      <span className="block text-zinc-700 dark:text-zinc-300 truncate">{proj.location || 'N/D'}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="block text-[9px] text-zinc-500 uppercase font-mono">Capacidad</span>
                      <span className="block text-zinc-700 dark:text-zinc-300 font-mono truncate">{proj.capacity || 'N/D'}</span>
                    </div>
                  </div>

                  {proj.gps_coordinates && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(proj.gps_coordinates)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-600 hover:text-white text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition-all duration-200 border border-zinc-200 dark:border-zinc-750"
                      style={{ minHeight: '48px' }}
                    >
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span>Ver en Google Maps</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
