'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Setting } from '@/lib/supabase';
import { Save, Plus, Trash2 } from 'lucide-react';

const DEFAULT_SETTINGS = [
  { key: 'whatsapp_number', label: 'N\u00famero WhatsApp', placeholder: '+351912345678' },
  { key: 'checkin_time', label: 'Hora de Check-in', placeholder: '16:00' },
  { key: 'checkout_time', label: 'Hora de Check-out', placeholder: '10:30' },
  { key: 'max_guests', label: 'M\u00e1x. H\u00f3spedes', placeholder: '6' },
  { key: 'booking_mode', label: 'Modo de Reserva (consulta/instant\u00e2neo)', placeholder: 'consulta' },
  { key: 'ical_airbnb', label: 'URL iCal - Airbnb', placeholder: 'https://...' },
  { key: 'ical_booking', label: 'URL iCal - Booking.com', placeholder: 'https://...' },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [customKeys, setCustomKeys] = useState<{ key: string; label: string; placeholder: string }[]>([]);
  const [newKey, setNewKey] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    const { data } = await supabase.from('settings').select('*');
    const map: Record<string, string> = {};
    const extraKeys: { key: string; label: string; placeholder: string }[] = [];

    (data || []).forEach((s: Setting) => {
      map[s.key] = s.value;
      if (!DEFAULT_SETTINGS.find((d) => d.key === s.key)) {
        extraKeys.push({ key: s.key, label: s.key, placeholder: '' });
      }
    });

    setSettings(map);
    setCustomKeys(extraKeys);
    setLoading(false);
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSave() {
    setSaving(true);

    const allKeys = [...DEFAULT_SETTINGS, ...customKeys];

    for (const { key } of allKeys) {
      const value = settings[key] || '';

      // Upsert: try update, if no rows affected then insert
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('key', key)
        .limit(1);

      if (existing && existing.length > 0) {
        await supabase.from('settings').update({ value }).eq('key', key);
      } else if (value) {
        await supabase.from('settings').insert({ key, value });
      }
    }

    setSaving(false);
    showToast('Defini\u00e7\u00f5es guardadas', 'success');
  }

  function addCustomKey() {
    if (!newKey.trim()) return;
    const k = newKey.trim().toLowerCase().replace(/\s+/g, '_');
    if (DEFAULT_SETTINGS.find((d) => d.key === k) || customKeys.find((c) => c.key === k)) {
      showToast('Chave j\u00e1 existe', 'error');
      return;
    }
    setCustomKeys([...customKeys, { key: k, label: k, placeholder: '' }]);
    setNewKey('');
  }

  async function removeCustomKey(key: string) {
    await supabase.from('settings').delete().eq('key', key);
    setCustomKeys(customKeys.filter((c) => c.key !== key));
    const updated = { ...settings };
    delete updated[key];
    setSettings(updated);
    showToast('Defini\u00e7\u00e3o removida', 'success');
  }

  if (loading) {
    return <div className="text-gray-400">A carregar defini\u00e7\u00f5es...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl text-sm font-medium shadow-lg ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Defini\u00e7\u00f5es</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          <Save size={16} />
          {saving ? 'A guardar...' : 'Guardar Tudo'}
        </button>
      </div>

      {/* Default Settings */}
      <div className="bg-[#16213e] rounded-2xl border border-white/5 p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Defini\u00e7\u00f5es da Propriedade</h2>

        {DEFAULT_SETTINGS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
            <input
              type="text"
              value={settings[key] || ''}
              onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
              placeholder={placeholder}
              className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none"
            />
          </div>
        ))}
      </div>

      {/* Custom Settings */}
      <div className="bg-[#16213e] rounded-2xl border border-white/5 p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Defini\u00e7\u00f5es Personalizadas</h2>

        {customKeys.map(({ key, label }) => (
          <div key={key} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
              <input
                type="text"
                value={settings[key] || ''}
                onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none"
              />
            </div>
            <button
              onClick={() => removeCustomKey(key)}
              className="p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        <div className="flex items-end gap-3 pt-2 border-t border-white/5">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Adicionar chave personalizada</label>
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomKey()}
              placeholder="e.g. property_manager_email"
              className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none"
            />
          </div>
          <button
            onClick={addCustomKey}
            className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
