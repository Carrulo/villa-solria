'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Photo, PhotoCategory } from '@/lib/supabase';
import { PHOTO_CATEGORIES, PHOTO_CATEGORY_LABELS, getPhotoUrl } from '@/lib/supabase';
import {
  Upload, Trash2, Eye, EyeOff, Star, StarOff, Check, X,
  ImageIcon, Download, ChevronDown, Loader2, AlertCircle,
  CheckSquare, Square, RefreshCw,
} from 'lucide-react';

// Known local photos with sensible defaults
const LOCAL_PHOTOS: { filename: string; category: PhotoCategory; alt: string }[] = [
  { filename: 'hero-ria-formosa.jpg', category: 'hero', alt: 'Ria Formosa panoramic view' },
  { filename: 'aerial-view.jpg', category: 'view', alt: 'Aerial view of Villa Solria' },
  { filename: 'living-room.jpg', category: 'living', alt: 'Living room' },
  { filename: 'kitchen.jpg', category: 'kitchen', alt: 'Kitchen' },
  { filename: 'bedroom-master.jpg', category: 'bedroom', alt: 'Master bedroom' },
  { filename: 'bedroom-double.jpg', category: 'bedroom', alt: 'Double bedroom' },
  { filename: 'bedroom-twin.jpg', category: 'bedroom', alt: 'Twin bedroom' },
  { filename: 'bathroom.jpg', category: 'bathroom', alt: 'Bathroom' },
  { filename: 'terrace-view.jpg', category: 'outdoor', alt: 'Terrace view' },
  { filename: 'garden.jpg', category: 'outdoor', alt: 'Garden' },
  { filename: 'exterior.jpg', category: 'outdoor', alt: 'Exterior' },
  { filename: 'balcony.jpg', category: 'outdoor', alt: 'Balcony' },
  { filename: 'dining-area.jpg', category: 'living', alt: 'Dining area' },
  { filename: 'sunset-view.jpg', category: 'view', alt: 'Sunset view' },
  { filename: 'beach-view.jpg', category: 'view', alt: 'Beach view' },
  { filename: 'entrance.jpg', category: 'general', alt: 'Entrance' },
];

export default function AdminPhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingAlt, setEditingAlt] = useState<string | null>(null);
  const [altText, setAltText] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [importing, setImporting] = useState(false);
  const [bulkCategory, setBulkCategory] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPhotos();
  }, []);

  async function fetchPhotos() {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      showToast('Erro ao carregar fotos', 'error');
    } else {
      setPhotos((data || []) as Photo[]);
    }
    setLoading(false);
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Upload files to Supabase Storage
  async function handleUpload(files: FileList | File[]) {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) {
      showToast('Nenhum ficheiro de imagem válido selecionado', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    let uploaded = 0;

    for (const file of fileArray) {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
      const storagePath = `${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('property-photos')
        .upload(storagePath, file, { contentType: file.type });

      if (uploadError) {
        showToast(`Erro ao carregar ${file.name}: ${uploadError.message}`, 'error');
        continue;
      }

      // Create DB record
      const { error: dbError } = await supabase.from('photos').insert({
        filename: file.name,
        storage_path: storagePath,
        alt_text: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        category: 'general',
        sort_order: photos.length + uploaded,
        source: 'storage',
        is_visible: true,
        is_hero: false,
      });

      if (dbError) {
        showToast(`Erro BD para ${file.name}: ${dbError.message}`, 'error');
      }

      uploaded++;
      setUploadProgress(Math.round((uploaded / fileArray.length) * 100));
    }

    showToast(`Carregadas ${uploaded} de ${fileArray.length} fotos`, 'success');
    setUploading(false);
    setUploadProgress(0);
    fetchPhotos();
  }

  // Drag & drop handlers
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }, [photos.length]);

  // Toggle hero
  async function toggleHero(photo: Photo) {
    // If making this photo hero, un-hero all others first
    if (!photo.is_hero) {
      await supabase.from('photos').update({ is_hero: false }).eq('is_hero', true);
    }
    const { error } = await supabase
      .from('photos')
      .update({ is_hero: !photo.is_hero })
      .eq('id', photo.id);

    if (error) {
      showToast('Erro ao atualizar', 'error');
      return;
    }
    fetchPhotos();
    showToast(photo.is_hero ? 'Principal removida' : 'Definida como foto principal', 'success');
  }

  // Toggle visibility
  async function toggleVisibility(id: string, visible: boolean) {
    const { error } = await supabase
      .from('photos')
      .update({ is_visible: !visible })
      .eq('id', id);

    if (error) {
      showToast('Erro ao atualizar', 'error');
      return;
    }
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, is_visible: !visible } : p)));
    showToast(visible ? 'Foto oculta' : 'Foto visível', 'success');
  }

  // Update category
  async function updateCategory(id: string, category: string) {
    const { error } = await supabase.from('photos').update({ category }).eq('id', id);
    if (error) {
      showToast('Erro ao atualizar categoria', 'error');
      return;
    }
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, category } : p)));
  }

  // Update sort order
  async function updateSortOrder(id: string, sort_order: number) {
    const { error } = await supabase.from('photos').update({ sort_order }).eq('id', id);
    if (error) {
      showToast('Erro ao atualizar ordem', 'error');
      return;
    }
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, sort_order } : p)).sort((a, b) => a.sort_order - b.sort_order)
    );
  }

  // Save alt text
  async function saveAltText(id: string) {
    const { error } = await supabase.from('photos').update({ alt_text: altText }).eq('id', id);
    if (error) {
      showToast('Erro ao atualizar texto alternativo', 'error');
      return;
    }
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, alt_text: altText } : p)));
    setEditingAlt(null);
    showToast('Texto alternativo atualizado', 'success');
  }

  // Replace the file behind an existing photo without losing its
  // category, sort_order, hero/visibility state, or DB id. Useful when
  // re-shooting the same room and you don't want to redo the metadata.
  async function handleReplace(photo: Photo, file: File) {
    setUploading(true);
    setUploadProgress(50);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
      const newPath = `${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from('property-photos')
        .upload(newPath, file, { contentType: file.type });
      if (upErr) {
        showToast(`Erro ao carregar: ${upErr.message}`, 'error');
        return;
      }
      // Always switch the row to source='storage'. Local-source photos
      // (the seed list under /public) stay on disk — only the DB row is
      // repointed at the new uploaded asset, so the live site picks it up.
      const { error: dbErr } = await supabase
        .from('photos')
        .update({ storage_path: newPath, filename: file.name, source: 'storage' })
        .eq('id', photo.id);
      if (dbErr) {
        await supabase.storage.from('property-photos').remove([newPath]);
        showToast(`Erro BD: ${dbErr.message}`, 'error');
        return;
      }
      // Only the previous *storage* object is safe to clean up — local
      // assets live in the repo and might still be referenced elsewhere.
      if (photo.source === 'storage' && photo.storage_path) {
        await supabase.storage.from('property-photos').remove([photo.storage_path]);
      }
      showToast('Foto trocada', 'success');
      fetchPhotos();
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  // Delete photo
  async function handleDelete(photo: Photo) {
    if (!confirm(`Eliminar "${photo.filename}"?`)) return;

    // Delete from storage if it's a storage photo
    if (photo.source === 'storage') {
      await supabase.storage.from('property-photos').remove([photo.storage_path]);
    }

    const { error } = await supabase.from('photos').delete().eq('id', photo.id);
    if (error) {
      showToast('Erro ao eliminar', 'error');
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(photo.id);
      return next;
    });
    showToast('Foto eliminada', 'success');
    fetchPhotos();
  }

  // Bulk delete
  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Eliminar ${selected.size} fotos selecionadas?`)) return;

    const toDelete = photos.filter((p) => selected.has(p.id));
    const storageToDelete = toDelete.filter((p) => p.source === 'storage').map((p) => p.storage_path);

    if (storageToDelete.length > 0) {
      await supabase.storage.from('property-photos').remove(storageToDelete);
    }

    for (const id of selected) {
      await supabase.from('photos').delete().eq('id', id);
    }

    setSelected(new Set());
    showToast(`Eliminadas ${toDelete.length} fotos`, 'success');
    fetchPhotos();
  }

  // Bulk change category
  async function bulkChangeCategory() {
    if (selected.size === 0 || !bulkCategory) return;
    for (const id of selected) {
      await supabase.from('photos').update({ category: bulkCategory }).eq('id', id);
    }
    showToast(`Atualizadas ${selected.size} fotos para ${bulkCategory}`, 'success');
    setBulkCategory('');
    setSelected(new Set());
    fetchPhotos();
  }

  // Select/deselect
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === photos.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(photos.map((p) => p.id)));
    }
  }

  // Import local photos
  async function importLocal() {
    setImporting(true);
    let imported = 0;

    // Check which local photos already exist in DB
    const { data: existing } = await supabase
      .from('photos')
      .select('filename')
      .eq('source', 'local');
    const existingNames = new Set((existing || []).map((e: { filename: string }) => e.filename));

    for (let i = 0; i < LOCAL_PHOTOS.length; i++) {
      const lp = LOCAL_PHOTOS[i];
      if (existingNames.has(lp.filename)) continue;

      const { error } = await supabase.from('photos').insert({
        filename: lp.filename,
        storage_path: lp.filename,
        alt_text: lp.alt,
        category: lp.category,
        sort_order: i,
        source: 'local',
        is_visible: true,
        is_hero: lp.category === 'hero',
      });

      if (!error) imported++;
    }

    showToast(
      imported > 0 ? `Importadas ${imported} fotos locais` : 'Todas as fotos locais já importadas',
      'success'
    );
    setImporting(false);
    fetchPhotos();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Fotos</h1>
          <p className="text-gray-400 text-sm mt-1">{photos.length} fotos</p>
        </div>
        <div className="flex gap-3">
          {photos.length === 0 && (
            <button
              onClick={importLocal}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm disabled:opacity-50"
            >
              {importing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Importar fotos existentes
            </button>
          )}
          {photos.length > 0 && (
            <button
              onClick={importLocal}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 text-gray-300 rounded-xl hover:bg-white/10 transition-colors text-sm disabled:opacity-50"
            >
              {importing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Importar locais
            </button>
          )}
        </div>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-blue-400 bg-blue-400/10'
            : 'border-white/10 hover:border-white/30 bg-white/[0.02]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
        />
        {uploading ? (
          <div className="space-y-3">
            <Loader2 size={32} className="animate-spin text-blue-400 mx-auto" />
            <p className="text-gray-400">A carregar... {uploadProgress}%</p>
            <div className="w-48 mx-auto bg-white/10 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload size={32} className="text-gray-500 mx-auto" />
            <p className="text-gray-400">
              Arraste e solte fotos aqui, ou <span className="text-blue-400">clique para procurar</span>
            </p>
            <p className="text-gray-600 text-xs">Suporta JPG, PNG, WebP</p>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-4 bg-blue-600/10 border border-blue-500/20 rounded-xl px-4 py-3">
          <span className="text-blue-400 text-sm font-medium">{selected.size} selecionadas</span>

          <select
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
          >
            <option value="">Alterar categoria...</option>
            {PHOTO_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {PHOTO_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>

          {bulkCategory && (
            <button
              onClick={bulkChangeCategory}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              Aplicar
            </button>
          )}

          <button
            onClick={bulkDelete}
            className="px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg text-sm hover:bg-red-600/30 ml-auto"
          >
            <Trash2 size={14} className="inline mr-1" />
            Eliminar selecionadas
          </button>
        </div>
      )}

      {/* Photo Grid */}
      {photos.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">Ainda sem fotos</p>
          <p className="text-sm mt-1">Carregue fotos ou importe as locais existentes</p>
        </div>
      ) : (
        <>
          {/* Select all toggle */}
          <div className="flex items-center gap-2">
            <button onClick={selectAll} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white">
              {selected.size === photos.length ? <CheckSquare size={16} /> : <Square size={16} />}
              {selected.size === photos.length ? 'Desselecionar tudo' : 'Selecionar tudo'}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                isSelected={selected.has(photo.id)}
                isEditingAlt={editingAlt === photo.id}
                altText={editingAlt === photo.id ? altText : photo.alt_text}
                onToggleSelect={() => toggleSelect(photo.id)}
                onToggleHero={() => toggleHero(photo)}
                onToggleVisibility={() => toggleVisibility(photo.id, photo.is_visible)}
                onUpdateCategory={(cat) => updateCategory(photo.id, cat)}
                onUpdateSortOrder={(order) => updateSortOrder(photo.id, order)}
                onStartEditAlt={() => {
                  setEditingAlt(photo.id);
                  setAltText(photo.alt_text);
                }}
                onSaveAlt={() => saveAltText(photo.id)}
                onCancelAlt={() => setEditingAlt(null)}
                onAltChange={setAltText}
                onDelete={() => handleDelete(photo)}
                onReplace={(file) => handleReplace(photo, file)}
              />
            ))}
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-lg text-sm font-medium z-50 ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

// Photo card component
function PhotoCard({
  photo,
  isSelected,
  isEditingAlt,
  altText,
  onToggleSelect,
  onToggleHero,
  onToggleVisibility,
  onUpdateCategory,
  onUpdateSortOrder,
  onStartEditAlt,
  onSaveAlt,
  onCancelAlt,
  onAltChange,
  onDelete,
  onReplace,
}: {
  photo: Photo;
  isSelected: boolean;
  isEditingAlt: boolean;
  altText: string;
  onToggleSelect: () => void;
  onToggleHero: () => void;
  onToggleVisibility: () => void;
  onUpdateCategory: (cat: string) => void;
  onUpdateSortOrder: (order: number) => void;
  onStartEditAlt: () => void;
  onSaveAlt: () => void;
  onCancelAlt: () => void;
  onAltChange: (val: string) => void;
  onDelete: () => void;
  onReplace: (file: File) => void;
}) {
  const url = getPhotoUrl(photo);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={`bg-[#16213e] rounded-xl overflow-hidden border transition-all ${
        isSelected ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-white/5 hover:border-white/10'
      } ${!photo.is_visible ? 'opacity-60' : ''}`}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-black/20 group">
        <img
          src={url}
          alt={photo.alt_text}
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* Overlay actions on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <button
            onClick={onToggleHero}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              photo.is_hero ? 'bg-yellow-500 text-black' : 'bg-white/20 text-white hover:bg-white/30'
            }`}
            title={photo.is_hero ? 'Remover principal' : 'Definir como principal'}
          >
            {photo.is_hero ? <Star size={16} /> : <StarOff size={16} />}
          </button>
          <button
            onClick={onToggleVisibility}
            className="w-9 h-9 rounded-lg bg-white/20 text-white hover:bg-white/30 flex items-center justify-center"
            title={photo.is_visible ? 'Ocultar' : 'Mostrar'}
          >
            {photo.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <button
            onClick={() => replaceInputRef.current?.click()}
            className="w-9 h-9 rounded-lg bg-white/20 text-white hover:bg-white/30 flex items-center justify-center"
            title="Trocar foto (mantém categoria e ordem)"
          >
            <RefreshCw size={16} />
          </button>
          <input
            ref={replaceInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onReplace(f);
              if (replaceInputRef.current) replaceInputRef.current.value = '';
            }}
          />
          <button
            onClick={onDelete}
            className="w-9 h-9 rounded-lg bg-red-500/80 text-white hover:bg-red-600 flex items-center justify-center"
            title="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Select checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className="absolute top-2 left-2 w-6 h-6 rounded bg-black/50 flex items-center justify-center hover:bg-black/70"
        >
          {isSelected ? (
            <Check size={14} className="text-blue-400" />
          ) : (
            <div className="w-3.5 h-3.5 border border-white/40 rounded-sm" />
          )}
        </button>

        {/* Badges */}
        <div className="absolute top-2 right-2 flex gap-1">
          {photo.is_hero && (
            <span className="px-2 py-0.5 bg-yellow-500 text-black text-[10px] font-bold rounded-full uppercase">
              Hero
            </span>
          )}
          {photo.source === 'local' && (
            <span className="px-2 py-0.5 bg-white/20 text-white text-[10px] font-medium rounded-full">
              Local
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400 truncate flex-1" title={photo.filename}>
            {photo.filename}
          </p>
        </div>

        {/* Alt text */}
        {isEditingAlt ? (
          <div className="flex gap-1">
            <input
              type="text"
              value={altText}
              onChange={(e) => onAltChange(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveAlt();
                if (e.key === 'Escape') onCancelAlt();
              }}
            />
            <button onClick={onSaveAlt} className="text-emerald-400 hover:text-emerald-300">
              <Check size={14} />
            </button>
            <button onClick={onCancelAlt} className="text-gray-400 hover:text-white">
              <X size={14} />
            </button>
          </div>
        ) : (
          <p
            onClick={onStartEditAlt}
            className="text-xs text-gray-500 truncate cursor-pointer hover:text-gray-300"
            title="Clique para editar texto alternativo"
          >
            {photo.alt_text || 'Clique para adicionar texto alternativo'}
          </p>
        )}

        {/* Category & Sort */}
        <div className="flex gap-2">
          <select
            value={photo.category}
            onChange={(e) => onUpdateCategory(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
          >
            {PHOTO_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {PHOTO_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={photo.sort_order}
            onChange={(e) => onUpdateSortOrder(parseInt(e.target.value) || 0)}
            className="w-14 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white text-center"
            title="Ordem"
          />
        </div>
      </div>
    </div>
  );
}
