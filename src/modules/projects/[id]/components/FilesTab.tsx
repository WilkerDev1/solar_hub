'use client';

import React from 'react';
import { Folder, ClipboardList, FileText, Download, Upload, Loader2 } from 'lucide-react';
import { RequirePermission } from '@/core/auth/AuthContext';
import { getApiUrl } from '@/core/utils/api';
import { ProjectDetailContext } from '../hooks/useProjectDetail';

type Props = Pick<ProjectDetailContext,
  'fileFilterDept' | 'setFileFilterDept' | 'fileFilterExt' | 'setFileFilterExt' |
  'selectedUploadDept' | 'setSelectedUploadDept' | 'uploadingFile' |
  'handleDirectFileUpload' | 'getDirectProjectFiles' | 'getEvidenceFiles' | 'token'
>;

export default function FilesTab({
  fileFilterDept, setFileFilterDept, fileFilterExt, setFileFilterExt,
  selectedUploadDept, setSelectedUploadDept, uploadingFile,
  handleDirectFileUpload, getDirectProjectFiles, getEvidenceFiles, token
}: Props) {
  const directFiles = getDirectProjectFiles();
  const evidenceFiles = getEvidenceFiles();

  return (
    <div className="space-y-6 text-left">
      {/* Filter controls & Upload Form */}
      <div className="bg-[#1c1c21] border border-zinc-800 p-5 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-zinc-400">Filtrar Archivos:</span>
          <select
            value={fileFilterDept}
            onChange={e => setFileFilterDept(e.target.value)}
            className="bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none"
          >
            <option value="todos">Departamento: Todos</option>
            <option value="general">General</option>
            <option value="legal">Legal</option>
            <option value="almacen">Almacén</option>
            <option value="operaciones">Operaciones</option>
            <option value="administracion">Administración</option>
          </select>

          <select
            value={fileFilterExt}
            onChange={e => setFileFilterExt(e.target.value)}
            className="bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none"
          >
            <option value="todos">Tipo: Todos</option>
            <option value="images">Imágenes (PNG/JPG/WEBP)</option>
            <option value="pdf">Documentos PDF</option>
            <option value="others">Otros</option>
          </select>
        </div>

        {/* Upload Form directly linked to project/dept */}
        <RequirePermission action="inventory:write">
          <div className="flex items-center gap-2 bg-zinc-955 border border-zinc-850 p-1.5 rounded-lg">
            <select
              value={selectedUploadDept}
              onChange={e => setSelectedUploadDept(e.target.value)}
              className="bg-transparent text-xs text-zinc-300 focus:outline-none px-2 font-semibold"
            >
              <option value="general">Depto: General</option>
              <option value="legal">Depto: Legal</option>
              <option value="almacen">Depto: Almacén</option>
              <option value="operaciones">Depto: Operaciones</option>
              <option value="administracion">Depto: Administración</option>
            </select>

            <label className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold h-7 px-3 rounded flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0">
              <input
                type="file"
                onChange={handleDirectFileUpload}
                className="hidden"
                disabled={uploadingFile}
              />
              {uploadingFile ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Subiendo...</span>
                </>
              ) : (
                <>
                  <Upload className="h-3 w-3" />
                  <span>Subir Archivo</span>
                </>
              )}
            </label>
          </div>
        </RequirePermission>
      </div>

      {/* ─── CATEGORY 1: ARCHIVOS GENERALES O DE DEPARTAMENTO ─── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-zinc-850 pb-2">
          <Folder className="h-4.5 w-4.5 text-amber-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
            Archivos Generales o por Departamento ({directFiles.length})
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {directFiles.map((file) => {
            const signedUrl = file.url.startsWith('/api/storage/file/')
              ? getApiUrl(`${file.url}${file.url.includes('?') ? '&' : '?'}token=${token || ''}`)
              : file.url;

            return (
              <div key={file.id} className="bg-[#1c1c21] border border-zinc-850 p-4 rounded-lg flex flex-col justify-between gap-3 hover:border-zinc-800 transition-colors text-left">
                <div className="flex items-start gap-2.5">
                  <div className="h-10 w-10 bg-zinc-950 border border-zinc-850 rounded-lg flex items-center justify-center shrink-0">
                    {file.isImage ? (
                      <img src={signedUrl} alt="thumbnail" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <FileText className="h-5 w-5 text-emerald-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-white truncate block" title={file.name}>{file.name}</span>
                    <span className="text-[10px] text-zinc-500 block mt-0.5 font-mono">
                      Subido directamente
                    </span>
                  </div>
                </div>

                {file.isImage && (
                  <div className="border border-zinc-950 rounded-lg overflow-hidden bg-zinc-950 max-h-32 flex items-center justify-center">
                    <img src={signedUrl} alt={file.name} className="w-full h-auto max-h-32 object-contain" />
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-zinc-900 pt-3 mt-1">
                  <span className="bg-zinc-950 border border-zinc-850 text-[8px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded text-emerald-450">
                    {file.department.toUpperCase()}
                  </span>
                  <a
                    href={signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-zinc-955 border border-zinc-850 text-[10px] font-bold text-zinc-350 hover:text-white px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="h-3 w-3" /> Descargar
                  </a>
                </div>
              </div>
            );
          })}
          {directFiles.length === 0 && (
            <div className="col-span-full text-center py-6 italic text-zinc-650 text-xs">
              No hay archivos generales o departamentales cargados para este proyecto.
            </div>
          )}
        </div>
      </div>

      {/* ─── CATEGORY 2: ARCHIVOS DE TAREAS ─── */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center gap-2 border-b border-zinc-850 pb-2">
          <ClipboardList className="h-4.5 w-4.5 text-zinc-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
            Archivos de Evidencia de Tareas ({evidenceFiles.length})
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {evidenceFiles.map((file) => {
            const signedUrl = file.url.startsWith('/api/storage/file/')
              ? getApiUrl(`${file.url}${file.url.includes('?') ? '&' : '?'}token=${token || ''}`)
              : file.url;

            return (
              <div key={file.id} className="bg-[#1c1c21] border border-zinc-850 p-4 rounded-lg flex flex-col justify-between gap-3 hover:border-zinc-800 transition-colors text-left">
                <div className="flex items-start gap-2.5">
                  <div className="h-10 w-10 bg-zinc-950 border border-zinc-850 rounded-lg flex items-center justify-center shrink-0">
                    {file.isImage ? (
                      <img src={signedUrl} alt="Evidence thumbnail" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <FileText className="h-5 w-5 text-emerald-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-white truncate block" title={file.name}>{file.name}</span>
                    <span className="text-[10px] text-zinc-500 block mt-0.5 truncate" title={`Tarea: ${file.taskTitle}`}>
                      Tarea: {file.taskTitle}
                    </span>
                  </div>
                </div>

                {file.isImage && (
                  <div className="border border-zinc-950 rounded-lg overflow-hidden bg-zinc-955 max-h-32 flex items-center justify-center">
                    <img src={signedUrl} alt={file.name} className="w-full h-auto max-h-32 object-contain" />
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-zinc-900 pt-3 mt-1">
                  <span className="bg-zinc-950 border border-zinc-850 text-[8px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded text-zinc-500 font-semibold">
                    {file.department.toUpperCase()}
                  </span>
                  <a
                    href={signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-zinc-955 border border-zinc-850 text-[10px] font-bold text-zinc-350 hover:text-white px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="h-3 w-3" /> Descargar
                  </a>
                </div>
              </div>
            );
          })}
          {evidenceFiles.length === 0 && (
            <div className="col-span-full text-center py-6 italic text-zinc-650 text-xs">
              No se encontraron archivos de tareas cargados para los filtros seleccionados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
