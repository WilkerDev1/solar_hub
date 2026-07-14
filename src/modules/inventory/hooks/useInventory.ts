'use client';

import { useState, useEffect } from 'react';
import {
  getInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  getLatestTransactionsMap,
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
  InventoryAnalytics
} from '@/core/services/inventory';

export function useInventory() {
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

  // Selection states
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(true);

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

  // Selection handlers
  const handleToggleSelectItem = (id: string) => {
    setSelectedItemIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedItemIds.length === items.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(items.map(item => item.id));
    }
  };

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
  const openBulkAdjustment = (overrideItems?: any) => {
    const isOverride = Array.isArray(overrideItems);
    const itemsToAdjust = isOverride
      ? overrideItems
      : (selectedItemIds.length > 0
        ? items.filter(item => selectedItemIds.includes(item.id))
        : items);

    const list = itemsToAdjust.map(item => ({
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
      setSelectedItemIds([]); // Clear selection after successful adjustment
      loadData();
    } catch (err: any) {
      alert('Error en ajuste masivo: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return {
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
    setSelectedItem,
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
  };
}
