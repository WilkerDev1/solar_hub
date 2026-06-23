'use client';

import React, { useState, useEffect } from 'react';
import { 
  Archive, Plus, ArrowRightLeft, PackageCheck, Search, FileText,
  SlidersHorizontal, Loader2, Settings, AlertTriangle, TrendingUp,
  Trash2, Edit2, FolderPlus, Tag, History, User, Calendar, 
  DollarSign, Sliders, X, ChevronRight, Check, Info, LayoutGrid, List
} from 'lucide-react';
import { RequirePermission } from '@/core/auth/AuthContext';
import { supabase } from '@/core/database/supabase';
import { Button } from '@/core/components/ui/button';
import {
  getInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  getLatestTransactionsMap,
  deleteInventoryItem,
  getCategories,
  createCategory,
  deleteCategory,
  getTags,
  createTag,
  deleteTag,
  processBulkStockAdjustments,
  getInventoryTransactions,
  getInventoryAnalytics,
  uploadInventoryItemImage,
  InventoryItemRow,
  InventoryCategoryRow,
  InventoryTagRow,
  InventoryTransactionWithUser,
  InventoryAnalytics,
  BulkAdjustment
} from '@/core/services/inventory';

export default function InventoryModule() {
  const [items, setItems] = useState<InventoryItemRow[]>([]);
  const [categories, setCategories] = useState<InventoryCategoryRow[]>([]);
  const [tags, setTags] = useState<InventoryTagRow[]>([]);
  const [analytics, setAnalytics] = useState<InventoryAnalytics | null>(null);
  const [latestTxMap, setLatestTxMap] = useState<any>({});
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [selectedTag, setSelectedTag] = useState('todos');
  const [filterLowStock, setFilterLowStock] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItemRow | null>(null);
  const [itemTransactions, setItemTransactions] = useState<InventoryTransactionWithUser[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Ingresar Material Form State
  const [addForm, setAddForm] = useState({
    name: '',
    sku: '',
    category_id: '',
    description: '',
    cost: 0,
    unit: 'unidades',
    packaging: '',
    length: '',
    weight: '',
    stock: 0,
    min_stock: 0,
    providers: '',
    selectedTags: [] as string[]
  });

  // Config WMS state
  const [configTab, setConfigTab] = useState<'categories' | 'tags' | 'providers'>('categories');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newTagName, setNewTagName] = useState('');

  // Bulk Adjustment grid state
  const [bulkList, setBulkList] = useState<any[]>([]);

  // Multi-image upload states
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Edit Ficha state
  const [isEditing, setIsEditing] = useState(false);
  const [activeImgUrl, setActiveImgUrl] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    sku: '',
    category_id: '',
    description: '',
    cost: 0,
    unit: 'unidades',
    packaging: '',
    length: '',
    weight: '',
    stock: 0,
    min_stock: 0,
    providers: '',
    selectedTags: [] as string[],
    image_urls: [] as string[]
  });

  // Load everything
  const loadData = async () => {
    setLoading(true);
    try {
      const [allItems, allCats, allTags, allAn, allTx] = await Promise.all([
        getInventoryItems({
          searchQuery: searchQuery || undefined,
          categoryId: selectedCategory !== 'todos' ? selectedCategory : undefined,
          tag: selectedTag !== 'todos' ? selectedTag : undefined,
          filterLowStock
        }),
        getCategories(),
        getTags(),
        getInventoryAnalytics().catch(() => null),
        getLatestTransactionsMap().catch(() => ({}))
      ]);

      setItems(allItems);
      setCategories(allCats);
      setTags(allTags);
      if (allAn) setAnalytics(allAn);
      setLatestTxMap(allTx);
    } catch (e) {
      console.error('Error loading inventory data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, selectedCategory, selectedTag, filterLowStock]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Open Detail Drawer
  const handleOpenDetail = async (item: InventoryItemRow) => {
    setSelectedItem(item);
    setActiveImgUrl(item.image_urls?.[0] || item.image_url || null);
    setIsEditing(false);
    setIsDetailDrawerOpen(true);
    setLoadingTransactions(true);
    try {
      const txs = await getInventoryTransactions(item.id);
      setItemTransactions(txs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Image upload handler for creation
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingImage(true);
    try {
      const urls: string[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const url = await uploadInventoryItemImage(file, addForm.name);
        urls.push(url);
      }
      setUploadedImages(prev => [...prev, ...urls]);
    } catch (err: any) {
      alert('Error al subir imágenes: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // Create Item
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const formattedProviders = addForm.providers
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      await createInventoryItem({
        name: addForm.name,
        sku: addForm.sku,
        category_id: addForm.category_id || null,
        description: addForm.description || null,
        cost: Number(addForm.cost),
        unit: addForm.unit,
        packaging: addForm.packaging || null,
        length: addForm.length ? Number(addForm.length) : null,
        weight: addForm.weight ? Number(addForm.weight) : null,
        stock: Number(addForm.stock),
        min_stock: Number(addForm.min_stock),
        providers: formattedProviders,
        tags: addForm.selectedTags,
        image_urls: uploadedImages
      });

      setIsAddModalOpen(false);
      setUploadedImages([]);
      setAddForm({
        name: '',
        sku: '',
        category_id: '',
        description: '',
        cost: 0,
        unit: 'unidades',
        packaging: '',
        length: '',
        weight: '',
        stock: 0,
        min_stock: 0,
        providers: '',
        selectedTags: []
      });
      loadData();
    } catch (err: any) {
      alert('Error al crear item: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Mode directly from table row
  const handleOpenEdit = async (item: InventoryItemRow) => {
    setSelectedItem(item);
    setActiveImgUrl(item.image_urls?.[0] || item.image_url || null);
    setEditForm({
      name: item.name,
      sku: item.sku,
      category_id: item.category_id || '',
      description: item.description || '',
      cost: item.cost,
      unit: item.unit,
      packaging: item.packaging || '',
      length: item.length ? String(item.length) : '',
      weight: item.weight ? String(item.weight) : '',
      stock: item.stock,
      min_stock: item.min_stock,
      providers: (item.providers || []).join(', '),
      selectedTags: item.tags || [],
      image_urls: item.image_urls || (item.image_url ? [item.image_url] : [])
    });
    setIsEditing(true);
    setIsDetailDrawerOpen(true);
    setLoadingTransactions(true);
    try {
      const txs = await getInventoryTransactions(item.id);
      setItemTransactions(txs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Start Edit mode
  const handleStartEdit = () => {
    if (!selectedItem) return;
    setEditForm({
      name: selectedItem.name,
      sku: selectedItem.sku,
      category_id: selectedItem.category_id || '',
      description: selectedItem.description || '',
      cost: selectedItem.cost,
      unit: selectedItem.unit,
      packaging: selectedItem.packaging || '',
      length: selectedItem.length ? String(selectedItem.length) : '',
      weight: selectedItem.weight ? String(selectedItem.weight) : '',
      stock: selectedItem.stock,
      min_stock: selectedItem.min_stock,
      providers: (selectedItem.providers || []).join(', '),
      selectedTags: selectedItem.tags || [],
      image_urls: selectedItem.image_urls || (selectedItem.image_url ? [selectedItem.image_url] : [])
    });
    setIsEditing(true);
  };

  // Image upload handler for edit form
  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingImage(true);
    try {
      const urls: string[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const url = await uploadInventoryItemImage(file, selectedItem?.name);
        urls.push(url);
      }
      setEditForm(prev => ({
        ...prev,
        image_urls: [...prev.image_urls, ...urls]
      }));
    } catch (err: any) {
      alert('Error al subir imágenes: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // Save changes from Edit form
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      const formattedProviders = editForm.providers
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      const updated = await updateInventoryItem(selectedItem.id, {
        name: editForm.name,
        sku: editForm.sku,
        category_id: editForm.category_id || null,
        description: editForm.description || null,
        cost: Number(editForm.cost),
        unit: editForm.unit,
        packaging: editForm.packaging || null,
        length: editForm.length ? Number(editForm.length) : null,
        weight: editForm.weight ? Number(editForm.weight) : null,
        stock: Number(editForm.stock),
        min_stock: Number(editForm.min_stock),
        providers: formattedProviders,
        tags: editForm.selectedTags,
        image_urls: editForm.image_urls
      });

      setSelectedItem(updated);
      setActiveImgUrl(updated.image_urls?.[0] || updated.image_url || null);
      setIsEditing(false);
      loadData();
    } catch (err: any) {
      alert('Error al guardar cambios: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // WMS category/tag actions
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await createCategory(newCategoryName.trim());
      setNewCategoryName('');
      const cats = await getCategories();
      setCategories(cats);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteCat = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta categoría?')) return;
    try {
      await deleteCategory(id);
      const cats = await getCategories();
      setCategories(cats);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddTagAction = async () => {
    if (!newTagName.trim()) return;
    try {
      await createTag(newTagName.trim());
      setNewTagName('');
      const tg = await getTags();
      setTags(tg);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteTagAction = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta etiqueta?')) return;
    try {
      await deleteTag(id);
      const tg = await getTags();
      setTags(tg);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Setup Bulk Adjustment Modal
  const openBulkAdjustment = () => {
    const list = items.map(item => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      unit: item.unit,
      currentStock: item.stock,
      quantity: 0,
      transactionType: 'ajuste', // 'entrada' | 'salida' | 'ajuste'
      reason: ''
    }));
    setBulkList(list);
    setIsBulkModalOpen(true);
  };

  const handleSaveBulk = async () => {
    const activeAdjustments = bulkList
      .filter(x => x.quantity !== 0 || x.reason.trim() !== '')
      .map(x => ({
        itemId: x.id,
        quantity: x.transactionType === 'salida' ? -Math.abs(x.quantity) : Math.abs(x.quantity),
        transactionType: x.transactionType,
        reason: x.reason.trim() || 'Ajuste masivo de conciliación'
      }));

    if (activeAdjustments.length === 0) {
      setIsBulkModalOpen(false);
      return;
    }

    setActionLoading(true);
    try {
      await processBulkStockAdjustments(activeAdjustments as any[]);
      setIsBulkModalOpen(false);
      loadData();
    } catch (err: any) {
      alert('Error en ajuste masivo: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Get status color
  const getStatusBadge = (stock: number, minStock: number) => {
    if (stock === 0) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">AGOTADO</span>;
    }
    if (stock <= minStock) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">BAJO STOCK</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">DISPONIBLE</span>;
  };

  return (
    <div className="space-y-6 text-left pb-12">
      {/* Top Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            <Archive className="h-6 w-6 text-emerald-400" />
            Consola WMS Orion
          </h1>
          <p className="text-zinc-400 text-xs mt-1">
            Gestión logística centralizada de materiales, stocks críticos, conciliación y auditoría de Kardex.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white" disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sincronizar'}
          </Button>

          <RequirePermission action="inventory:write">
            <Button onClick={openBulkAdjustment} className="bg-amber-600/10 text-amber-400 hover:bg-amber-600 hover:text-black border border-amber-500/20 font-bold text-xs h-10 px-4 rounded-xl">
              <Sliders className="h-4 w-4 mr-1.5" /> Ajuste Masivo
            </Button>
            <Button onClick={() => setIsConfigModalOpen(true)} className="bg-zinc-900 border-zinc-800 text-zinc-350 hover:text-white font-bold text-xs h-10 px-4 rounded-xl">
              <Settings className="h-4 w-4 mr-1.5" /> Configurar WMS
            </Button>
            <Button onClick={() => setIsAddModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 px-4 rounded-xl">
              <Plus className="h-4 w-4 mr-1.5" /> Ingresar Material
            </Button>
          </RequirePermission>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-900/40 border border-zinc-850 p-5 rounded-2xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider font-mono">Valor Estimado</span>
              <p className="text-xl font-bold text-emerald-400 font-mono">
                ${analytics.estimatedValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="h-10 w-10 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-400" />
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-850 p-5 rounded-2xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider font-mono">Items en Catálogo</span>
              <p className="text-xl font-bold text-white font-mono">{analytics.totalItems}</p>
            </div>
            <div className="h-10 w-10 bg-blue-500/10 rounded-xl border border-blue-500/20 flex items-center justify-center">
              <Archive className="h-5 w-5 text-blue-400" />
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-850 p-5 rounded-2xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider font-mono">Stock Crítico</span>
              <p className={`text-xl font-bold font-mono ${analytics.lowStockCount > 0 ? 'text-amber-400' : 'text-white'}`}>
                {analytics.lowStockCount} items
              </p>
            </div>
            <div className={`h-10 w-10 rounded-xl border flex items-center justify-center ${
              analytics.lowStockCount > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-zinc-800 border-zinc-700'
            }`}>
              <AlertTriangle className={`h-5 w-5 ${analytics.lowStockCount > 0 ? 'text-amber-400' : 'text-zinc-500'}`} />
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-850 p-5 rounded-2xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider font-mono">Top Solicitado</span>
              <p className="text-xs font-bold text-white truncate max-w-[150px]">
                {analytics.topUsed?.[0] ? `${analytics.topUsed[0].name} (${analytics.topUsed[0].usage_count})` : 'Sin datos'}
              </p>
            </div>
            <div className="h-10 w-10 bg-purple-500/10 rounded-xl border border-purple-500/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-purple-400" />
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-zinc-900/30 border border-zinc-850 p-4 rounded-2xl flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por nombre o SKU..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-colors h-10"
          />
        </div>

        <div className="flex gap-3 flex-wrap">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/50 h-10 font-semibold"
          >
            <option value="todos">Categorías: Todas</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <select
            value={selectedTag}
            onChange={e => setSelectedTag(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/50 h-10 font-semibold"
          >
            <option value="todos">Etiquetas: Todas</option>
            {tags.map(tag => (
              <option key={tag.id} value={tag.name}>{tag.name}</option>
            ))}
          </select>

          <button
            onClick={() => setFilterLowStock(!filterLowStock)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all h-10 ${
              filterLowStock 
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Bajo Stock
          </button>
        </div>
      </div>

      {/* Catalog Table */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-zinc-900/10 border border-zinc-850 rounded-2xl">
          <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
          <span className="text-zinc-500 text-xs">Cargando catálogo...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-zinc-900/10 border border-zinc-850 p-12 text-center rounded-2xl">
          <Archive className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
          <h3 className="text-zinc-450 font-bold text-sm">Sin materiales</h3>
          <p className="text-zinc-500 text-xs mt-1">No se encontraron items que coincidan con la búsqueda.</p>
        </div>
      ) : (
        <div className="bg-zinc-900/10 border border-zinc-850 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/50 border-b border-zinc-850 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                <th className="px-6 py-4">Material / SKU</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4">Stock Actual</th>
                <th className="px-6 py-4">Última Actividad</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850 text-xs">
              {items.map((item) => {
                const category = categories.find(c => c.id === item.category_id);
                const latestTx = latestTxMap[item.id];
                return (
                  <tr key={item.id} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-zinc-950 border border-zinc-850 overflow-hidden shrink-0 flex items-center justify-center">
                          {item.image_urls?.[0] || item.image_url ? (
                            <img src={item.image_urls?.[0] || item.image_url || undefined} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <PackageCheck className="h-5 w-5 text-zinc-650" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-white text-sm">{item.name}</div>
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{item.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      {category ? category.name : 'Sin categoría'}
                    </td>
                    <td className="px-6 py-4 text-white font-semibold">
                      {item.stock} {item.unit}
                    </td>
                    <td className="px-6 py-4">
                      {latestTx ? (
                        <div className="space-y-0.5">
                          <span className={`font-mono text-[10px] font-bold ${
                            latestTx.transaction_type === 'entrada' ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {latestTx.transaction_type === 'entrada' ? '+' : ''}{latestTx.quantity}
                          </span>
                          <div className="text-[9px] text-zinc-550 font-medium truncate max-w-[120px]" title={latestTx.reason}>
                            {latestTx.reason}
                          </div>
                        </div>
                      ) : (
                        <span className="text-zinc-650 italic text-[10px]">Sin movimientos</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(item.stock, item.min_stock)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <RequirePermission action="inventory:write">
                          <Button
                            onClick={() => handleOpenEdit(item)}
                            size="sm"
                            className="bg-zinc-900 border border-zinc-800 hover:text-white text-zinc-450 hover:bg-zinc-800 text-[10px] p-2 h-8 w-8 rounded-lg cursor-pointer"
                            title="Editar Ficha"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        </RequirePermission>
                        <Button
                          onClick={() => handleOpenDetail(item)}
                          size="sm"
                          className="bg-zinc-900 border border-zinc-800 hover:text-white text-zinc-450 hover:bg-zinc-800 text-[10px] px-3.5 h-8 rounded-lg font-bold cursor-pointer"
                        >
                          Ficha & Kardex
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: INGRESAR MATERIAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-zinc-850 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-emerald-400">
                <Plus className="h-5 w-5" />
                <h3 className="font-bold text-sm uppercase tracking-wide">Alta de Material Físico</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateItem} className="p-6 overflow-y-auto space-y-4 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Nombre del Item *</label>
                  <input
                    required
                    type="text"
                    value={addForm.name}
                    onChange={e => setAddForm({...addForm, name: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Ej. Inversor Fronius 10kW"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Código SKU *</label>
                  <input
                    required
                    type="text"
                    value={addForm.sku}
                    onChange={e => setAddForm({...addForm, sku: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Ej. INV-FR-10KW"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Categoría</label>
                  <select
                    value={addForm.category_id}
                    onChange={e => setAddForm({...addForm, category_id: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Selecciona una categoría</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Unidad de Medida</label>
                  <select
                    value={addForm.unit}
                    onChange={e => setAddForm({...addForm, unit: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="unidades">Unidades (pcs)</option>
                    <option value="metros">Metros (m)</option>
                    <option value="rollos">Rollos</option>
                    <option value="cajas">Cajas</option>
                    <option value="kilogramos">Kilogramos (kg)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Costo Unitario ($) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={addForm.cost}
                    onChange={e => setAddForm({...addForm, cost: Number(e.target.value)})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Stock Inicial</label>
                  <input
                    type="number"
                    value={addForm.stock}
                    onChange={e => setAddForm({...addForm, stock: Number(e.target.value)})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Stock Mínimo</label>
                  <input
                    type="number"
                    value={addForm.min_stock}
                    onChange={e => setAddForm({...addForm, min_stock: Number(e.target.value)})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Embalaje</label>
                  <input
                    type="text"
                    value={addForm.packaging}
                    onChange={e => setAddForm({...addForm, packaging: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Pallet / Caja"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Longitud (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={addForm.length}
                    onChange={e => setAddForm({...addForm, length: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={addForm.weight}
                    onChange={e => setAddForm({...addForm, weight: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Proveedores (Separados por coma)</label>
                <input
                  type="text"
                  value={addForm.providers}
                  onChange={e => setAddForm({...addForm, providers: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Ej. Trina Solar, Wilker Distribuidora"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Descripción técnica</label>
                <textarea
                  value={addForm.description}
                  onChange={e => setAddForm({...addForm, description: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 h-16 resize-none"
                />
              </div>

              {/* Previsualización de imágenes subidas */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Imágenes del Item</label>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-wrap gap-2 items-center">
                  {uploadedImages.map((url, idx) => (
                    <div key={idx} className="relative h-16 w-16 bg-zinc-950 border border-zinc-850 rounded-lg group overflow-hidden">
                      <img src={url} alt={`Preview ${idx}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-rose-500 hover:text-rose-455 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  
                  <label className="h-16 w-16 border border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-lg flex flex-col items-center justify-center text-zinc-500 hover:text-emerald-400 transition-all cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                    {uploadingImage ? (
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span className="text-[8px] font-bold uppercase mt-1">Subir</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Tags checkboxes */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Etiquetas del Item</label>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-wrap gap-2.5 max-h-24 overflow-y-auto">
                  {tags.map(t => {
                    const isChecked = addForm.selectedTags.includes(t.name);
                    return (
                      <label key={t.id} className="flex items-center gap-2 text-xs font-semibold text-zinc-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setAddForm({...addForm, selectedTags: addForm.selectedTags.filter(x => x !== t.name)});
                            } else {
                              setAddForm({...addForm, selectedTags: [...addForm.selectedTags, t.name]});
                            }
                          }}
                          className="rounded border-zinc-800 bg-zinc-950 text-emerald-600 focus:ring-emerald-500/20 h-4 w-4"
                        />
                        <span>{t.name}</span>
                      </label>
                    );
                  })}
                  {tags.length === 0 && <span className="text-zinc-500 italic text-[11px]">No hay etiquetas configuradas.</span>}
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-850 flex justify-end gap-2 shrink-0">
                <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)} className="text-zinc-400">
                  Cancelar
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5">
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Guardar Material
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURAR WMS */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-zinc-850 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-white">
                <Settings className="h-5 w-5 text-zinc-400" />
                <h3 className="font-bold text-sm uppercase tracking-wide">Configuración del WMS</h3>
              </div>
              <button onClick={() => setIsConfigModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sub-tabs */}
            <div className="flex border-b border-zinc-850 px-4 bg-zinc-900/30">
              {(['categories', 'tags'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setConfigTab(tab)}
                  className={`px-4 py-3 text-xs font-bold uppercase transition-colors border-b-2 ${
                    configTab === tab
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {tab === 'categories' ? 'Categorías' : 'Etiquetas'}
                </button>
              ))}
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-left">
              {configTab === 'categories' && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nueva categoría..."
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 h-10"
                    />
                    <Button onClick={handleAddCategory} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10">
                      Añadir
                    </Button>
                  </div>

                  <div className="border border-zinc-850 rounded-xl divide-y divide-zinc-850 max-h-60 overflow-y-auto">
                    {categories.map(c => (
                      <div key={c.id} className="p-3.5 flex justify-between items-center hover:bg-zinc-900/20">
                        <span className="text-xs font-semibold text-white">{c.name}</span>
                        <button onClick={() => handleDeleteCat(c.id)} className="text-zinc-500 hover:text-rose-400 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {categories.length === 0 && <p className="text-xs italic text-zinc-500 p-4">No hay categorías configuradas.</p>}
                  </div>
                </div>
              )}

              {configTab === 'tags' && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nueva etiqueta..."
                      value={newTagName}
                      onChange={e => setNewTagName(e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 h-10"
                    />
                    <Button onClick={handleAddTagAction} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10">
                      Añadir
                    </Button>
                  </div>

                  <div className="border border-zinc-850 rounded-xl divide-y divide-zinc-850 max-h-60 overflow-y-auto">
                    {tags.map(t => (
                      <div key={t.id} className="p-3.5 flex justify-between items-center hover:bg-zinc-900/20">
                        <span className="text-xs font-semibold text-white">{t.name}</span>
                        <button onClick={() => handleDeleteTagAction(t.id)} className="text-zinc-500 hover:text-rose-400 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {tags.length === 0 && <p className="text-xs italic text-zinc-500 p-4">No hay etiquetas configuradas.</p>}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-zinc-850 flex justify-end shrink-0">
              <Button onClick={() => setIsConfigModalOpen(false)} className="bg-zinc-900 border border-zinc-800 text-zinc-300">
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AJUSTE MASIVO */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-zinc-850 flex items-center justify-between shrink-0 font-sans">
              <div className="flex items-center gap-2 text-amber-400">
                <Sliders className="h-5 w-5" />
                <h3 className="font-bold text-sm uppercase tracking-wide">Conciliación Local y Ajuste Masivo</h3>
              </div>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 text-left">
              <p className="text-zinc-400 text-xs mb-4 leading-relaxed">
                Ingresa cantidades de ajuste y selecciona el método de acción para cada fila. Los cambios solo se aplicarán al presionar "Guardar Conciliación".
              </p>
              
              <div className="border border-zinc-850 rounded-xl overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-900/60 border-b border-zinc-850 font-bold uppercase text-zinc-500">
                      <th className="px-4 py-3 text-left">Material / SKU</th>
                      <th className="px-4 py-3 text-left">Stock Actual</th>
                      <th className="px-4 py-3 text-left w-24">Cantidad</th>
                      <th className="px-4 py-3 text-left w-36">Tipo Acción</th>
                      <th className="px-4 py-3 text-left">Motivo / Explicación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850">
                    {bulkList.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-zinc-900/20">
                        <td className="px-4 py-2.5">
                          <span className="font-semibold text-white block">{row.name}</span>
                          <span className="text-[10px] font-mono text-zinc-500">{row.sku}</span>
                        </td>
                        <td className="px-4 py-2.5 text-zinc-300 font-semibold font-mono">
                          {row.currentStock} {row.unit}
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="number"
                            value={row.quantity === 0 ? '' : row.quantity}
                            placeholder="0"
                            onChange={e => {
                              const val = Math.max(0, Number(e.target.value));
                              const updated = [...bulkList];
                              updated[idx].quantity = val;
                              setBulkList(updated);
                            }}
                            className="bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 w-20 text-center font-mono text-white focus:outline-none focus:border-emerald-500"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <select
                            value={row.transactionType}
                            onChange={e => {
                              const updated = [...bulkList];
                              updated[idx].transactionType = e.target.value;
                              setBulkList(updated);
                            }}
                            className="bg-zinc-900 border border-zinc-850 rounded-lg p-1.5 text-xs text-white focus:outline-none w-full font-semibold"
                          >
                            <option value="ajuste">Ajuste (Kardex)</option>
                            <option value="entrada">Entrada (Stock +)</option>
                            <option value="salida">Salida (Stock -)</option>
                          </select>
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            placeholder="Ej. Rotura física, Conteo anual..."
                            value={row.reason}
                            onChange={e => {
                              const updated = [...bulkList];
                              updated[idx].reason = e.target.value;
                              setBulkList(updated);
                            }}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-5 border-t border-zinc-850 flex justify-end gap-2 shrink-0">
              <Button variant="ghost" onClick={() => setIsBulkModalOpen(false)} className="text-zinc-400">
                Cancelar
              </Button>
              <Button onClick={handleSaveBulk} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Guardar Conciliación
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: DETALLE DEL MATERIAL Y KARDEX */}
      {isDetailDrawerOpen && selectedItem && (
        <>
          <div onClick={() => setIsDetailDrawerOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40" />
          <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-zinc-950 border-l border-zinc-900 shadow-2xl flex flex-col z-50 transform transition-transform duration-300">
            <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/20 shrink-0">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-emerald-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-550">
                  {isEditing ? 'Editar Ficha de Material' : 'Ficha Técnica & Kardex'}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <RequirePermission action="inventory:write">
                  <Button
                    onClick={() => {
                      if (isEditing) {
                        setIsEditing(false);
                      } else {
                        handleStartEdit();
                      }
                    }}
                    size="sm"
                    className="bg-zinc-900 border border-zinc-800 text-[10px] h-8 font-bold text-zinc-350 hover:text-white hover:bg-zinc-850 rounded-lg cursor-pointer"
                  >
                    {isEditing ? 'Cancelar Edición' : 'Editar Ficha'}
                  </Button>
                </RequirePermission>
                <button onClick={() => setIsDetailDrawerOpen(false)} className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-white transition-colors cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin scrollbar-thumb-zinc-900 text-left">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Nombre del Item *</label>
                    <input
                      required
                      type="text"
                      value={editForm.name}
                      onChange={e => setEditForm({...editForm, name: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Código SKU *</label>
                    <input
                      required
                      type="text"
                      value={editForm.sku}
                      onChange={e => setEditForm({...editForm, sku: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Categoría</label>
                    <select
                      value={editForm.category_id}
                      onChange={e => setEditForm({...editForm, category_id: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="">Selecciona una categoría</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Unidad de Medida</label>
                    <select
                      value={editForm.unit}
                      onChange={e => setEditForm({...editForm, unit: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="unidades">Unidades (pcs)</option>
                      <option value="metros">Metros (m)</option>
                      <option value="rollos">Rollos</option>
                      <option value="cajas">Cajas</option>
                      <option value="kilogramos">Kilogramos (kg)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Costo Unitario ($) *</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={editForm.cost}
                      onChange={e => setEditForm({...editForm, cost: Number(e.target.value)})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Stock Mínimo</label>
                    <input
                      type="number"
                      value={editForm.min_stock}
                      onChange={e => setEditForm({...editForm, min_stock: Number(e.target.value)})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Embalaje</label>
                    <input
                      type="text"
                      value={editForm.packaging}
                      onChange={e => setEditForm({...editForm, packaging: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Longitud (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editForm.length}
                      onChange={e => setEditForm({...editForm, length: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Peso (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editForm.weight}
                      onChange={e => setEditForm({...editForm, weight: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Proveedores (Separados por coma)</label>
                  <input
                    type="text"
                    value={editForm.providers}
                    onChange={e => setEditForm({...editForm, providers: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Descripción Técnica</label>
                  <textarea
                    value={editForm.description}
                    onChange={e => setEditForm({...editForm, description: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none h-16 resize-none"
                  />
                </div>

                {/* Previsualización de imágenes subidas en edición */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Imágenes del Item</label>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-wrap gap-2 items-center">
                    {(editForm.image_urls || []).map((url, idx) => (
                      <div key={idx} className="relative h-16 w-16 bg-zinc-950 border border-zinc-850 rounded-lg group overflow-hidden">
                        <img src={url} alt={`Preview ${idx}`} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setEditForm(prev => ({
                            ...prev,
                            image_urls: prev.image_urls.filter((_, i) => i !== idx)
                          }))}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-rose-500 hover:text-rose-455 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    
                    <label className="h-16 w-16 border border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-lg flex flex-col items-center justify-center text-zinc-500 hover:text-emerald-400 transition-all cursor-pointer">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleEditImageUpload}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                      {uploadingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          <span className="text-[8px] font-bold uppercase mt-1">Subir</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Tags checkboxes */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Etiquetas del Item</label>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-wrap gap-2.5 max-h-24 overflow-y-auto">
                    {tags.map(t => {
                      const isChecked = editForm.selectedTags.includes(t.name);
                      return (
                        <label key={t.id} className="flex items-center gap-2 text-xs font-semibold text-zinc-300 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setEditForm({
                                  ...editForm,
                                  selectedTags: editForm.selectedTags.filter(x => x !== t.name)
                                });
                              } else {
                                setEditForm({
                                  ...editForm,
                                  selectedTags: [...editForm.selectedTags, t.name]
                                });
                              }
                            }}
                            className="rounded border-zinc-800 bg-zinc-950 text-emerald-600 focus:ring-emerald-500/20 h-4 w-4"
                          />
                          <span>{t.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-900 flex justify-end gap-2 shrink-0">
                  <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} className="text-zinc-400">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5">
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Guardar Cambios
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-900 text-left">
                {/* Image Gallery */}
                {activeImgUrl ? (
                  <div className="space-y-2">
                    <div className="relative h-64 w-full bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-inner">
                      <img src={activeImgUrl} alt={selectedItem.name} className="h-full w-full object-contain" />
                    </div>
                    {/* Thumbnails */}
                    {(selectedItem.image_urls || []).length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                        {(selectedItem.image_urls || []).map((url, index) => (
                          <button
                            key={index}
                            onClick={() => setActiveImgUrl(url)}
                            className={`h-12 w-12 rounded-lg overflow-hidden border shrink-0 transition-all cursor-pointer ${
                              activeImgUrl === url ? 'border-emerald-500 scale-95' : 'border-zinc-800 opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img src={url} alt={`Thumbnail ${index}`} className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-44 w-full bg-zinc-900/20 border border-zinc-900 rounded-2xl flex flex-col items-center justify-center text-zinc-650">
                    <Archive className="h-10 w-10 mb-2" />
                    <span className="text-xs font-semibold uppercase tracking-wider font-mono">Sin imágenes asociadas</span>
                  </div>
                )}

                {/* Technical Specifications */}
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-wide">{selectedItem.name}</h2>
                    <p className="text-zinc-500 font-mono text-[10px] mt-0.5">SKU: {selectedItem.sku}</p>
                  </div>

                  {selectedItem.description && (
                    <p className="text-zinc-400 text-xs bg-zinc-900/40 p-3 rounded-xl border border-zinc-900/60 leading-relaxed">
                      {selectedItem.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-4 bg-zinc-900/20 border border-zinc-900 p-4 rounded-xl">
                    <div className="flex justify-between py-1.5 border-b border-zinc-900 text-xs">
                      <span className="text-zinc-500">Costo Unitario</span>
                      <span className="font-bold text-zinc-300 font-mono">${selectedItem.cost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-zinc-900 text-xs">
                      <span className="text-zinc-500">Stock Actual</span>
                      <span className="font-bold text-emerald-400 font-mono">{selectedItem.stock} {selectedItem.unit}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-zinc-900 text-xs">
                      <span className="text-zinc-500">Embalaje</span>
                      <span className="font-bold text-zinc-355">{selectedItem.packaging || 'N/D'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-zinc-900 text-xs">
                      <span className="text-zinc-500">Min. Requerido</span>
                      <span className="font-bold text-zinc-355 font-mono">{selectedItem.min_stock} {selectedItem.unit}</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-xs col-span-2">
                      <span className="text-zinc-500">Dimensiones Físicas</span>
                      <span className="font-bold text-zinc-355 font-mono">
                        {selectedItem.length ? `${selectedItem.length}m` : 'N/D'} / {selectedItem.weight ? `${selectedItem.weight}kg` : 'N/D'}
                      </span>
                    </div>
                  </div>

                  {/* Tags & Providers */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Etiquetas</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedItem.tags && selectedItem.tags.length > 0 ? (
                          selectedItem.tags.map((t, i) => (
                            <span key={i} className="bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded text-[10px] font-semibold">
                              {t}
                            </span>
                          ))
                        ) : (
                          <span className="text-zinc-650 italic text-[10px]">Sin etiquetas</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Proveedores</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedItem.providers && selectedItem.providers.length > 0 ? (
                          selectedItem.providers.map((p, i) => (
                            <span key={i} className="bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded text-[10px] font-semibold">
                              {p}
                            </span>
                          ))
                        ) : (
                          <span className="text-zinc-650 italic text-[10px]">Sin proveedores</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Kardex Transactions List */}
                <div className="space-y-3.5 pt-6 border-t border-zinc-900">
                  <div className="flex items-center gap-1.5">
                    <History className="h-4 w-4 text-emerald-400" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Registro de Kardex e Historial</span>
                  </div>

                  {loadingTransactions ? (
                    <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-zinc-500 h-6 w-6" /></div>
                  ) : itemTransactions.length === 0 ? (
                    <p className="text-xs text-zinc-650 italic py-4 text-center">No hay registros de movimientos en Kardex para este material.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {itemTransactions.map((tx) => (
                        <div key={tx.id} className="bg-zinc-900/30 border border-zinc-900/60 p-3.5 rounded-xl flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold uppercase ${
                                tx.transaction_type === 'entrada' ? 'text-emerald-400' : 'text-rose-400'
                              }`}>
                                {tx.transaction_type === 'entrada' ? 'ENTRADA' : 'SALIDA'}
                              </span>
                              <span className="text-[10px] text-zinc-600 font-mono">
                                {new Date(tx.created_at).toLocaleDateString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400">{tx.reason}</p>
                            <div className="text-[9px] text-zinc-550 flex items-center gap-1">
                              <User className="h-3 w-3 shrink-0" />
                              <span>Auditado por: {tx.profiles?.full_name || 'Sistema / IA'}</span>
                            </div>
                          </div>
                          <div className={`text-sm font-bold font-mono ${
                            tx.transaction_type === 'entrada' ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {tx.transaction_type === 'entrada' ? '+' : ''}{tx.quantity}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="p-4 border-t border-zinc-900 shrink-0 flex justify-between items-center">
              <RequirePermission action="inventory:write">
                {!isEditing ? (
                  <Button
                    onClick={handleStartEdit}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold h-9 px-4 rounded-xl cursor-pointer"
                  >
                    <Edit2 className="h-4 w-4 mr-1.5" /> Editar Ficha
                  </Button>
                ) : (
                  <Button
                    onClick={handleSaveEdit}
                    disabled={actionLoading}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold h-9 px-4 rounded-xl cursor-pointer"
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null} Guardar Cambios
                  </Button>
                )}
              </RequirePermission>
              <Button onClick={() => setIsDetailDrawerOpen(false)} className="bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl h-9">
                Cerrar Ficha
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
