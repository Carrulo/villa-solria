import { createServerClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

type Locale = 'pt' | 'en' | 'es' | 'de';

interface GuideSection {
  id: string;
  slug: string;
  sort_order: number;
  icon: string | null;
  title: Record<string, string>;
  body: Record<string, string>;
  media_url: string | null;
}

interface GuidePlace {
  id: string;
  type: string;
  sort_order: number;
  name: string;
  description: Record<string, string>;
  photo_url: string | null;
  map_url: string | null;
  distance_km: number | null;
}

interface Booking {
  id: string;
  guest_name: string | null;
  checkin_date: string;
  checkout_date: string;
  language: string | null;
  door_code: string | null;
}

function todayIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Minimal markdown renderer: **bold**, *italic*, `code`, line breaks, ordered/unordered lists.
function renderMarkdown(md: string): string {
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = escape(md).split('\n');
  const out: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };
  const inline = (s: string) =>
    s
      .replace(/`([^`]+)`/g, '<code class="bg-stone-100 text-stone-800 px-1.5 py-0.5 rounded font-mono text-sm">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');

  for (const raw of lines) {
    const l = raw.trimEnd();
    const ol = /^\d+\.\s+(.*)/.exec(l);
    const ul = /^[-*]\s+(.*)/.exec(l);
    if (ol) {
      if (listType !== 'ol') {
        closeList();
        out.push('<ol class="list-decimal pl-6 space-y-1">');
        listType = 'ol';
      }
      out.push(`<li>${inline(ol[1])}</li>`);
    } else if (ul) {
      if (listType !== 'ul') {
        closeList();
        out.push('<ul class="list-disc pl-6 space-y-1">');
        listType = 'ul';
      }
      out.push(`<li>${inline(ul[1])}</li>`);
    } else if (l.trim() === '') {
      closeList();
      out.push('');
    } else {
      closeList();
      out.push(`<p class="mb-2">${inline(l)}</p>`);
    }
  }
  closeList();
  return out.join('\n');
}

interface T {
  inactive_title: string;
  inactive_before: string;
  inactive_after: string;
  hello: string;
  welcome_subtitle: string;
  stay_dates: string;
  local_tips: string;
  types: Record<string, string>;
  distance: string;
  emergency_note: string;
}

const T: Record<Locale, T> = {
  pt: {
    inactive_title: 'Este guia ainda não está disponível',
    inactive_before: 'O guia abre 3 dias antes do seu check-in.',
    inactive_after: 'Este guia expirou. Obrigado pela sua estadia!',
    hello: 'Olá',
    welcome_subtitle: 'O seu guia pessoal da Villa Solria',
    stay_dates: 'A sua estadia',
    local_tips: 'O que visitar por perto',
    types: { beach: 'Praias', restaurant: 'Restaurantes', shop: 'Lojas e supermercados', activity: 'Actividades', transport: 'Transportes' },
    distance: 'km',
    emergency_note: 'Qualquer dúvida, estamos a uma mensagem de distância.',
  },
  en: {
    inactive_title: 'This guide is not available yet',
    inactive_before: 'The guide opens 3 days before your check-in.',
    inactive_after: 'This guide has expired. Thank you for your stay!',
    hello: 'Hi',
    welcome_subtitle: 'Your personal Villa Solria guide',
    stay_dates: 'Your stay',
    local_tips: 'What to visit nearby',
    types: { beach: 'Beaches', restaurant: 'Restaurants', shop: 'Shops & supermarkets', activity: 'Activities', transport: 'Transport' },
    distance: 'km',
    emergency_note: 'Any question, we are one message away.',
  },
  es: {
    inactive_title: 'Esta guía aún no está disponible',
    inactive_before: 'La guía se abre 3 días antes de su check-in.',
    inactive_after: 'Esta guía ha expirado. ¡Gracias por su estancia!',
    hello: 'Hola',
    welcome_subtitle: 'Su guía personal de Villa Solria',
    stay_dates: 'Su estancia',
    local_tips: 'Qué visitar cerca',
    types: { beach: 'Playas', restaurant: 'Restaurantes', shop: 'Tiendas y supermercados', activity: 'Actividades', transport: 'Transportes' },
    distance: 'km',
    emergency_note: 'Cualquier duda, estamos a un mensaje.',
  },
  de: {
    inactive_title: 'Dieser Leitfaden ist noch nicht verfügbar',
    inactive_before: 'Der Leitfaden öffnet 3 Tage vor Ihrem Check-in.',
    inactive_after: 'Dieser Leitfaden ist abgelaufen. Danke für Ihren Aufenthalt!',
    hello: 'Hallo',
    welcome_subtitle: 'Ihr persönlicher Villa Solria Leitfaden',
    stay_dates: 'Ihr Aufenthalt',
    local_tips: 'Was in der Nähe besuchen',
    types: { beach: 'Strände', restaurant: 'Restaurants', shop: 'Geschäfte', activity: 'Aktivitäten', transport: 'Transport' },
    distance: 'km',
    emergency_note: 'Bei Fragen sind wir nur eine Nachricht entfernt.',
  },
};

export default async function GuidePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale: rawLocale, token } = await params;
  const locale = (['pt', 'en', 'es', 'de'].includes(rawLocale) ? rawLocale : 'en') as Locale;
  const t = T[locale];

  if (!token || token.length < 8) notFound();

  const supabase = createServerClient();

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, guest_name, checkin_date, checkout_date, language, status, door_code')
    .eq('guide_token', token)
    .maybeSingle();

  if (!booking || booking.status === 'cancelled') notFound();

  const b = booking as Booking & { status?: string };
  const today = todayIso();
  const opensAt = addDays(b.checkin_date, -3);
  const closesAt = addDays(b.checkout_date, 3);
  const isBefore = today < opensAt;
  const isAfter = today > closesAt;
  const isActive = !isBefore && !isAfter;

  // Fetch sections always (so we can show placeholders if inactive)
  const { data: sectionsData } = await supabase
    .from('guide_sections')
    .select('*')
    .order('sort_order', { ascending: true });
  const sections = (sectionsData || []) as GuideSection[];

  const { data: placesData } = await supabase
    .from('guide_places')
    .select('*')
    .order('sort_order', { ascending: true });
  const places = (placesData || []) as GuidePlace[];

  // Sensitive placeholders only during active window
  const { data: settingsRows } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['guide_door_code', 'guide_wifi_ssid', 'guide_wifi_password', 'guide_lock_video_url']);
  const settings: Record<string, string> = {};
  for (const row of settingsRows || []) {
    const val = (row as { key: string; value: unknown }).value;
    settings[(row as { key: string }).key] = typeof val === 'string' ? val : String(val ?? '');
  }

  const firstName = (b.guest_name || '').trim().split(/\s+/)[0] || '';

  if (!isActive) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 max-w-md w-full p-8 text-center">
          <div className="text-5xl mb-4">{isBefore ? '⏳' : '🌅'}</div>
          <h1 className="text-xl font-semibold text-stone-900 mb-2">{t.inactive_title}</h1>
          <p className="text-sm text-stone-600">
            {isBefore ? t.inactive_before : t.inactive_after}
          </p>
          <p className="text-xs text-stone-500 mt-6">{t.stay_dates}: {b.checkin_date} → {b.checkout_date}</p>
        </div>
      </div>
    );
  }

  const doorCode = b.door_code || settings['guide_door_code'] || '—';
  function resolvePlaceholders(body: string): string {
    return body
      .replace(/\{\{door_code\}\}/g, doorCode)
      .replace(/\{\{wifi_ssid\}\}/g, settings['guide_wifi_ssid'] || '—')
      .replace(/\{\{wifi_password\}\}/g, settings['guide_wifi_password'] || '—');
  }

  const placesByType = places.reduce<Record<string, GuidePlace[]>>((acc, p) => {
    (acc[p.type] = acc[p.type] || []).push(p);
    return acc;
  }, {});
  const typeOrder = ['beach', 'restaurant', 'shop', 'activity', 'transport'];

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="bg-gradient-to-br from-amber-50 via-rose-50 to-stone-50 border-b border-stone-200">
        <div className="max-w-2xl mx-auto px-5 py-8 sm:py-12">
          <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">Villa Solria</p>
          <h1 className="text-3xl sm:text-4xl font-serif font-semibold text-stone-900">
            {t.hello}{firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p className="text-stone-600 mt-2">{t.welcome_subtitle}</p>
          <p className="text-sm text-stone-500 mt-4">
            {t.stay_dates}: <span className="text-stone-700 font-medium">{b.checkin_date}</span> → <span className="text-stone-700 font-medium">{b.checkout_date}</span>
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6 sm:py-8 space-y-6">
        {sections.map((s) => {
          const title = s.title[locale] || s.title.en || s.slug;
          const body = resolvePlaceholders(s.body[locale] || s.body.en || '');
          return (
            <section key={s.id} className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg sm:text-xl font-serif font-semibold text-stone-900 mb-3">
                {s.icon && <span className="text-2xl leading-none">{s.icon}</span>}
                {title}
              </h2>
              <div className="prose prose-sm max-w-none text-stone-700" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
              {s.slug === 'entry' && settings['guide_lock_video_url'] && (() => {
                const url = settings['guide_lock_video_url'];
                // Detect YouTube (full, short, shorts) and Vimeo so we can
                // embed via iframe instead of <video> (which only works
                // with direct MP4 URLs).
                const ytMatch = url.match(
                  /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,15})/
                );
                const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
                if (ytMatch) {
                  return (
                    <div className="mt-4 rounded-xl overflow-hidden bg-stone-100 aspect-video">
                      <iframe
                        src={`https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1&playsinline=1`}
                        title="Vídeo da fechadura"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    </div>
                  );
                }
                if (vimeoMatch) {
                  return (
                    <div className="mt-4 rounded-xl overflow-hidden bg-stone-100 aspect-video">
                      <iframe
                        src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
                        title="Vídeo da fechadura"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    </div>
                  );
                }
                return (
                  <div className="mt-4 rounded-xl overflow-hidden bg-stone-100 aspect-video">
                    <video src={url} controls playsInline className="w-full h-full object-cover" />
                  </div>
                );
              })()}
              {s.media_url && s.slug !== 'entry' && (() => {
                const url = s.media_url;
                const ytMatch = url.match(
                  /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,15})/
                );
                const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
                if (ytMatch) {
                  return (
                    <div className="mt-4 rounded-xl overflow-hidden bg-stone-100 aspect-video">
                      <iframe
                        src={`https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1&playsinline=1`}
                        title={title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    </div>
                  );
                }
                if (vimeoMatch) {
                  return (
                    <div className="mt-4 rounded-xl overflow-hidden bg-stone-100 aspect-video">
                      <iframe
                        src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
                        title={title}
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    </div>
                  );
                }
                if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) {
                  return (
                    <div className="mt-4 rounded-xl overflow-hidden bg-stone-100 aspect-video">
                      <video src={url} controls playsInline className="w-full h-full object-cover" />
                    </div>
                  );
                }
                return (
                  <div className="mt-4 relative w-full h-48 rounded-xl overflow-hidden">
                    <Image src={url} alt={title} fill className="object-cover" />
                  </div>
                );
              })()}
            </section>
          );
        })}

        {/* Local recommendations */}
        <section className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm">
          <h2 className="text-lg sm:text-xl font-serif font-semibold text-stone-900 mb-4 flex items-center gap-2">
            <span className="text-2xl leading-none">🗺️</span> {t.local_tips}
          </h2>
          <div className="space-y-5">
            {typeOrder.filter((type) => placesByType[type]?.length).map((type) => (
              <div key={type}>
                <h3 className="text-xs uppercase tracking-widest text-stone-500 mb-2 font-semibold">{t.types[type] || type}</h3>
                <ul className="space-y-2.5">
                  {placesByType[type].map((p) => (
                    <li key={p.id} className="flex gap-3 items-start">
                      {p.photo_url ? (
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-stone-100">
                          <Image src={p.photo_url} alt={p.name} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-stone-100 flex-shrink-0 flex items-center justify-center text-2xl">
                          📍
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-stone-900">{p.name}</p>
                          {p.distance_km != null && (
                            <span className="text-[11px] text-stone-500 whitespace-nowrap">{p.distance_km} {t.distance}</span>
                          )}
                        </div>
                        <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                          {p.description[locale] || p.description.en || ''}
                        </p>
                        {p.map_url && (
                          <a
                            href={p.map_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-amber-700 hover:text-amber-800 mt-1 inline-flex items-center gap-1"
                          >
                            📍 Abrir no mapa →
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <p className="text-xs text-center text-stone-500 pt-4 pb-2">{t.emergency_note}</p>
      </main>
    </div>
  );
}
