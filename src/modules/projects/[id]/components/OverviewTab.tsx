'use client';

import React, { useState } from 'react';
import {
  MapPin, User, Briefcase, Camera, Upload, Loader2,
  ChevronLeft, ChevronRight, X, Image as ImageIcon
} from 'lucide-react';
import { ProjectDetailContext } from '../hooks/useProjectDetail';

type Props = Pick<ProjectDetailContext,
  'project' | 'employees' | 'projectDocuments' | 'handleUploadBanner' | 'handleUploadGalleryImage' | 'uploadingFile'
>;

export default function OverviewTab({
  project, employees, projectDocuments = [],
  handleUploadBanner, handleUploadGalleryImage, uploadingFile
}: Props) {
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const [zoomName, setZoomName] = useState<string>('');
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Filter project documents for images
  const images = projectDocuments.filter(doc => {
    const extension = doc.name.split('.').pop()?.toLowerCase() || '';
    const isImg = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(extension) || (doc.mime_type && doc.mime_type.startsWith('image/'));
    return isImg;
  }).map(doc => ({
    id: doc.id,
    name: doc.name,
    url: `/api/storage/file/${doc.id}?name=${encodeURIComponent(doc.name)}`
  }));

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUploadBanner(e.target.files[0]);
    }
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUploadGalleryImage(e.target.files[0]);
    }
  };

  // Carousel controls
  const nextSlide = () => {
    if (carouselIndex + 3 < images.length) {
      setCarouselIndex(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (carouselIndex > 0) {
      setCarouselIndex(prev => prev - 1);
    }
  };

  const visibleImages = images.slice(carouselIndex, carouselIndex + 3);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

      {/* Left Column: Banner, Description & Gallery */}
      <div className="md:col-span-2 space-y-6">
        
        {/* Banner with Upload Bridge */}
        <div className="h-48 rounded-2xl overflow-hidden border border-zinc-900 relative group">
          {project.banner_url ? (
            <img src={project.banner_url} alt="Project banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-650">
              <ImageIcon className="h-10 w-10 opacity-30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-zinc-950/20 to-transparent" />

          {/* Change Banner Hover Trigger */}
          <label className="absolute top-4 right-4 bg-zinc-950/80 border border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700 text-white rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity z-10 select-none">
            <input type="file" onChange={handleBannerChange} className="hidden" disabled={uploadingFile} />
            {uploadingFile ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-450" />
                <span>Actualizando...</span>
              </>
            ) : (
              <>
                <Camera className="h-3.5 w-3.5 text-zinc-400" />
                <span>Cambiar Banner</span>
              </>
            )}
          </label>
        </div>

        {/* Ficha Descriptiva */}
        <div className="bg-zinc-900/10 border border-zinc-900 p-6 rounded-2xl space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 font-mono">Ficha Descriptiva</h3>
          <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-line">
            {project.description || 'Sin descripción detallada registrada para esta obra.'}
          </p>
        </div>

        {/* Gallery Section */}
        <div className="bg-zinc-900/10 border border-zinc-900 p-6 rounded-2xl space-y-5 text-left">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <div className="flex items-center gap-2">
              <Camera className="h-4.5 w-4.5 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 font-mono">
                Galería de Progreso ({images.length})
              </h3>
            </div>
            
            {/* Direct Image Upload */}
            <label className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:text-white text-zinc-350 text-[10px] font-bold h-8 px-3 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
              <input type="file" onChange={handleGalleryUpload} className="hidden" disabled={uploadingFile} />
              {uploadingFile ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Subiendo...</span>
                </>
              ) : (
                <>
                  <Upload className="h-3 w-3" />
                  <span>Subir Foto</span>
                </>
              )}
            </label>
          </div>

          {/* Carousel */}
          {images.length === 0 ? (
            <div className="py-8 text-center italic text-zinc-650 text-xs">
              No hay fotos cargadas en la galería de este proyecto. ¡Sube tu primera imagen del progreso de la obra!
            </div>
          ) : (
            <div className="relative flex items-center gap-2">
              {/* Prev Button */}
              <button
                onClick={prevSlide}
                disabled={carouselIndex === 0}
                className="h-8 w-8 bg-zinc-950 border border-zinc-850 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="h-4.5 w-4.5" />
              </button>

              {/* Visible Slide group of 3 */}
              <div className="flex-1 grid grid-cols-3 gap-4">
                {visibleImages.map((img) => (
                  <div
                    key={img.id}
                    onClick={() => { setZoomUrl(img.url); setZoomName(img.name); }}
                    className="h-28 border border-zinc-800 hover:border-emerald-500/50 rounded-xl overflow-hidden bg-zinc-950 cursor-zoom-in relative group transition-colors"
                  >
                    <img src={img.url} alt={img.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                      <span className="text-[9px] text-white truncate w-full font-mono">{img.name}</span>
                    </div>
                  </div>
                ))}
                
                {/* Pad columns if less than 3 image slots */}
                {Array.from({ length: Math.max(0, 3 - visibleImages.length) }).map((_, idx) => (
                  <div key={idx} className="h-28 border border-dashed border-zinc-850 rounded-xl flex items-center justify-center text-zinc-700 bg-zinc-950/10">
                    <ImageIcon className="h-6 w-6 opacity-10" />
                  </div>
                ))}
              </div>

              {/* Next Button */}
              <button
                onClick={nextSlide}
                disabled={carouselIndex + 3 >= images.length}
                className="h-8 w-8 bg-zinc-950 border border-zinc-850 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Right Column: Technical Details, Client Info & Work Team */}
      <div className="space-y-6">
        
        {/* Technical Attributes */}
        <div className="bg-zinc-900/30 border border-zinc-900 p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 font-mono flex items-center gap-1.5 pb-2.5 border-b border-zinc-900">
            <MapPin className="h-4 w-4 text-emerald-400" /> Atributos Técnicos
          </h3>
          <div className="space-y-3 text-xs leading-normal">
            <div className="flex justify-between py-1.5 border-b border-zinc-900">
              <span className="text-zinc-500 font-medium">Ubicación Física</span>
              <span className="font-bold text-zinc-350 text-right">{project.location || 'N/D'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-900 font-mono">
              <span className="text-zinc-500 font-medium">Coordenadas GPS</span>
              <span className="font-bold text-amber-400">{project.gps_coordinates || 'N/D'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-zinc-500 font-medium">Capacidad Nominal</span>
              <span className="font-bold text-zinc-350">{project.capacity || 'N/D'}</span>
            </div>
          </div>
        </div>

        {/* Client Profile / Expediente */}
        <div className="bg-zinc-900/30 border border-zinc-900 p-5 rounded-2xl space-y-4 text-left">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 font-mono flex items-center gap-1.5 pb-2.5 border-b border-zinc-900">
            <Briefcase className="h-4 w-4 text-emerald-400" /> Expediente del Cliente
          </h3>
          <div className="space-y-3 text-xs leading-normal">
            <div className="flex justify-between py-1.5 border-b border-zinc-900">
              <span className="text-zinc-500 font-medium">Razón Social</span>
              <span className="font-bold text-zinc-300 text-right">{project.clients?.name || 'N/D'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-900">
              <span className="text-zinc-500 font-medium">RNC / Cédula</span>
              <span className="font-bold text-zinc-300">{project.clients?.document_id || 'N/D'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-900">
              <span className="text-zinc-500 font-medium">Teléfono</span>
              <span className="font-bold text-zinc-300">{project.clients?.phone || 'N/D'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-900">
              <span className="text-zinc-500 font-medium">Dirección</span>
              <span className="font-bold text-zinc-300 text-right">{project.clients?.address || 'N/D'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-900">
              <span className="text-zinc-500 font-medium">Categoría</span>
              <span className="font-bold text-zinc-300">{project.clients?.category || 'N/D'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-zinc-500 font-medium">Consumo Promedio</span>
              <span className="font-bold text-zinc-350">
                {project.clients?.avg_kwh_consumption
                  ? `${project.clients.avg_kwh_consumption.toLocaleString()} kWh/mes`
                  : 'N/D'}
              </span>
            </div>
          </div>
        </div>

        {/* Work Team */}
        <div className="bg-zinc-900/30 border border-zinc-900 p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 font-mono flex items-center gap-1.5 pb-2.5 border-b border-zinc-900">
            <User className="h-4 w-4 text-emerald-400" /> Equipo de Obra
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {project.member_ids && project.member_ids.length > 0 ? (
              project.member_ids.map((id: string) => {
                const emp = employees.find(e => e.id === id);
                if (!emp) return null;
                return (
                  <div key={id} className="flex items-center gap-2.5 bg-zinc-900/40 p-2 rounded-xl border border-zinc-900">
                    <div className="h-6 w-6 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-350">
                      {emp.full_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs text-zinc-300 font-bold">{emp.full_name}</span>
                  </div>
                );
              })
            ) : (
              <p className="text-xs italic text-zinc-550">Sin integrantes asignados a la obra.</p>
            )}
          </div>
        </div>
      </div>

      {/* Lightweight zoom view portal */}
      {zoomUrl && (
        <div
          onClick={() => { setZoomUrl(null); }}
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col justify-center items-center">
            <button
              type="button"
              onClick={() => { setZoomUrl(null); }}
              className="absolute -top-12 right-0 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded-full p-2 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={zoomUrl}
              alt={zoomName}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl border border-zinc-800"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="mt-3 text-zinc-300 text-xs font-mono bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-xl truncate max-w-md">
              {zoomName}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
