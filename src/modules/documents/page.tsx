'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/core/database/supabase';
import { getApiUrl } from '@/core/utils/api';
import {
  getAllFolders,
  getDocuments,
  createFolder,
  renameFolder,
  deleteFolder,
  uploadDocument,
  renameDocument,
  deleteDocument,
  buildFolderTree,
  getFolderPath,
  formatFileSize,
  isImageMime,
  isPdfMime,
  type FolderRow,
  type FolderNode,
  type DocumentRow,
} from '@/core/services/documents';

import {
  Folder,
  FolderOpen,
  FileText,
  File,
  Image,
  FileVideo,
  FileArchive,
  ChevronRight,
  ChevronDown,
  Upload,
  FolderPlus,
  Trash2,
  Pencil,
  Download,
  Search,
  LayoutGrid,
  List,
  X,
  Check,
  Loader2,
  AlertCircle,
  Eye,
  MoreVertical,
  RefreshCw,
  FilePlus,
} from 'lucide-react';

// ─── Icon helpers ─────────────────────────────────────────────────────────────

function FileIcon({ mime, ext, size = 'md' }: { mime: string | null; ext: string; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-10 w-10' : 'h-6 w-6';
  if (isImageMime(mime)) return <Image className={`${cls} text-purple-400`} />;
  if (isPdfMime(mime)) return <FileText className={`${cls} text-rose-400`} />;
  if (mime?.includes('video')) return <FileVideo className={`${cls} text-blue-400`} />;
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) return <FileArchive className={`${cls} text-amber-400`} />;
  return <File className={`${cls} text-zinc-400`} />;
}

// ─── Folder Tree Node ─────────────────────────────────────────────────────────

function FolderTreeNode({
  node,
  depth,
  selectedFolderId,
  onSelect,
}: {
  node: FolderNode;
  depth: number;
  selectedFolderId: string | null;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedFolderId === node.id;

  return (
    <div>
      <button
        onClick={() => {
          onSelect(node.id);
          if (hasChildren) setExpanded(e => !e);
        }}
        className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-left transition-all group
          ${isSelected
            ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/25'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
          }`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {hasChildren ? (
          expanded
            ? <ChevronDown className="h-3 w-3 shrink-0 text-zinc-500" />
            : <ChevronRight className="h-3 w-3 shrink-0 text-zinc-500" />
        ) : (
          <span className="w-3 shrink-0" />
        )}
        {expanded && hasChildren
          ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          : <Folder className="h-3.5 w-3.5 shrink-0 text-amber-400/80" />
        }
        <span className="truncate">{node.name}</span>
      </button>

      {expanded && hasChildren && (
        <div>
          {node.children.map(child => (
            <FolderTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Rename Inline Input ──────────────────────────────────────────────────────

function InlineRename({ value, onSave, onCancel }: { value: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [val, setVal] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);

  return (
    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
      <input
        ref={ref}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') onSave(val.trim() || value);
          if (e.key === 'Escape') onCancel();
        }}
        className="bg-zinc-800 border border-emerald-500/50 text-white text-xs rounded px-2 py-0.5 w-36 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
      <button onClick={() => onSave(val.trim() || value)} className="text-emerald-400 hover:text-emerald-300">
        <Check className="h-3.5 w-3.5" />
      </button>
      <button onClick={onCancel} className="text-zinc-500 hover:text-zinc-300">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Preview Modal ─────────────────────────────────────────────────────────────

function PreviewModal({ doc, token, onClose }: { doc: DocumentRow; token: string | null; onClose: () => void }) {
  const url = getApiUrl(`/api/storage/file/${doc.id}?token=${token || ''}`);
  const ext = doc.name.split('.').pop()?.toLowerCase() || '';
  const isImg = isImageMime(doc.mime_type);
  const isPdf = isPdfMime(doc.mime_type);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-3 min-w-0">
            <FileIcon mime={doc.mime_type} ext={ext} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{doc.name}</p>
              <p className="text-[10px] text-zinc-500">{formatFileSize(doc.file_size)} · {doc.mime_type || 'desconocido'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={url}
              download={doc.name}
              className="flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Descargar
            </a>
            <button onClick={onClose} className="h-8 w-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-zinc-950 p-4">
          {isImg ? (
            <img src={url} alt={doc.name} className="max-w-full max-h-full object-contain rounded-xl" />
          ) : isPdf ? (
            <iframe src={url} title={doc.name} className="w-full h-full min-h-[500px] rounded-xl border border-zinc-800" />
          ) : (
            <div className="text-center space-y-4">
              <FileIcon mime={doc.mime_type} ext={ext} size="lg" />
              <p className="text-zinc-400 text-sm">Sin previsualización disponible para este tipo de archivo.</p>
              <a
                href={url}
                download={doc.name}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-colors"
              >
                <Download className="h-4 w-4" /> Descargar archivo
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Module ───────────────────────────────────────────────────────────────

export default function DocumentsModule() {
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [folderTree, setFolderTree] = useState<FolderNode[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // UI state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [previewDoc, setPreviewDoc] = useState<DocumentRow | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Folder actions state
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resolved breadcrumb path
  const breadcrumb = selectedFolderId ? getFolderPath(folders, selectedFolderId) : [];

  // ── Auth token ─────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token || null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setToken(session?.access_token || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Load all folders ────────────────────────────────────────────────────────
  const loadFolders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllFolders();
      setFolders(data);
      setFolderTree(buildFolderTree(data));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFolders(); }, [loadFolders]);

  // ── Load documents for selected folder ─────────────────────────────────────
  const loadDocuments = useCallback(async (folderId: string | null) => {
    setLoadingDocs(true);
    try {
      const data = await getDocuments(folderId);
      setDocuments(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    if (selectedFolderId !== null) {
      loadDocuments(selectedFolderId);
    } else {
      setDocuments([]);
    }
  }, [selectedFolderId, loadDocuments]);

  // ── Flash messages ──────────────────────────────────────────────────────────
  function flash(msg: string, type: 'success' | 'error' = 'success') {
    if (type === 'success') { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000); }
    else { setError(msg); setTimeout(() => setError(null), 5000); }
  }

  // ── Folder operations ───────────────────────────────────────────────────────
  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      await createFolder({ name, parentId: selectedFolderId });
      setNewFolderName('');
      setShowNewFolderInput(false);
      await loadFolders();
      flash(`Carpeta "${name}" creada`);
    } catch (e: any) { flash(e.message, 'error'); }
  }

  async function handleRenameFolder(id: string, name: string) {
    try {
      await renameFolder(id, name);
      setRenamingFolderId(null);
      await loadFolders();
      flash('Carpeta renombrada');
    } catch (e: any) { flash(e.message, 'error'); }
  }

  async function handleDeleteFolder(id: string) {
    if (!confirm('¿Eliminar esta carpeta y todo su contenido? Esta acción no se puede deshacer.')) return;
    setDeletingId(id);
    try {
      await deleteFolder(id);
      if (selectedFolderId === id) setSelectedFolderId(null);
      await loadFolders();
      flash('Carpeta eliminada');
    } catch (e: any) { flash(e.message, 'error'); }
    finally { setDeletingId(null); }
  }

  // ── Document operations ─────────────────────────────────────────────────────
  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!selectedFolderId) { flash('Selecciona una carpeta primero para subir archivos.', 'error'); return; }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadDocument(file, selectedFolderId);
      }
      await loadDocuments(selectedFolderId);
      flash(`${files.length} archivo(s) subido(s) correctamente`);
    } catch (e: any) { flash(e.message, 'error'); }
    finally { setUploading(false); }
  }

  async function handleRenameDoc(id: string, name: string) {
    try {
      await renameDocument(id, name);
      setRenamingDocId(null);
      await loadDocuments(selectedFolderId);
      flash('Archivo renombrado');
    } catch (e: any) { flash(e.message, 'error'); }
  }

  async function handleDeleteDoc(id: string, name: string) {
    if (!confirm(`¿Eliminar "${name}" permanentemente?`)) return;
    setDeletingId(id);
    try {
      await deleteDocument(id);
      await loadDocuments(selectedFolderId);
      flash('Archivo eliminado');
    } catch (e: any) { flash(e.message, 'error'); }
    finally { setDeletingId(null); }
  }

  // ── Filtered lists ──────────────────────────────────────────────────────────
  const subFolders = folders.filter(f => f.parent_id === selectedFolderId);
  const filteredFolders = search
    ? subFolders.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    : subFolders;
  const filteredDocs = search
    ? documents.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
    : documents;

  const isEmpty = filteredFolders.length === 0 && filteredDocs.length === 0;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-8rem)] bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden">

      {/* ── Left Panel: Folder Tree ────────────────────────────────────── */}
      <div className="w-60 shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-900/50">
        {/* Tree Header */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-zinc-800 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Árbol de Carpetas</span>
          <button
            onClick={() => { setShowNewFolderInput(true); }}
            title="Nueva carpeta"
            className="h-6 w-6 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-emerald-400 transition-colors"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Tree body */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {/* Root option */}
          <button
            onClick={() => setSelectedFolderId(null)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-left transition-all
              ${selectedFolderId === null
                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/25'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
              }`}
          >
            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span>Raíz (Empresa)</span>
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-600" />
            </div>
          ) : (
            folderTree.map(node => (
              <FolderTreeNode
                key={node.id}
                node={node}
                depth={0}
                selectedFolderId={selectedFolderId}
                onSelect={setSelectedFolderId}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right Panel: Explorer ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Toolbar */}
        <div className="h-12 border-b border-zinc-800 flex items-center gap-3 px-4 shrink-0 bg-zinc-900/30">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-xs text-zinc-500 flex-1 min-w-0 truncate">
            <button
              onClick={() => setSelectedFolderId(null)}
              className="hover:text-zinc-200 transition-colors font-medium"
            >
              Empresa
            </button>
            {breadcrumb.map((f, i) => (
              <React.Fragment key={f.id}>
                <ChevronRight className="h-3 w-3 shrink-0" />
                <button
                  onClick={() => setSelectedFolderId(f.id)}
                  className={`hover:text-zinc-200 transition-colors font-medium truncate max-w-[120px] ${i === breadcrumb.length - 1 ? 'text-zinc-200' : ''}`}
                >
                  {f.name}
                </button>
              </React.Fragment>
            ))}
          </nav>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="bg-zinc-800/60 border border-zinc-700 rounded-lg pl-8 pr-3 py-1 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-emerald-600/50 w-40"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowNewFolderInput(true)}
              title="Nueva carpeta"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Carpeta</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !selectedFolderId}
              title={!selectedFolderId ? 'Selecciona una carpeta para subir' : 'Subir archivo(s)'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg text-xs font-bold transition-colors"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Subir</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={e => handleUpload(e.target.files)}
            />

            <div className="flex items-center border border-zinc-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Flash messages */}
        {(error || successMsg) && (
          <div className={`mx-4 mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border
            ${error ? 'bg-rose-950/40 border-rose-800/40 text-rose-300' : 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'}`}>
            {error ? <AlertCircle className="h-4 w-4 shrink-0" /> : <Check className="h-4 w-4 shrink-0" />}
            <span>{error || successMsg}</span>
            <button onClick={() => { setError(null); setSuccessMsg(null); }} className="ml-auto opacity-60 hover:opacity-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* New folder input */}
        {showNewFolderInput && (
          <div className="mx-4 mt-3 flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2">
            <Folder className="h-4 w-4 text-amber-400 shrink-0" />
            <input
              autoFocus
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') { setShowNewFolderInput(false); setNewFolderName(''); }
              }}
              placeholder="Nombre de carpeta nueva..."
              className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 focus:outline-none"
            />
            <button onClick={handleCreateFolder} className="text-xs font-bold text-emerald-400 hover:text-emerald-300 px-2">Crear</button>
            <button onClick={() => { setShowNewFolderInput(false); setNewFolderName(''); }} className="text-zinc-500 hover:text-zinc-300">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Explorer content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loadingDocs ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
            </div>
          ) : isEmpty && !showNewFolderInput ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="h-16 w-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <FolderOpen className="h-8 w-8 text-zinc-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-400">Esta carpeta está vacía</p>
                <p className="text-xs text-zinc-600 mt-1">Sube archivos o crea subcarpetas</p>
              </div>
              {selectedFolderId && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/30 text-emerald-400 rounded-xl text-sm font-semibold transition-colors"
                >
                  <Upload className="h-4 w-4" /> Subir primer archivo
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            // ─── GRID VIEW ──────────────────────────────────────────────────
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {/* Folder cards */}
              {filteredFolders.map(folder => (
                <div
                  key={folder.id}
                  className="group relative bg-zinc-900/50 hover:bg-zinc-800/60 border border-zinc-800 hover:border-zinc-700 rounded-xl p-3 flex flex-col gap-2 cursor-pointer transition-all"
                  onDoubleClick={() => setSelectedFolderId(folder.id)}
                >
                  <div className="flex items-start justify-between">
                    <FolderOpen className="h-8 w-8 text-amber-400" />
                    {/* Context menu */}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                      <button
                        onClick={e => { e.stopPropagation(); setRenamingFolderId(folder.id); }}
                        className="h-6 w-6 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                        disabled={deletingId === folder.id}
                        className="h-6 w-6 flex items-center justify-center bg-zinc-800 hover:bg-rose-900/60 rounded text-zinc-400 hover:text-rose-400"
                      >
                        {deletingId === folder.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                  {renamingFolderId === folder.id ? (
                    <InlineRename
                      value={folder.name}
                      onSave={name => handleRenameFolder(folder.id, name)}
                      onCancel={() => setRenamingFolderId(null)}
                    />
                  ) : (
                    <p className="text-xs font-semibold text-zinc-300 truncate" title={folder.name}>
                      {folder.name}
                    </p>
                  )}
                  <p className="text-[9px] text-zinc-600 uppercase tracking-wide font-mono">Carpeta</p>
                </div>
              ))}

              {/* Document cards */}
              {filteredDocs.map(doc => {
                const ext = doc.name.split('.').pop()?.toLowerCase() || '';
                const isImg = isImageMime(doc.mime_type);
                const fileUrl = getApiUrl(`/api/storage/file/${doc.id}?token=${token || ''}`);

                return (
                  <div
                    key={doc.id}
                    className="group relative bg-zinc-900/50 hover:bg-zinc-800/60 border border-zinc-800 hover:border-zinc-700 rounded-xl p-3 flex flex-col gap-2 cursor-pointer transition-all"
                    onDoubleClick={() => setPreviewDoc(doc)}
                  >
                    {/* Preview area */}
                    <div className="h-16 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden">
                      {isImg ? (
                        <img src={fileUrl} alt={doc.name} className="w-full h-full object-cover" />
                      ) : (
                        <FileIcon mime={doc.mime_type} ext={ext} size="md" />
                      )}
                    </div>

                    {/* Actions */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                      <button
                        onClick={e => { e.stopPropagation(); setPreviewDoc(doc); }}
                        className="h-6 w-6 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"
                      >
                        <Eye className="h-3 w-3" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setRenamingDocId(doc.id); }}
                        className="h-6 w-6 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <a
                        href={fileUrl}
                        download={doc.name}
                        onClick={e => e.stopPropagation()}
                        className="h-6 w-6 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"
                      >
                        <Download className="h-3 w-3" />
                      </a>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteDoc(doc.id, doc.name); }}
                        disabled={deletingId === doc.id}
                        className="h-6 w-6 flex items-center justify-center bg-zinc-800 hover:bg-rose-900/60 rounded text-zinc-400 hover:text-rose-400"
                      >
                        {deletingId === doc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </button>
                    </div>

                    {renamingDocId === doc.id ? (
                      <InlineRename
                        value={doc.name}
                        onSave={name => handleRenameDoc(doc.id, name)}
                        onCancel={() => setRenamingDocId(null)}
                      />
                    ) : (
                      <p className="text-xs font-semibold text-zinc-300 truncate" title={doc.name}>{doc.name}</p>
                    )}
                    <p className="text-[9px] text-zinc-600 uppercase tracking-wide font-mono">{formatFileSize(doc.file_size)}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            // ─── LIST VIEW ───────────────────────────────────────────────────
            <div className="space-y-0.5">
              {/* List header */}
              <div className="grid grid-cols-[auto,1fr,120px,100px,100px] gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                <span className="w-6" />
                <span>Nombre</span>
                <span>Tipo</span>
                <span>Tamaño</span>
                <span className="text-right">Acciones</span>
              </div>

              {/* Folders */}
              {filteredFolders.map(folder => (
                <div
                  key={folder.id}
                  className="group grid grid-cols-[auto,1fr,120px,100px,100px] gap-3 items-center px-3 py-2 rounded-xl hover:bg-zinc-800/40 cursor-pointer transition-colors"
                  onDoubleClick={() => setSelectedFolderId(folder.id)}
                >
                  <FolderOpen className="h-4 w-4 text-amber-400" />
                  <div className="min-w-0">
                    {renamingFolderId === folder.id ? (
                      <InlineRename
                        value={folder.name}
                        onSave={name => handleRenameFolder(folder.id, name)}
                        onCancel={() => setRenamingFolderId(null)}
                      />
                    ) : (
                      <span className="text-xs font-semibold text-zinc-300 truncate block">{folder.name}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-600 font-mono uppercase">Carpeta</span>
                  <span className="text-[10px] text-zinc-700">—</span>
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setRenamingFolderId(folder.id)} className="h-6 w-6 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white">
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button onClick={() => handleDeleteFolder(folder.id)} disabled={deletingId === folder.id} className="h-6 w-6 flex items-center justify-center bg-zinc-800 hover:bg-rose-900/60 rounded text-zinc-400 hover:text-rose-400">
                      {deletingId === folder.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              ))}

              {/* Documents */}
              {filteredDocs.map(doc => {
                const ext = doc.name.split('.').pop()?.toLowerCase() || '';
                const fileUrl = getApiUrl(`/api/storage/file/${doc.id}?token=${token || ''}`);
                return (
                  <div
                    key={doc.id}
                    className="group grid grid-cols-[auto,1fr,120px,100px,100px] gap-3 items-center px-3 py-2 rounded-xl hover:bg-zinc-800/40 cursor-pointer transition-colors"
                    onDoubleClick={() => setPreviewDoc(doc)}
                  >
                    <FileIcon mime={doc.mime_type} ext={ext} size="sm" />
                    <div className="min-w-0">
                      {renamingDocId === doc.id ? (
                        <InlineRename
                          value={doc.name}
                          onSave={name => handleRenameDoc(doc.id, name)}
                          onCancel={() => setRenamingDocId(null)}
                        />
                      ) : (
                        <span className="text-xs font-semibold text-zinc-300 truncate block">{doc.name}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-600 font-mono uppercase">{ext || '—'}</span>
                    <span className="text-[10px] text-zinc-600">{formatFileSize(doc.file_size)}</span>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setPreviewDoc(doc)} className="h-6 w-6 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white">
                        <Eye className="h-3 w-3" />
                      </button>
                      <button onClick={() => setRenamingDocId(doc.id)} className="h-6 w-6 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <a href={fileUrl} download={doc.name} className="h-6 w-6 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white">
                        <Download className="h-3 w-3" />
                      </a>
                      <button onClick={() => handleDeleteDoc(doc.id, doc.name)} disabled={deletingId === doc.id} className="h-6 w-6 flex items-center justify-center bg-zinc-800 hover:bg-rose-900/60 rounded text-zinc-400 hover:text-rose-400">
                        {deletingId === doc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="h-8 border-t border-zinc-800 flex items-center px-4 gap-4 text-[10px] text-zinc-600 font-mono bg-zinc-900/30 shrink-0">
          <span>{filteredFolders.length} carpeta(s)</span>
          <span>·</span>
          <span>{filteredDocs.length} archivo(s)</span>
          {selectedFolderId && (
            <>
              <span>·</span>
              <span className="text-zinc-500">
                {breadcrumb.map(f => f.name).join(' / ') || 'Raíz'}
              </span>
            </>
          )}
          <button
            onClick={() => { loadFolders(); if (selectedFolderId) loadDocuments(selectedFolderId); }}
            className="ml-auto hover:text-zinc-300 flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="h-3 w-3" /> Actualizar
          </button>
        </div>
      </div>

      {/* Preview modal */}
      {previewDoc && (
        <PreviewModal doc={previewDoc} token={token} onClose={() => setPreviewDoc(null)} />
      )}
    </div>
  );
}
