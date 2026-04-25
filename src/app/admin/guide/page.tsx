'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, Plus, Trash2, Copy, Upload, Loader2, X } from 'lucide-react';

const STORAGE_BUCKET = 'property-photos';

async function uploadGuideFile(file: File, kind: 'image' | 'video'): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || (kind === 'video' ? 'mp4' : 'jpg');
  const safeName = file.name
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9-]/g, '_')
    .toLowerCase()
    .slice(0, 40);
  const path = `guide/${kind}-${Date.now()}-${safeName}.${ext}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function FileUploadField({
  value,
  onChange,
  accept,
  kind,
  label,
  placeholder,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  accept: string;
  kind: 'image' | 'video';
  label: string;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    setErr(null);
    try {
      const url = await uploadGuideFile(f, kind);
      onChange(url);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'upload failed');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-xs text-gray-400">{label}</label>
      <div className="flex gap-2 items-center">
        <input
          type="url"
          value={value || ''}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder={placeholder || 'URL ou fica vazio e carrega um ficheiro →'}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-medium disabled:opacity-50"
          title="Carregar do computador"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {busy ? 'A carregar…' : 'Carregar'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10"
            title="Remover"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onPick} />
      {err && <p className="text-[11px] text-red-400">{err}</p>}
      {value && (() => {
        const ytMatch = value.match(
          /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,15})/
        );
        const vimeoMatch = value.match(/vimeo\.com\/(\d+)/);
        if (ytMatch) {
          return (
            <iframe
              src={`https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`}
              title="preview"
              className="mt-2 w-56 aspect-video rounded-lg border border-white/10"
              allowFullScreen
            />
          );
        }
        if (vimeoMatch) {
          return (
            <iframe
              src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
              title="preview"
              className="mt-2 w-56 aspect-video rounded-lg border border-white/10"
              allowFullScreen
            />
          );
        }
        if (kind === 'image') {
          // eslint-disable-next-line @next/next/no-img-element
          return <img src={value} alt="preview" className="mt-2 h-24 w-auto rounded-lg border border-white/10 object-cover" />;
        }
        return <video src={value} controls className="mt-2 max-h-32 rounded-lg border border-white/10" />;
      })()}
    </div>
  );
}

type Locale = 'pt' | 'en' | 'es' | 'de';
const LOCALES: Locale[] = ['pt', 'en', 'es', 'de'];
const LOCALE_LABEL: Record<Locale, string> = { pt: 'Português', en: 'English', es: 'Español', de: 'Deutsch' };

interface Section {
  id: string;
  slug: string;
  sort_order: number;
  icon: string | null;
  title: Record<string, string>;
  body: Record<string, string>;
  media_url: string | null;
}

interface Place {
  id: string;
  type: string;
  sort_order: number;
  name: string;
  description: Record<string, string>;
  photo_url: string | null;
  map_url: string | null;
  distance_km: number | null;
}

const PLACE_TYPES = [
  { value: 'beach', label: '🏖️ Praia' },
  { value: 'restaurant', label: '🍽️ Restaurante' },
  { value: 'shop', label: '🛒 Loja / Supermercado' },
  { value: 'activity', label: '🚤 Atividade' },
  { value: 'transport', label: '🚌 Transporte' },
];

const SENSITIVE_KEYS = [
  { key: 'guide_door_code', label: 'Código da fechadura', type: 'text' },
  { key: 'guide_wifi_ssid', label: 'Nome da rede WiFi (SSID)', type: 'text' },
  { key: 'guide_wifi_password', label: 'Password do WiFi', type: 'text' },
  { key: 'guide_lock_video_url', label: 'URL do vídeo da fechadura (MP4)', type: 'url' },
];

export default function AdminGuidePage() {
  const [tab, setTab] = useState<'sections' | 'places' | 'settings'>('sections');
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl text-sm font-medium shadow-lg ${toast.type === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-white">Guia do hóspede</h1>
        <p className="text-xs text-gray-500 mt-1">
          Conteúdo do guia digital enviado aos hóspedes — editável em PT / EN / ES / DE. Código e WiFi só aparecem no guia quando a estadia está activa.
        </p>
      </div>

      <div className="flex items-center gap-1 border-b border-white/5">
        {(['sections', 'places', 'settings'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'text-blue-400 border-blue-400' : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            {t === 'sections' ? 'Secções' : t === 'places' ? 'Sugestões locais' : 'Definições sensíveis'}
          </button>
        ))}
      </div>

      {tab === 'sections' && <SectionsTab showToast={showToast} />}
      {tab === 'places' && <PlacesTab showToast={showToast} />}
      {tab === 'settings' && <SettingsTab showToast={showToast} />}
    </div>
  );
}

function SectionsTab({ showToast }: { showToast: (msg: string, type: 'ok' | 'err') => void }) {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [locale, setLocale] = useState<Locale>('pt');

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('guide_sections').select('*').order('sort_order', { ascending: true });
    setSections((data || []) as Section[]);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  function update<K extends keyof Section>(id: string, key: K, value: Section[K]) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, [key]: value } : s)));
  }
  function updateJson(id: string, key: 'title' | 'body', lang: Locale, value: string) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, [key]: { ...s[key], [lang]: value } } : s)));
  }

  async function save(s: Section) {
    setSavingId(s.id);
    const { error } = await supabase
      .from('guide_sections')
      .update({
        icon: s.icon,
        sort_order: s.sort_order,
        title: s.title,
        body: s.body,
        media_url: s.media_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', s.id);
    setSavingId(null);
    if (error) showToast('Erro: ' + error.message, 'err');
    else showToast('Secção guardada', 'ok');
  }

  if (loading) return <div className="text-gray-400">A carregar…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 bg-[#16213e] border border-white/5 rounded-xl p-2 w-fit">
        <span className="text-xs text-gray-400 px-2">Idioma em edição:</span>
        {LOCALES.map((l) => (
          <button
            key={l}
            onClick={() => setLocale(l)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase ${locale === l ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-white/5'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {sections.map((s) => (
        <div key={s.id} className="bg-[#16213e] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <input
              type="text"
              value={s.icon || ''}
              onChange={(e) => update(s.id, 'icon', e.target.value || null)}
              className="w-14 text-2xl text-center bg-white/5 border border-white/10 rounded-lg px-2 py-1.5"
              maxLength={4}
            />
            <div className="text-[11px] uppercase tracking-widest text-gray-500 font-mono">{s.slug}</div>
            <div className="flex-1" />
            <label className="text-xs text-gray-500 flex items-center gap-1.5">
              Ordem
              <input
                type="number"
                value={s.sort_order}
                onChange={(e) => update(s.id, 'sort_order', Number(e.target.value) || 0)}
                className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm text-white"
              />
            </label>
          </div>

          <div className="space-y-2">
            <label className="block text-xs text-gray-400">Título ({LOCALE_LABEL[locale]})</label>
            <input
              type="text"
              value={s.title[locale] || ''}
              onChange={(e) => updateJson(s.id, 'title', locale, e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>

          <div className="space-y-2 mt-3">
            <label className="block text-xs text-gray-400">
              Conteúdo ({LOCALE_LABEL[locale]}) — markdown: **negrito**, *itálico*, `código`, listas com - ou 1. Placeholders: <code className="text-blue-300">{'{{door_code}}'}</code>, <code className="text-blue-300">{'{{wifi_ssid}}'}</code>, <code className="text-blue-300">{'{{wifi_password}}'}</code>
            </label>
            <textarea
              value={s.body[locale] || ''}
              onChange={(e) => updateJson(s.id, 'body', locale, e.target.value)}
              rows={8}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono leading-relaxed"
            />
          </div>

          <div className="mt-3">
            <FileUploadField
              label="Imagem ou vídeo (opcional — aceita URL do YouTube/Vimeo)"
              value={s.media_url}
              onChange={(url) => update(s.id, 'media_url', url)}
              accept="image/*"
              kind="image"
            />
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={() => save(s)}
              disabled={savingId === s.id}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50"
            >
              <Save size={14} />
              {savingId === s.id ? 'A guardar…' : 'Guardar'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlacesTab({ showToast }: { showToast: (msg: string, type: 'ok' | 'err') => void }) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [locale, setLocale] = useState<Locale>('pt');

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('guide_places').select('*').order('sort_order', { ascending: true });
    setPlaces((data || []) as Place[]);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  function update<K extends keyof Place>(id: string, key: K, value: Place[K]) {
    setPlaces((prev) => prev.map((p) => (p.id === id ? { ...p, [key]: value } : p)));
  }
  function updateDesc(id: string, lang: Locale, value: string) {
    setPlaces((prev) => prev.map((p) => (p.id === id ? { ...p, description: { ...p.description, [lang]: value } } : p)));
  }

  async function save(p: Place) {
    setSavingId(p.id);
    const { error } = await supabase
      .from('guide_places')
      .update({
        type: p.type,
        sort_order: p.sort_order,
        name: p.name,
        description: p.description,
        photo_url: p.photo_url,
        map_url: p.map_url,
        distance_km: p.distance_km,
        updated_at: new Date().toISOString(),
      })
      .eq('id', p.id);
    setSavingId(null);
    if (error) showToast('Erro: ' + error.message, 'err');
    else showToast('Sugestão guardada', 'ok');
  }

  async function addPlace() {
    const { data, error } = await supabase
      .from('guide_places')
      .insert({
        type: 'restaurant',
        sort_order: (places[places.length - 1]?.sort_order || 0) + 10,
        name: 'Nova sugestão',
        description: { pt: '', en: '', es: '', de: '' },
      })
      .select()
      .single();
    if (error || !data) {
      showToast('Erro ao criar: ' + (error?.message || ''), 'err');
      return;
    }
    setPlaces((prev) => [...prev, data as Place]);
    showToast('Criada. Preenche e guarda.', 'ok');
  }

  async function removePlace(id: string) {
    if (!confirm('Apagar esta sugestão?')) return;
    const { error } = await supabase.from('guide_places').delete().eq('id', id);
    if (error) {
      showToast('Erro: ' + error.message, 'err');
      return;
    }
    setPlaces((prev) => prev.filter((p) => p.id !== id));
  }

  if (loading) return <div className="text-gray-400">A carregar…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-[#16213e] border border-white/5 rounded-xl p-2">
          <span className="text-xs text-gray-400 px-2">Idioma:</span>
          {LOCALES.map((l) => (
            <button key={l} onClick={() => setLocale(l)} className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase ${locale === l ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-white/5'}`}>
              {l}
            </button>
          ))}
        </div>
        <button onClick={addPlace} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">
          <Plus size={14} /> Nova sugestão
        </button>
      </div>

      {places.map((p) => (
        <div key={p.id} className="bg-[#16213e] border border-white/5 rounded-2xl p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Nome</label>
              <input type="text" value={p.name} onChange={(e) => update(p.id, 'name', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Tipo</label>
              <select value={p.type} onChange={(e) => update(p.id, 'type', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                {PLACE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Distância (km)</label>
              <input type="number" step="0.1" value={p.distance_km ?? ''} onChange={(e) => update(p.id, 'distance_km', e.target.value === '' ? null : Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Descrição ({LOCALE_LABEL[locale]})</label>
            <textarea rows={2} value={p.description[locale] || ''} onChange={(e) => updateDesc(p.id, locale, e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white leading-relaxed" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FileUploadField
              label="Foto do sítio"
              value={p.photo_url}
              onChange={(url) => update(p.id, 'photo_url', url)}
              accept="image/*"
              kind="image"
            />
            <div>
              <label className="block text-xs text-gray-400 mb-1">URL Google Maps</label>
              <input
                type="url"
                value={p.map_url || ''}
                onChange={(e) => update(p.id, 'map_url', e.target.value || null)}
                placeholder="https://maps.google.com/?q=…"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button onClick={() => removePlace(p.id)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium">
              <Trash2 size={12} /> Apagar
            </button>
            <button onClick={() => save(p)} disabled={savingId === p.id} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50">
              <Save size={14} /> {savingId === p.id ? 'A guardar…' : 'Guardar'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsTab({ showToast }: { showToast: (msg: string, type: 'ok' | 'err') => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('settings').select('key, value').in('key', SENSITIVE_KEYS.map((s) => s.key));
    const map: Record<string, string> = {};
    for (const row of (data || []) as { key: string; value: unknown }[]) {
      const v = row.value;
      map[row.key] = typeof v === 'string' ? v : String(v ?? '');
    }
    setValues(map);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function saveAll() {
    setSaving(true);
    for (const { key } of SENSITIVE_KEYS) {
      const val = values[key] ?? '';
      const { error } = await supabase.from('settings').upsert({ key, value: val }, { onConflict: 'key' });
      if (error) {
        showToast('Erro em ' + key + ': ' + error.message, 'err');
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    showToast('Definições guardadas', 'ok');
  }

  if (loading) return <div className="text-gray-400">A carregar…</div>;

  return (
    <div className="bg-[#16213e] border border-white/5 rounded-2xl p-5 space-y-4 max-w-xl">
      <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
        Estes valores só aparecem no guia quando a estadia está activa (3 dias antes do check-in a 3 dias depois do check-out).
      </p>
      {SENSITIVE_KEYS.map(({ key, label, type }) => {
        if (key === 'guide_lock_video_url') {
          return (
            <FileUploadField
              key={key}
              label={label}
              value={values[key] || null}
              onChange={(url) => setValues((prev) => ({ ...prev, [key]: url || '' }))}
              accept="video/*,.mp4,.mov,.m4v,.webm,.mkv"
              kind="video"
              placeholder="URL do vídeo ou carrega MP4 →"
            />
          );
        }
        return (
          <div key={key}>
            <label className="block text-xs text-gray-400 mb-1">{label}</label>
            <input
              type={type}
              value={values[key] || ''}
              onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
            />
          </div>
        );
      })}
      <div className="flex justify-end pt-2">
        <button onClick={saveAll} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50">
          <Save size={14} /> {saving ? 'A guardar…' : 'Guardar tudo'}
        </button>
      </div>
    </div>
  );
}

// Helper for copying guide URLs — exported for use in booking detail modal later.
export function buildGuideUrl(token: string, locale = 'pt'): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://villasolria.com';
  return `${base}/${locale}/guia/${token}`;
}
