'use client';

import React, { useState, useEffect } from 'react';
import { 
  Archive, Plus, Search, Sliders, Settings, SlidersHorizontal, Loader2, X,
  AlertTriangle, DollarSign, RefreshCw, BarChart2, ClipboardList, Home, FileText, CheckCircle2,
  Calendar, Layers, Tag, User, QrCode
} from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { RequirePermission, useAuth } from '@/core/auth/AuthContext';
import { useInventory } from './hooks/useInventory';
import { getAllInventoryTransactions } from '@/core/services/inventory';
import { supabase } from '@/core/database/supabase';
import { getApiUrl } from '@/core/utils/api';

// Subcomponents
import { CatalogTable } from './components/CatalogTable';
import { TransactionHistory } from './components/TransactionHistory';
import { AddMaterialModal } from './components/AddMaterialModal';
import { ConfigWMSModal, getGlobalProviders, saveGlobalProviders } from './components/ConfigWMSModal';
import { BulkAdjustmentModal } from './components/BulkAdjustmentModal';
import { MaterialDetailDrawer } from './components/MaterialDetailDrawer';
import { MobileInventoryDashboard } from './components/MobileInventoryDashboard';
import { ProjectDispatchTab } from './components/ProjectDispatchTab';

export default function InventoryModule() {
  const { user } = useAuth();
  const {
    items,
    categories,
    tags,
    analytics,
    latestTxMap,
    loading,
    refreshing,
    actionLoading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedTag,
    setSelectedTag,
    filterLowStock,
    setFilterLowStock,
    selectedItemIds,
    setSelectedItemIds,
    isFilterOpen,
    setIsFilterOpen,
    isAddModalOpen,
    setIsAddModalOpen,
    isConfigModalOpen,
    setIsConfigModalOpen,
    isBulkModalOpen,
    setIsBulkModalOpen,
    isDetailDrawerOpen,
    setIsDetailDrawerOpen,
    selectedItem,
    itemTransactions,
    loadingTransactions,
    addForm,
    setAddForm,
    configTab,
    setConfigTab,
    newCategoryName,
    setNewCategoryName,
    newTagName,
    setNewTagName,
    bulkList,
    setBulkList,
    uploadedImages,
    setUploadedImages,
    uploadingImage,
    isEditing,
    setIsEditing,
    activeImgUrl,
    setActiveImgUrl,
    editForm,
    setEditForm,
    handleToggleSelectItem,
    handleToggleSelectAll,
    handleRefresh,
    handleOpenDetail,
    handleImageUpload,
    handleCreateItem,
    handleOpenEdit,
    handleStartEdit,
    handleEditImageUpload,
    handleSaveEdit,
    handleAddCategory,
    handleDeleteCat,
    handleAddTagAction,
    handleDeleteTagAction,
    openBulkAdjustment,
    handleSaveBulk,
    loadData
  } = useInventory();

  // Supabase session token state for authorizing storage file paths in static-export
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token || null);
    });
  }, []);

  // Helper to resolve absolute URL with token
  const resolveImageUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('/api/storage/file/')) {
      return getApiUrl(`${url}${url.includes('?') ? '&' : '?'}token=${token || ''}`);
    }
    return url;
  };

  // Desktop active tab
  const [activeTab, setActiveTab] = useState<'catalog' | 'history' | 'dispatch'>('catalog');

  // Mobile active bottom tab
  const [mobileTab, setMobileTab] = useState<'home' | 'items' | 'logs' | 'config'>('home');

  // Mobile-specific providers manager states (Requirement 4)
  const [mobileProviders, setMobileProviders] = useState<string[]>([]);
  const [mobileNewProvider, setMobileNewProvider] = useState('');

  useEffect(() => {
    if (mobileTab === 'config') {
      setMobileProviders(getGlobalProviders());
    }
  }, [mobileTab]);

  const handleMobileAddProvider = () => {
    const name = mobileNewProvider.trim();
    if (!name) return;
    if (mobileProviders.includes(name)) {
      alert('Este proveedor ya está registrado.');
      return;
    }
    const updated = [...mobileProviders, name];
    setMobileProviders(updated);
    saveGlobalProviders(updated);
    setMobileNewProvider('');
  };

  const handleMobileDeleteProvider = (name: string) => {
    if (!confirm(`¿Seguro que deseas eliminar al proveedor "${name}"?`)) return;
    const updated = mobileProviders.filter(p => p !== name);
    setMobileProviders(updated);
    saveGlobalProviders(updated);
  };

  // Extra filter modes
  const [stockFilterMode, setStockFilterMode] = useState<'all' | 'low' | 'nominal' | 'out'>('all');
  const [supplierFilter, setSupplierFilter] = useState('todos');

  // Load mobile transactions history locally
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [loadingTxs, setLoadingTxs] = useState(false);

  const fetchTransactions = async () => {
    setLoadingTxs(true);
    try {
      const data = await getAllInventoryTransactions();
      setAllTransactions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTxs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history' || mobileTab === 'logs') {
      fetchTransactions();
    }
  }, [activeTab, mobileTab]);

  // Extract unique suppliers dynamically
  const uniqueSuppliers = Array.from(
    new Set(items.flatMap(item => item.providers || []))
  ).filter(Boolean) as string[];

  // Apply filters on the items list
  const filteredItems = items.filter(item => {
    // 1. Stock Filter
    if (stockFilterMode === 'low') {
      if (item.stock > item.min_stock || item.stock === 0) return false;
    }
    if (stockFilterMode === 'nominal') {
      if (item.stock <= item.min_stock) return false;
    }
    if (stockFilterMode === 'out') {
      if (item.stock > 0) return false;
    }

    // 2. Supplier Filter
    if (supplierFilter !== 'todos') {
      if (!item.providers || !item.providers.includes(supplierFilter)) return false;
    }

    return true;
  });

  // Calculate dynamic WMS KPIs
  const totalStockQty = items.reduce((sum, x) => sum + x.stock, 0);
  const lowStockCount = items.filter(x => x.stock <= x.min_stock).length;
  const estimatedVal = items.reduce((sum, x) => sum + (x.cost * x.stock), 0);

  // Format currency helper
  const formatValue = (val: number) => {
    if (val >= 1000000) {
      return `$${(val / 1000000).toFixed(2)}M`;
    }
    if (val >= 1000) {
      return `$${(val / 1000).toFixed(1)}k`;
    }
    return `$${val.toFixed(2)}`;
  };

  const getStatusBadge = (stock: number, minStock: number) => {
    if (stock === 0) {
      return (
        <span className="px-2.5 py-0.5 rounded text-[8.5px] font-bold uppercase bg-rose-500/10 text-rose-455 border border-rose-500/20">
          OFFLINE / DEPLETED
        </span>
      );
    }
    if (stock <= minStock) {
      return (
        <span className="px-2.5 py-0.5 rounded text-[8.5px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
          LOW STOCK
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded text-[8.5px] font-bold uppercase bg-emerald-500/10 text-emerald-450 border border-emerald-500/20">
        NOMINAL
      </span>
    );
  };

  return (
    <div className="space-y-4 text-left pb-4">
      
      {/* ========================================================================= */}
      {/* 1. DESKTOP VIEW LAYOUT (hidden on mobile screen sizes) */}
      {/* ========================================================================= */}
      <div className="hidden md:block space-y-4">
        
        {/* Dynamic Metric Cards Row & Action Buttons */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* CARD 1: TOTAL ITEMS */}
          <div className="bg-[#15161c] border border-zinc-800/80 p-4.5 rounded-none flex items-center justify-between shadow-lg">
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest font-mono">Total Items</div>
              <div className="text-2xl font-bold text-white leading-none font-mono">
                {totalStockQty.toLocaleString()}
              </div>
              <div className="text-[9.5px] text-zinc-450 flex items-center gap-1 font-mono">
                <span className="text-emerald-450 font-bold font-mono">+{items.length}</span> SKUs activos en catálogo
              </div>
            </div>
            <Archive className="h-7 w-7 text-emerald-400 opacity-60" />
          </div>

          {/* CARD 2: STOCK CRITICO */}
          <div className="bg-[#15161c] border border-zinc-800/80 p-4.5 rounded-none flex items-center justify-between shadow-lg">
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest font-mono">Stock Crítico</div>
              <div className={`text-2xl font-bold leading-none font-mono ${lowStockCount > 0 ? 'text-amber-500' : 'text-white'}`}>
                {lowStockCount} SKU
              </div>
              <div className="text-[9.5px] text-zinc-450 font-mono">
                {lowStockCount > 0 ? '⚠️ Acción inmediata requerida' : '✓ Niveles de stock saludables'}
              </div>
            </div>
            <AlertTriangle className={`h-7 w-7 opacity-60 ${lowStockCount > 0 ? 'text-amber-500 animate-pulse' : 'text-zinc-650'}`} />
          </div>

          {/* CARD 3: VALOR ESTIMADO */}
          <div className="bg-[#15161c] border border-zinc-800/80 p-4.5 rounded-none flex items-center justify-between shadow-lg">
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest font-mono">Valor Estimado</div>
              <div className="text-2xl font-bold text-white leading-none font-mono">
                {formatValue(estimatedVal)}
              </div>
              <div className="text-[9.5px] text-zinc-450 font-mono">
                Valorización total de activos WMS
              </div>
            </div>
            <DollarSign className="h-7 w-7 text-emerald-400 opacity-60" />
          </div>

          {/* CARD 4: ACCIONES DEL SISTEMA */}
          <div className="bg-[#15161c] border border-zinc-800/80 p-4.5 rounded-none flex flex-col justify-center shadow-lg">
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                className="bg-[#121214] border border-zinc-808 text-zinc-400 hover:text-white rounded-none h-8 py-0.5 text-[9.5px] font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer" 
                disabled={refreshing}
              >
                {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Sincronizar
              </Button>

              <RequirePermission action="inventory:write">
                <Button 
                  onClick={openBulkAdjustment} 
                  className={`font-bold font-mono text-[9.5px] uppercase tracking-wider h-8 py-0.5 rounded-none transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    selectedItemIds.length > 0
                      ? 'bg-amber-500 text-black hover:bg-amber-400 animate-pulse'
                      : 'bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-350 hover:text-white'
                  }`}
                >
                  <Sliders className="h-3 w-3" /> Ajuste Masivo {selectedItemIds.length > 0 ? `(${selectedItemIds.length})` : ''}
                </Button>
                <Button 
                  onClick={() => setIsConfigModalOpen(true)} 
                  className="bg-zinc-900 border border-zinc-800 text-zinc-350 hover:text-white font-bold font-mono text-[9.5px] uppercase tracking-wider h-8 py-0.5 rounded-none flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Settings className="h-3 w-3" /> Configuración
                </Button>
                <Button 
                  onClick={() => setIsAddModalOpen(true)} 
                  className="bg-amber-500 hover:bg-amber-400 text-black font-bold font-mono text-[9.5px] uppercase tracking-wider h-8 py-0.5 rounded-none flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3 w-3 font-extrabold" /> Nuevo Material
                </Button>
              </RequirePermission>
            </div>
          </div>
        </div>

        {/* Tab switcher: Materiales vs Movimientos Historial */}
        <div className="flex border-b border-zinc-800/80">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-5 py-3.5 text-xs font-bold font-mono uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
              activeTab === 'catalog'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Catálogo de Materiales
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-5 py-3.5 text-xs font-bold font-mono uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
              activeTab === 'history'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Historial de Movimientos
          </button>
          <button
            onClick={() => setActiveTab('dispatch')}
            className={`px-5 py-3.5 text-xs font-bold font-mono uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
              activeTab === 'dispatch'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Gestión de Despachos
          </button>
        </div>

        {/* Tab contents */}
        {activeTab === 'catalog' && (
          <div className="space-y-4">
            {/* Redesigned horizontal filter toolbar directly above the table */}
            <div className="bg-[#1c1c21] border border-zinc-800 p-4 rounded-none flex flex-wrap items-center gap-3 w-full">
              
              {/* Search text input */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar material, SKU..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-none pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-colors h-10 font-semibold"
                />
              </div>

              {/* Stock Selector */}
              <div className="w-[140px] shrink-0">
                <select
                  value={stockFilterMode}
                  onChange={e => setStockFilterMode(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-850 text-xs text-zinc-300 rounded-none h-10 px-3.5 focus:outline-none focus:border-zinc-750 cursor-pointer font-bold font-mono"
                >
                  <option value="all">Stock: Todos</option>
                  <option value="low">Stock: Bajo Stock</option>
                  <option value="nominal">Stock: Nominal</option>
                  <option value="out">Stock: Agotado</option>
                </select>
              </div>

              {/* Category Selector */}
              <div className="w-[140px] shrink-0">
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 text-xs text-zinc-300 rounded-none h-10 px-3.5 focus:outline-none focus:border-zinc-750 cursor-pointer font-bold font-mono"
                >
                  <option value="todos">Categoría: Todas</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Supplier Selector */}
              <div className="w-[140px] shrink-0">
                <select
                  value={supplierFilter}
                  onChange={e => setSupplierFilter(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 text-xs text-zinc-300 rounded-none h-10 px-3.5 focus:outline-none focus:border-zinc-750 cursor-pointer font-bold font-mono"
                >
                  <option value="todos">Proveedor: Todos</option>
                  {uniqueSuppliers.map(sup => (
                    <option key={sup} value={sup}>
                      {sup}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear filters action */}
              {(searchQuery || selectedCategory !== 'todos' || stockFilterMode !== 'all' || supplierFilter !== 'todos') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('todos');
                    setStockFilterMode('all');
                    setSupplierFilter('todos');
                  }}
                  className="text-xs font-bold text-rose-500 hover:text-rose-455 transition-colors cursor-pointer ml-1 font-mono uppercase tracking-wider"
                >
                  Limpiar Filtros
                </button>
              )}
            </div>

            {/* Catalog Table */}
            <CatalogTable
              items={filteredItems}
              categories={categories}
              latestTxMap={latestTxMap}
              loading={loading}
              selectedItemIds={selectedItemIds}
              handleToggleSelectItem={handleToggleSelectItem}
              handleToggleSelectAll={handleToggleSelectAll}
              handleOpenEdit={handleOpenEdit}
              handleOpenDetail={handleOpenDetail}
            />
          </div>
        )}

        {activeTab === 'history' && (
          <TransactionHistory />
        )}

        {activeTab === 'dispatch' && (
          <ProjectDispatchTab
            items={items}
            categories={categories}
            token={token}
            loadData={loadData}
          />
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. MOBILE VIEW LAYOUT (hidden on desktop screen sizes) */}
      {/* ========================================================================= */}
      <div className="block md:hidden pb-16">
        
        {/* Render Mobile Active Tab contents */}
        {mobileTab === 'home' && (
          <MobileInventoryDashboard
            user={user}
            items={items}
            setIsAddModalOpen={setIsAddModalOpen}
            openBulkAdjustment={openBulkAdjustment}
            handleOpenDetail={handleOpenDetail}
            setFilterLowStock={setFilterLowStock}
            setActiveTab={setMobileTab}
          />
        )}

        {mobileTab === 'items' && (
          <div className="space-y-4 text-left">
            {/* Header Title */}
            <div className="flex items-center justify-between pb-1">
              <span className="text-sm font-bold text-white font-mono uppercase tracking-widest">Manage Inventory</span>
              <button 
                onClick={() => setFilterLowStock(!filterLowStock)}
                className={`p-1.5 rounded bg-zinc-900 border border-zinc-800 ${
                  filterLowStock ? 'text-amber-500 border-amber-500/30 bg-amber-500/5' : 'text-zinc-400'
                }`}
                title="Filter Alert items"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </div>

            {/* Compact Search and barcode bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-550" />
                <input
                  type="text"
                  placeholder="Search item, SKU, or barcode..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#16161c] border border-zinc-800 rounded-xl pl-9.5 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-700 transition-colors h-11"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => alert('Activando escáner de códigos de barras (Cámara)...')}
                className="h-11 w-11 bg-amber-500 text-black rounded-xl flex items-center justify-center cursor-pointer"
              >
                <QrCode className="h-5 w-5" />
              </button>
            </div>

            {/* Horizontal Categories Scroll */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none shrink-0">
              <button
                onClick={() => setSelectedCategory('todos')}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider font-mono shrink-0 cursor-pointer ${
                  selectedCategory === 'todos'
                    ? 'bg-amber-500 text-black font-extrabold'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
                }`}
              >
                Todos
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider font-mono shrink-0 cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-amber-500 text-black font-extrabold'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Mobile optimized card list */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-2">
                <Loader2 className="h-7 w-7 text-emerald-500 animate-spin" />
                <span className="text-zinc-550 text-[11px]">Cargando catálogo móvil...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-12 text-center text-zinc-600 text-xs italic border border-dashed border-zinc-850 rounded-xl">
                No se encontraron materiales
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleOpenDetail(item)}
                    className="bg-[#15161c] border border-zinc-800/80 p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-zinc-900/60 active:scale-[0.99] transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Image Thumbnail */}
                      <div className="h-12 w-12 rounded-lg bg-zinc-950 border border-zinc-850 overflow-hidden flex items-center justify-center shrink-0">
                        {item.image_urls?.[0] || item.image_url ? (
                          <img src={resolveImageUrl(item.image_urls?.[0] || item.image_url) || undefined} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <Archive className="h-5 w-5 text-zinc-650" />
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate max-w-[130px] sm:max-w-[200px]">
                          {item.name}
                        </div>
                        <div className="text-[9px] font-mono text-zinc-500 uppercase mt-0.5">
                          SKU: {item.sku}
                        </div>
                        <div className="mt-1">
                          {getStatusBadge(item.stock, item.min_stock)}
                        </div>
                      </div>
                    </div>

                    {/* Stock Quantity box */}
                    <div className="bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-right shrink-0">
                      <div className="text-sm font-bold text-white font-mono leading-none">
                        {item.stock}
                      </div>
                      <div className="text-[8.5px] font-mono text-zinc-550 uppercase tracking-wide mt-0.5">
                        {item.unit}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {mobileTab === 'logs' && (
          <div className="space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-sm font-bold text-white font-mono uppercase tracking-widest">Stock Movement Logs</span>
              <Button 
                onClick={fetchTransactions}
                size="sm"
                className="bg-zinc-900 border border-zinc-800 text-[10px] font-mono h-7 px-2.5 uppercase text-zinc-400 hover:text-white"
              >
                Refresh
              </Button>
            </div>

            {loadingTxs ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-2">
                <Loader2 className="h-7 w-7 text-emerald-500 animate-spin" />
                <span className="text-zinc-550 text-[11px]">Cargando transacciones...</span>
              </div>
            ) : allTransactions.length === 0 ? (
              <div className="py-12 text-center text-zinc-600 text-xs italic border border-dashed border-zinc-850 rounded-xl">
                No hay movimientos registrados
              </div>
            ) : (
              <div className="space-y-2.5">
                {allTransactions.map(tx => {
                  const dateStr = new Date(tx.created_at).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div 
                      key={tx.id}
                      className="bg-[#15161c] border border-zinc-800 p-3.5 rounded-xl flex items-center justify-between text-left"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="text-[10px] text-zinc-500 font-mono font-bold uppercase">{dateStr}</div>
                        <div className="text-xs font-bold text-white truncate max-w-[170px] sm:max-w-[240px]">
                          {tx.inventory_items?.name || 'Material Eliminado'}
                        </div>
                        <div className="text-[9.5px] text-zinc-450 italic truncate max-w-[170px] sm:max-w-[240px]">
                          {tx.reason || 'Sin motivo especificado'}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-sm font-bold font-mono px-2 py-1 rounded ${
                          tx.transaction_type === 'entrada'
                            ? 'bg-emerald-500/10 text-emerald-450'
                            : tx.transaction_type === 'salida'
                            ? 'bg-rose-500/10 text-rose-455'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {tx.transaction_type === 'entrada' ? '+' : ''}{tx.quantity}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {mobileTab === 'config' && (
          <div className="space-y-5 text-left">
            <div className="border-b border-zinc-800 pb-2">
              <span className="text-sm font-bold text-white font-mono uppercase tracking-widest">WMS Configuration</span>
            </div>

            {/* Category manager */}
            <div className="bg-[#15161c] border border-zinc-800 p-4.5 rounded-xl space-y-3.5">
              <div className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-emerald-400" /> Categorías
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nueva categoría..."
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                />
                <Button 
                  onClick={handleAddCategory}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 h-8.5 rounded-lg"
                >
                  Agregar
                </Button>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {categories.map(cat => (
                  <div key={cat.id} className="flex justify-between items-center text-xs py-1.5 border-b border-zinc-850">
                    <span className="text-zinc-300 font-semibold">{cat.name}</span>
                    <button 
                      onClick={() => handleDeleteCat(cat.id)}
                      className="text-zinc-500 hover:text-rose-500 p-1 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Tag manager */}
            <div className="bg-[#15161c] border border-zinc-800 p-4.5 rounded-xl space-y-3.5">
              <div className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-emerald-400" /> Etiquetas
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nueva etiqueta..."
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                />
                <Button 
                  onClick={handleAddTagAction}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 h-8.5 rounded-lg"
                >
                  Agregar
                </Button>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {tags.map(tag => (
                  <div key={tag.id} className="flex justify-between items-center text-xs py-1.5 border-b border-zinc-850">
                    <span className="text-zinc-300 font-semibold">{tag.name}</span>
                    <button 
                      onClick={() => handleDeleteTagAction(tag.id)}
                      className="text-zinc-550 hover:text-rose-500 p-1 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Providers manager */}
            <div className="bg-[#15161c] border border-zinc-800 p-4.5 rounded-xl space-y-3.5">
              <div className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
                <User className="h-4 w-4 text-emerald-400" /> Proveedores
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nuevo proveedor..."
                  value={mobileNewProvider}
                  onChange={e => setMobileNewProvider(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                />
                <Button 
                  onClick={handleMobileAddProvider}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 h-8.5 rounded-lg"
                >
                  Agregar
                </Button>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {mobileProviders.map(p => (
                  <div key={p} className="flex justify-between items-center text-xs py-1.5 border-b border-zinc-850">
                    <span className="text-zinc-300 font-semibold">{p}</span>
                    <button 
                      onClick={() => handleMobileDeleteProvider(p)}
                      className="text-zinc-550 hover:text-rose-500 p-1 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* FIXED BOTTOM NAVIGATION BAR */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#15161c] border-t border-zinc-800 h-16 flex items-center justify-around px-4 shadow-2xl">
          {/* TAB 1: HOME */}
          <button
            onClick={() => setMobileTab('home')}
            className={`flex flex-col items-center justify-center space-y-0.5 cursor-pointer ${
              mobileTab === 'home' ? 'text-amber-500' : 'text-zinc-550'
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-[8.5px] font-bold font-mono uppercase tracking-wider">Home</span>
          </button>

          {/* TAB 2: ITEMS */}
          <button
            onClick={() => setMobileTab('items')}
            className={`flex flex-col items-center justify-center space-y-0.5 cursor-pointer ${
              mobileTab === 'items' ? 'text-amber-500' : 'text-zinc-550'
            }`}
          >
            <Archive className="h-5 w-5" />
            <span className="text-[8.5px] font-bold font-mono uppercase tracking-wider">Items</span>
          </button>

          {/* CENTRAL FLOATING SCAN BUTTON */}
          <div className="relative -top-3 shrink-0">
            <button
              onClick={() => alert('Escaneando código de barras/QR mediante cámara móvil...')}
              className="h-14 w-14 bg-amber-500 hover:bg-amber-400 text-black rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all border-4 border-[#121214] cursor-pointer"
            >
              <QrCode className="h-6 w-6 font-extrabold" />
            </button>
          </div>

          {/* TAB 3: LOGS */}
          <button
            onClick={() => setMobileTab('logs')}
            className={`flex flex-col items-center justify-center space-y-0.5 cursor-pointer ${
              mobileTab === 'logs' ? 'text-amber-500' : 'text-zinc-550'
            }`}
          >
            <ClipboardList className="h-5 w-5" />
            <span className="text-[8.5px] font-bold font-mono uppercase tracking-wider">Logs</span>
          </button>

          {/* TAB 4: PROFILE/CONFIG */}
          <button
            onClick={() => setMobileTab('config')}
            className={`flex flex-col items-center justify-center space-y-0.5 cursor-pointer ${
              mobileTab === 'config' ? 'text-amber-500' : 'text-zinc-550'
            }`}
          >
            <Settings className="h-5 w-5" />
            <span className="text-[8.5px] font-bold font-mono uppercase tracking-wider">Config</span>
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. WMS DIALOGS / DRAWER REGISTRATION */}
      {/* ========================================================================= */}
      {/* MODAL: INGRESAR MATERIAL */}
      <AddMaterialModal
        isAddModalOpen={isAddModalOpen}
        setIsAddModalOpen={setIsAddModalOpen}
        categories={categories}
        tags={tags}
        addForm={addForm}
        setAddForm={setAddForm}
        uploadedImages={uploadedImages}
        setUploadedImages={setUploadedImages}
        uploadingImage={uploadingImage}
        actionLoading={actionLoading}
        handleImageUpload={handleImageUpload}
        handleCreateItem={handleCreateItem}
      />

      {/* MODAL: CONFIGURAR WMS */}
      <ConfigWMSModal
        isConfigModalOpen={isConfigModalOpen}
        setIsConfigModalOpen={setIsConfigModalOpen}
        configTab={configTab}
        setConfigTab={setConfigTab}
        newCategoryName={newCategoryName}
        setNewCategoryName={setNewCategoryName}
        newTagName={newTagName}
        setNewTagName={setNewTagName}
        categories={categories}
        tags={tags}
        handleAddCategory={handleAddCategory}
        handleDeleteCat={handleDeleteCat}
        handleAddTagAction={handleAddTagAction}
        handleDeleteTagAction={handleDeleteTagAction}
      />

      {/* MODAL: AJUSTE MASIVO */}
      <BulkAdjustmentModal
        isBulkModalOpen={isBulkModalOpen}
        setIsBulkModalOpen={setIsBulkModalOpen}
        bulkList={bulkList}
        setBulkList={setBulkList}
        actionLoading={actionLoading}
        selectedItemIds={selectedItemIds}
        handleSaveBulk={handleSaveBulk}
        loadData={loadData}
        setSelectedItemIds={setSelectedItemIds}
      />

      {/* DRAWER: DETALLE DEL MATERIAL Y KARDEX */}
      <MaterialDetailDrawer
        isDetailDrawerOpen={isDetailDrawerOpen}
        setIsDetailDrawerOpen={setIsDetailDrawerOpen}
        selectedItem={selectedItem}
        itemTransactions={itemTransactions}
        loadingTransactions={loadingTransactions}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        activeImgUrl={activeImgUrl}
        setActiveImgUrl={setActiveImgUrl}
        editForm={editForm}
        setEditForm={setEditForm}
        uploadingImage={uploadingImage}
        actionLoading={actionLoading}
        categories={categories}
        tags={tags}
        handleStartEdit={handleStartEdit}
        handleSaveEdit={handleSaveEdit}
        handleEditImageUpload={handleEditImageUpload}
      />
    </div>
  );
}
