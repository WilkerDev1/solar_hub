'use client';

import React from 'react';
import { Archive, Plus, Search, Sliders, Settings, SlidersHorizontal, Loader2, X } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { RequirePermission } from '@/core/auth/AuthContext';
import { useInventory } from './hooks/useInventory';

// Subcomponents
import { AnalyticsCards } from './components/AnalyticsCards';
import { FiltersSidebar } from './components/FiltersSidebar';
import { CatalogTable } from './components/CatalogTable';
import { AddMaterialModal } from './components/AddMaterialModal';
import { ConfigWMSModal } from './components/ConfigWMSModal';
import { BulkAdjustmentModal } from './components/BulkAdjustmentModal';
import { MaterialDetailDrawer } from './components/MaterialDetailDrawer';

export default function InventoryModule() {
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
    handleSaveBulk
  } = useInventory();

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
          <Button onClick={handleRefresh} variant="outline" className="bg-[#121214] border border-zinc-805 text-zinc-400 hover:text-white rounded-lg h-10" disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sincronizar'}
          </Button>

          <Button 
            onClick={() => setIsFilterOpen(!isFilterOpen)} 
            variant="outline" 
            className={`bg-[#121214] border border-zinc-808 text-zinc-400 hover:text-white rounded-lg h-10 transition-colors ${
              isFilterOpen ? 'border-emerald-500/30 text-emerald-450' : ''
            }`}
          >
            <SlidersHorizontal className="h-4 w-4 mr-1.5" />
            {isFilterOpen ? 'Ocultar Filtros' : 'Filtros'}
          </Button>

          <RequirePermission action="inventory:write">
            <Button 
              onClick={openBulkAdjustment} 
              className={`font-bold text-xs h-10 px-4 rounded-lg transition-all ${
                selectedItemIds.length > 0
                  ? 'bg-amber-500 text-black hover:bg-amber-400 animate-pulse'
                  : 'bg-amber-600/10 text-amber-400 hover:bg-amber-600 hover:text-black border border-amber-500/20'
              }`}
            >
              <Sliders className="h-4 w-4 mr-1.5" /> Ajuste Masivo {selectedItemIds.length > 0 ? `(${selectedItemIds.length})` : ''}
            </Button>
            <Button onClick={() => setIsConfigModalOpen(true)} className="bg-[#121214] border border-zinc-808 text-zinc-350 hover:text-white font-bold text-xs h-10 px-4 rounded-lg">
              <Settings className="h-4 w-4 mr-1.5" /> Configurar WMS
            </Button>
            <Button onClick={() => setIsAddModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 px-4 rounded-lg">
              <Plus className="h-4 w-4 mr-1.5" /> Ingresar Material
            </Button>
          </RequirePermission>
        </div>
      </div>

      {/* Analytics Cards */}
      <AnalyticsCards analytics={analytics} />

      {/* Flexible Layout container for Table + Sidebar */}
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
        {/* Catalog Content Area */}
        <div className="flex-1 w-full space-y-6 min-w-0">
          {/* Search bar */}
          <div className="bg-[#1c1c21] border border-zinc-800 p-4 rounded-lg flex items-center gap-3 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar por nombre o SKU..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-colors h-10 font-semibold"
              />
            </div>
            {selectedItemIds.length > 0 && (
              <div className="flex items-center gap-2 shrink-0 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3.5 py-2 rounded-lg text-xs font-bold font-mono">
                {selectedItemIds.length} seleccionados
                <button 
                  onClick={() => setSelectedItemIds([])}
                  className="text-zinc-500 hover:text-white transition-colors cursor-pointer ml-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Catalog Table */}
          <CatalogTable
            items={items}
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

        {/* Sidebar Filters Panel right */}
        <FiltersSidebar
          isFilterOpen={isFilterOpen}
          setIsFilterOpen={setIsFilterOpen}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedTag={selectedTag}
          setSelectedTag={setSelectedTag}
          filterLowStock={filterLowStock}
          setFilterLowStock={setFilterLowStock}
          categories={categories}
          tags={tags}
          setSearchQuery={setSearchQuery}
        />
      </div>

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
