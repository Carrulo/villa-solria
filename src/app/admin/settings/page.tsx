'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Setting } from '@/lib/supabase';
import { Save, RefreshCw } from 'lucide-react';

interface SettingField {
  key: string;
  label: string;
  placeholder: string;
  type?: 'text' | 'select';
  options?: { value: string; label: string }[];
}

interface SettingSection {
  title: string;
  fields: SettingField[];
}

const SECTIONS: SettingSection[] = [
  {
    title: 'Contacto',
    fields: [
      { key: 'contact_email', label: 'Email de Contacto', placeholder: 'email@exemplo.com' },
      { key: 'contact_phone', label: 'Telefone', placeholder: '+351 912 345 678' },
      { key: 'whatsapp_number', label: 'N\u00famero WhatsApp', placeholder: '351912345678' },
      { key: 'address_line1', label: 'Morada (Linha 1)', placeholder: 'Rua do Junco 3.5B' },
      { key: 'address_line2', label: 'Morada (Linha 2)', placeholder: '8800-591 Tavira, Portugal' },
    ],
  },
  {
    title: 'Propriedade',
    fields: [
      { key: 'property_name', label: 'Nome da Propriedade', placeholder: 'Villa Solria' },
      { key: 'al_license', label: 'Licen\u00e7a AL', placeholder: '120108/AL' },
      { key: 'max_guests', label: 'M\u00e1ximo de H\u00f3spedes', placeholder: '6' },
      { key: 'check_in_time', label: 'Hora de Check-in', placeholder: '16:00' },
      { key: 'check_out_time', label: 'Hora de Check-out', placeholder: '10:30' },
    ],
  },
  {
    title: 'Reservas',
    fields: [
      {
        key: 'booking_mode',
        label: 'Modo de Reserva',
        placeholder: '',
        type: 'select',
        options: [
          { value: 'inquiry', label: 'Consulta' },
          { value: 'instant', label: 'Instant\u00e2neo' },
        ],
      },
      { key: 'ical_airbnb', label: 'URL iCal Airbnb', placeholder: 'https://...' },
      { key: 'ical_booking', label: 'URL iCal Booking.com', placeholder: 'https://...' },
    ],
  },
  {
    title: 'Legal',
    fields: [
      { key: 'complaints_url', label: 'Link Livro de Reclama\u00e7\u00f5es', placeholder: 'https://www.livroreclamacoes.pt' },
      { key: 'privacy_url', label: 'Link Pol\u00edtica de Privacidade', placeholder: 'https://...' },
      { key: 'terms_url', label: 'Link Termos e Condi\u00e7\u00f5es', placeholder: 'https://...' },
    ],
  },
  {
    title: 'Marketing',
    fields: [
      { key: 'direct_booking_savings_percent', label: 'Poupan\u00e7a vs OTAs (%)', placeholder: '20' },
    ],
  },
  {
    title: 'Tracking',
    fields: [
      { key: 'ga4_measurement_id', label: 'Google Analytics 4 (Measurement ID)', placeholder: 'G-XXXXXXXXXX' },
      { key: 'meta_pixel_id', label: 'Meta Pixel ID', placeholder: '1234567890' },
    ],
  },
  {
    title: 'Email — Configura\u00e7\u00e3o',
    fields: [
      { key: 'resend_api_key', label: 'Resend API Key', placeholder: 're_...' },
      { key: 'email_from_address', label: 'Email remetente', placeholder: 'Villa Solria <reservas@villasolria.com>' },
      { key: 'email_subject_confirmed', label: 'Assunto email confirma\u00e7\u00e3o', placeholder: 'Reserva Confirmada - Villa Solria' },
      {
        key: 'email_abandonment_enabled',
        label: 'Email de recupera\u00e7\u00e3o de abandonos',
        placeholder: '',
        type: 'select',
        options: [
          { value: 'true', label: 'Ativado' },
          { value: 'false', label: 'Desativado' },
        ],
      },
    ],
  },
  {
    title: 'Email — Conte\u00fado do Template',
    fields: [
      { key: 'email_welcome_message', label: 'Mensagem de boas-vindas', placeholder: 'A sua reserva foi confirmada com sucesso! Aqui est\u00e3o os detalhes:' },
      { key: 'email_smartlock_note', label: 'Nota sobre fechadura/chave', placeholder: 'Receber\u00e1 o c\u00f3digo da fechadura inteligente por email antes da sua chegada.' },
      { key: 'email_cancellation_text', label: 'Texto pol\u00edtica cancelamento', placeholder: 'Cancelamento gratuito at\u00e9 14 dias antes do check-in.' },
      { key: 'email_checkin_time', label: 'Hora check-in', placeholder: 'A partir das 16:00' },
      { key: 'email_checkout_time', label: 'Hora check-out', placeholder: 'At\u00e9 \u00e0s 11:00' },
      { key: 'email_property_address', label: 'Morada (linha 1)', placeholder: 'Rua do Junco 3.5B' },
      { key: 'email_contact_whatsapp', label: 'WhatsApp contacto', placeholder: '+351 960 486 962' },
      { key: 'email_contact_email', label: 'Email contacto', placeholder: 'reservas@villasolria.com' },
    ],
  },
];

// All known keys from all sections
const ALL_KNOWN_KEYS = SECTIONS.flatMap((s) => s.fields.map((f) => f.key));

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    const { data } = await supabase.from('settings').select('*');
    const map: Record<string, string> = {};

    (data || []).forEach((s: Setting) => {
      // value is stored as JSON — convert to string for display
      map[s.key] = typeof s.value === 'string' ? s.value : String(s.value ?? '');
    });

    setSettings(map);
    setLoading(false);
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSave() {
    setSaving(true);

    try {
      for (const key of ALL_KNOWN_KEYS) {
        const value = settings[key] ?? '';

        const { data: existing } = await supabase
          .from('settings')
          .select('key')
          .eq('key', key)
          .limit(1);

        if (existing && existing.length > 0) {
          await supabase.from('settings').update({ value }).eq('key', key);
        } else {
          await supabase.from('settings').insert({ key, value });
        }
      }

      showToast('Definicoes guardadas com sucesso', 'success');
    } catch {
      showToast('Erro ao guardar definicoes', 'error');
    }

    setSaving(false);
  }

  async function handleSyncNow() {
    setSyncing(true);
    try {
      const res = await fetch('/api/ical/sync', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(`Erro na sincronizacao: ${json.error || 'desconhecido'}`, 'error');
      } else {
        const a = json.airbnb || { events: 0, dates_blocked: 0 };
        const b = json.booking || { events: 0, dates_blocked: 0 };
        showToast(
          `Sincronizado — Airbnb: ${a.events} eventos / ${a.dates_blocked} dias, Booking: ${b.events} eventos / ${b.dates_blocked} dias`,
          'success'
        );
      }
    } catch {
      showToast('Erro ao sincronizar calendarios', 'error');
    }
    setSyncing(false);
  }

  if (loading) {
    return <div className="text-gray-400">A carregar definicoes...</div>;
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
        <h1 className="text-2xl font-bold text-white">Definicoes</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          <Save size={16} />
          {saving ? 'A guardar...' : 'Guardar Tudo'}
        </button>
      </div>

      {SECTIONS.map((section) => (
        <div
          key={section.title}
          className="bg-[#16213e] rounded-2xl border border-white/5 p-6 space-y-5"
        >
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            {section.title}
          </h2>

          {section.title === 'Reservas' && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSyncNow}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-60"
              >
                <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'A sincronizar...' : 'Sincronizar Agora'}
              </button>
            </div>
          )}

          {section.fields.map(({ key, label, placeholder, type, options }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {label}
              </label>

              {type === 'select' && options ? (
                <select
                  value={settings[key] || ''}
                  onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none"
                >
                  {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={settings[key] || ''}
                  onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none"
                />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
