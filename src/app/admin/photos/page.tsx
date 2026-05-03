'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Photo, PhotoCategory } from '@/lib/supabase';
import { PHOTO_CATEGORIES, PHOTO_CATEGORY_LABELS, getPhotoUrl } from '@/lib/supabase';
import {
  Upload, Trash2, Eye, EyeOff, Star, StarOff, Check, X,
  ImageIcon, Download, ChevronDown, Loader2, AlertCircle,
  CheckSquare, Square, RefreshCw, Sparkles, MapPin,
} from 'lucide-react';

// Priority order for "Auto-organize". Categories higher up appear first
// in galleries / home preview. Within each category, current order is
// preserved (so the user can fine-tune by dragging inside the section).
const CATEGORY_ORDER: PhotoCategory[] = [
  'hero', 'view', 'living', 'dining', 'kitchen', 'bedroom',
  'bathroom', 'outdoor', 'area', 'general',
];

// SEO-friendly per-category labels used in alt text + filename slugs.
const SEO_LABELS: Record<PhotoCategory, string> = {
  hero: 'Vista Aerea',
  view: 'Vista Ria Formosa',
  living: 'Sala de Estar',
  dining: 'Sala de Jantar',
  kitchen: 'Cozinha Equipada',
  bedroom: 'Quarto',
  bathroom: 'Casa de Banho',
  outdoor: 'Terraco Exterior',
  area: 'Cabanas de Tavira',
  general: 'Detalhe',
};

const BASE_SUFFIX = 'Villa Solria - Cabanas de Tavira - Algarve';

function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

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
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Drag-and-drop reorder. Drops the dragged photo before the target,
   * then renumbers sort_order from 0..N and persists every changed row
   * in parallel. Optimistic UI: update local state immediately.
   */
  async function reorderPhotos(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    const fromIdx = photos.findIndex((p) => p.id === draggedId);
    const toIdx = photos.findIndex((p) => p.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    // Only allow drag within the same category — cross-category moves
    // are done by changing the category dropdown, not by dragging.
    if (photos[fromIdx].category !== photos[toIdx].category) return;
    const next = [...photos];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    const renumbered = next.map((p, i) => ({ ...p, sort_order: i }));
    setPhotos(renumbered);
    const before = new Map(photos.map((p) => [p.id, p.sort_order]));
    const dirty = renumbered.filter((p) => before.get(p.id) !== p.sort_order);
    await Promise.all(
      dirty.map((p) =>
        supabase.from('photos').update({ sort_order: p.sort_order }).eq('id', p.id),
      ),
    );
  }

  /**
   * Rebuild SEO-friendly alt_text + filename for every photo based on
   * its category. Format: "Villa Solria - {Category} {N} - Cabanas de
   * Tavira - Algarve". Helps Google Images and screen readers, and
   * replaces ugly UUID-looking labels in the public gallery.
   */
  async function renameForSEO() {
    if (!confirm('Reescrever alt-text e nomes para SEO em todas as fotos? (Villa Solria - Categoria - Cabanas de Tavira)')) return;
    // Number per category so we get "Quarto 1, Quarto 2, …"
    const perCat = new Map<string, number>();
    const updates = photos.map((p) => {
      const n = (perCat.get(p.category) || 0) + 1;
      perCat.set(p.category, n);
      const cat = SEO_LABELS[p.category as PhotoCategory] || p.category;
      const room = p.category === 'bedroom' && p.room_label
        ? ` ${p.room_label}`
        : '';
      const idx = perCat.get(p.category)! > 1 ? ` ${n}` : '';
      const altText = `${cat}${room}${idx} - ${BASE_SUFFIX}`;
      const ext = p.filename.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `${slugify(altText)}.${ext}`;
      return { id: p.id, alt_text: altText, filename };
    });
    setPhotos((prev) =>
      prev.map((p) => {
        const u = updates.find((x) => x.id === p.id);
        return u ? { ...p, alt_text: u.alt_text, filename: u.filename } : p;
      }),
    );
    await Promise.all(
      updates.map((u) =>
        supabase
          .from('photos')
          .update({ alt_text: u.alt_text, filename: u.filename })
          .eq('id', u.id),
      ),
    );
    showToast(`Renomeadas ${updates.length} fotos para SEO`, 'success');
  }

  /**
   * Auto-organize: rebuild sort_order globally so photos come out in
   * CATEGORY_ORDER. Within each category, preserves current relative
   * order (so the user's fine-tune drags survive). Hero photo always
   * stays at sort_order 0.
   */
  async function autoOrganize() {
    if (!confirm('Reorganizar todas as fotos por categoria (hero → vistas → sala → … )? A ordem dentro de cada categoria é mantida.')) return;
    const priority = (cat: string) => {
      const i = CATEGORY_ORDER.indexOf(cat as PhotoCategory);
      return i === -1 ? 999 : i;
    };
    const sorted = [...photos].sort((a, b) => {
      // Hero always first
      if (a.is_hero && !b.is_hero) return -1;
      if (b.is_hero && !a.is_hero) return 1;
      const pa = priority(a.category);
      const pb = priority(b.category);
      if (pa !== pb) return pa - pb;
      // Within bedrooms, group by room_label so each room's photos
      // (incl. its varanda etc.) stay contiguous.
      if (a.category === 'bedroom' && b.category === 'bedroom') {
        const ra = a.room_label || 'zzz';
        const rb = b.room_label || 'zzz';
        if (ra !== rb) return ra.localeCompare(rb);
      }
      return a.sort_order - b.sort_order;
    });
    const renumbered = sorted.map((p, i) => ({ ...p, sort_order: i }));
    const before = new Map(photos.map((p) => [p.id, p.sort_order]));
    const dirty = renumbered.filter((p) => before.get(p.id) !== p.sort_order);
    setPhotos(renumbered);
    await Promise.all(
      dirty.map((p) =>
        supabase.from('photos').update({ sort_order: p.sort_order }).eq('id', p.id),
      ),
    );
    showToast(`Reorganizadas ${dirty.length} fotos`, 'success');
  }

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
      // SEO-friendly defaults: ignore the raw camera filename (often a
      // UUID or "IMG_1234"). Use a Villa Solria branded alt_text and a
      // slugged filename. User can re-run "Renomear SEO" later after
      // setting the right category.
      const baseAlt = `${SEO_LABELS.general} - ${BASE_SUFFIX}`;
      const seoFilename = `${slugify(baseAlt)}-${Date.now()}.${ext}`;
      const { error: dbError } = await supabase.from('photos').insert({
        filename: seoFilename,
        storage_path: storagePath,
        alt_text: baseAlt,
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

  // Toggle "use as cover of /localizacao". Only one photo can be flagged.
  async function toggleLocationHero(photo: Photo) {
    if (!photo.is_location_hero) {
      await supabase.from('photos').update({ is_location_hero: false }).eq('is_location_hero', true);
    }
    const { error } = await supabase
      .from('photos')
      .update({ is_location_hero: !photo.is_location_hero })
      .eq('id', photo.id);
    if (error) {
      showToast('Erro ao atualizar', 'error');
      return;
    }
    fetchPhotos();
    showToast(photo.is_location_hero ? 'Capa de Localização removida' : 'Definida como capa da Localização', 'success');
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

  // Update room label (only meaningful for bedroom category)
  async function updateRoomLabel(id: string, room_label: string | null) {
    const { error } = await supabase
      .from('photos')
      .update({ room_label })
      .eq('id', id);
    if (error) {
      showToast('Erro ao atualizar quarto', 'error');
      return;
    }
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, room_label } : p)));
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
            <>
              <button
                onClick={autoOrganize}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 text-purple-300 border border-purple-500/30 rounded-xl hover:bg-purple-600/30 transition-colors text-sm"
                title="Reordenar tudo por categoria (hero → vistas → sala → quartos → …)"
              >
                <Sparkles size={16} />
                Auto-organizar
              </button>
              <button
                onClick={renameForSEO}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded-xl hover:bg-emerald-600/30 transition-colors text-sm"
                title="Reescrever alt-text e nomes para SEO (Villa Solria - Categoria - Cabanas de Tavira)"
              >
                <Sparkles size={16} />
                Renomear SEO
              </button>
              <button
                onClick={importLocal}
                disabled={importing}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 text-gray-300 rounded-xl hover:bg-white/10 transition-colors text-sm disabled:opacity-50"
              >
                {importing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Importar locais
              </button>
            </>
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

          <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl px-4 py-3 text-xs text-purple-200/80 leading-relaxed">
            <strong className="text-purple-300">Como organizar rápido:</strong>{' '}
            1) Marca a categoria certa em cada foto (dropdown). 2) Carrega em{' '}
            <span className="text-purple-300 font-medium">Auto-organizar</span> — agrupa por
            categoria pela ordem de importância. 3) Arrasta dentro de cada secção para
            ajustar a ordem fina. Drag entre categorias diferentes não funciona — muda a
            categoria pelo dropdown.
          </div>

          {(() => {
            // Render one section per category that has photos, in CATEGORY_ORDER.
            const groups = new Map<string, Photo[]>();
            for (const p of photos) {
              const arr = groups.get(p.category) || [];
              arr.push(p);
              groups.set(p.category, arr);
            }
            const orderedCats = [
              ...CATEGORY_ORDER.filter((c) => groups.has(c)),
              ...Array.from(groups.keys()).filter(
                (c) => !CATEGORY_ORDER.includes(c as PhotoCategory),
              ),
            ];
            return orderedCats.map((cat) => {
              const group = (groups.get(cat) || []).sort((a, b) => {
                // For bedrooms, group by room_label first so "Quarto 1" + its
                // varanda end up adjacent regardless of sort_order.
                if (cat === 'bedroom') {
                  const ra = a.room_label || 'zzz';
                  const rb = b.room_label || 'zzz';
                  if (ra !== rb) return ra.localeCompare(rb);
                }
                return a.sort_order - b.sort_order;
              });
              const label = PHOTO_CATEGORY_LABELS[cat as PhotoCategory] || cat;
              return (
                <section key={cat} className="space-y-3">
                  <div className="flex items-center gap-3 sticky top-0 z-10 bg-[#0f1729]/80 backdrop-blur py-2">
                    <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                      {label}
                    </h2>
                    <span className="text-xs text-gray-500">{group.length} fotos</span>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {group.map((photo) => (
                      <div
                        key={photo.id}
                        draggable
                        onDragStart={(e) => {
                          setDraggingId(photo.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDropTargetId(null);
                        }}
                        onDragOver={(e) => {
                          if (!draggingId || draggingId === photo.id) return;
                          // Visual hint only when same category
                          const dragged = photos.find((p) => p.id === draggingId);
                          if (!dragged || dragged.category !== photo.category) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (dropTargetId !== photo.id) setDropTargetId(photo.id);
                        }}
                        onDragLeave={(e) => {
                          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                          if (dropTargetId === photo.id) setDropTargetId(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggingId && draggingId !== photo.id) {
                            reorderPhotos(draggingId, photo.id);
                          }
                          setDraggingId(null);
                          setDropTargetId(null);
                        }}
                        className={`transition-all ${draggingId === photo.id ? 'opacity-40 scale-95' : ''} ${dropTargetId === photo.id ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-gray-900 rounded-2xl' : ''}`}
                      >
                        <PhotoCard
                          photo={photo}
                          isSelected={selected.has(photo.id)}
                          isEditingAlt={editingAlt === photo.id}
                          altText={editingAlt === photo.id ? altText : photo.alt_text}
                          onToggleSelect={() => toggleSelect(photo.id)}
                          onToggleHero={() => toggleHero(photo)}
                          onToggleLocationHero={() => toggleLocationHero(photo)}
                          onToggleVisibility={() => toggleVisibility(photo.id, photo.is_visible)}
                          onUpdateCategory={(c) => updateCategory(photo.id, c)}
                          onUpdateRoomLabel={(rl) => updateRoomLabel(photo.id, rl)}
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
                          onPreview={() => setPreviewPhoto(photo)}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              );
            });
          })()}
        </>
      )}

      {/* Lightbox preview */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-6"
          onClick={() => setPreviewPhoto(null)}
        >
          <button
            onClick={() => setPreviewPhoto(null)}
            className="absolute top-6 right-6 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
          >
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getPhotoUrl(previewPhoto)}
            alt={previewPhoto.alt_text}
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="absolute bottom-6 text-white/70 text-sm">
            {previewPhoto.filename} · {PHOTO_CATEGORY_LABELS[previewPhoto.category as PhotoCategory] || previewPhoto.category}
          </p>
        </div>
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
  onToggleLocationHero,
  onToggleVisibility,
  onUpdateCategory,
  onUpdateRoomLabel,
  onUpdateSortOrder,
  onStartEditAlt,
  onSaveAlt,
  onCancelAlt,
  onAltChange,
  onDelete,
  onReplace,
  onPreview,
}: {
  photo: Photo;
  isSelected: boolean;
  isEditingAlt: boolean;
  altText: string;
  onToggleSelect: () => void;
  onToggleHero: () => void;
  onToggleLocationHero: () => void;
  onToggleVisibility: () => void;
  onUpdateCategory: (cat: string) => void;
  onUpdateRoomLabel: (label: string | null) => void;
  onUpdateSortOrder: (order: number) => void;
  onStartEditAlt: () => void;
  onSaveAlt: () => void;
  onCancelAlt: () => void;
  onAltChange: (val: string) => void;
  onDelete: () => void;
  onReplace: (file: File) => void;
  onPreview: () => void;
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
          className="w-full h-full object-cover cursor-zoom-in"
          loading="lazy"
          onDoubleClick={onPreview}
          title="Duplo-clique para ampliar"
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
            onClick={onToggleLocationHero}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              photo.is_location_hero ? 'bg-sky-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
            }`}
            title={photo.is_location_hero ? 'Remover capa Localização' : 'Definir como capa da página Localização'}
          >
            <MapPin size={16} />
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
          {photo.is_location_hero && (
            <span className="px-2 py-0.5 bg-sky-500 text-white text-[10px] font-bold rounded-full uppercase">
              Localização
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

        {/* Room sub-tag (only for bedroom category) */}
        {photo.category === 'bedroom' && (
          <select
            value={photo.room_label || ''}
            onChange={(e) => onUpdateRoomLabel(e.target.value || null)}
            className="w-full bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-1 text-xs text-amber-200"
            title="A que quarto pertence esta foto?"
          >
            <option value="">— sem quarto —</option>
            <option value="Quarto 1">Quarto 1 (principal)</option>
            <option value="Quarto 2">Quarto 2</option>
            <option value="Quarto 3">Quarto 3</option>
          </select>
        )}
      </div>
    </div>
  );
}
