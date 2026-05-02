'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { MapPin, Mail, Phone } from 'lucide-react';

export interface FooterSettings {
  email: string;
  phone: string;
  whatsapp: string;
  address1: string;
  address2: string;
  complaintsUrl: string;
  privacyUrl: string;
  termsUrl: string;
  license: string;
}

const DEFAULTS: FooterSettings = {
  email: 'reservas@villasolria.com',
  phone: '+351 912 345 678',
  whatsapp: '+351 912 345 678',
  address1: 'Rua do Junco 3.5B',
  address2: '8800-591 Tavira, Portugal',
  complaintsUrl: 'https://www.livroreclamacoes.pt',
  privacyUrl: '',
  termsUrl: '',
  license: '120108/AL',
};

interface FooterProps {
  settings?: Partial<FooterSettings>;
}

export default function Footer({ settings: overrides }: FooterProps) {
  const t = useTranslations('footer');
  const nav = useTranslations('nav');
  const cookies = useTranslations('cookies');

  const s: FooterSettings = { ...DEFAULTS, ...overrides };

  const phoneHref = `tel:${s.phone.replace(/\s+/g, '')}`;

  const handleManageCookies = () => {
    window.dispatchEvent(new CustomEvent('villa-solria-reopen-cookies'));
  };

  return (
    <footer className="bg-primary text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          <div>
            <h3 className="text-xl font-bold mb-4">Villa Solria</h3>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              {s.address1}<br />
              {s.address2}
            </p>
            <p className="text-sand text-sm font-medium">{t('license')}</p>
            <p className="text-gray-400 text-xs mt-1">NIF 224113178</p>
            <p className="text-white/70 text-sm mt-3">
              <a href="tel:+351960486962" className="hover:text-sand transition-colors">
                +351 960 486 962
              </a>
            </p>
            <p className="text-gray-400 text-[10px]">(custo da chamada para a rede fixa nacional)</p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-white/90">Links</h4>
            <ul className="space-y-2">
              {[
                { href: '/villa' as const, label: nav('villa') },
                { href: '/gallery' as const, label: nav('gallery') },
                { href: '/location' as const, label: nav('location') },
                { href: '/pricing' as const, label: nav('pricing') },
                { href: '/reviews' as const, label: nav('reviews') },
                { href: '/faq' as const, label: nav('faq') },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/60 text-sm hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-white/90">{nav('contact')}</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-white/60 text-sm">
                <Mail size={16} />
                <a href={`mailto:${s.email}`} className="hover:text-white transition-colors">
                  {s.email}
                </a>
              </li>
              <li className="flex items-center gap-2 text-white/60 text-sm">
                <Phone size={16} />
                <a href={phoneHref} className="hover:text-white transition-colors">
                  {s.phone}
                </a>
              </li>
              <li className="flex items-start gap-2 text-white/60 text-sm">
                <MapPin size={16} className="mt-0.5 shrink-0" />
                <span>{s.address2}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-white/90">Legal</h4>
            <ul className="space-y-2">
              <li>
                {s.complaintsUrl ? (
                  <a
                    href={s.complaintsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/60 text-sm hover:text-white transition-colors"
                  >
                    {t('complaints')}
                  </a>
                ) : (
                  <span className="text-white/60 text-sm">{t('complaints')}</span>
                )}
              </li>
              <li>
                <Link
                  href={'/legal/privacy' as never}
                  className="text-white/60 text-sm hover:text-white transition-colors"
                >
                  {t('privacy')}
                </Link>
              </li>
              <li>
                <Link
                  href={'/legal/terms' as never}
                  className="text-white/60 text-sm hover:text-white transition-colors"
                >
                  {t('terms')}
                </Link>
              </li>
              <li>
                <CookieManageButton label={cookies('manage')} onClick={handleManageCookies} />
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-sm order-2 sm:order-1">
            &copy; {new Date().getFullYear()} Villa Solria. {t('rights')}.
          </p>
          <a
            href="https://www.facebook.com/VillaSolria/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook Villa Solria"
            className="order-1 sm:order-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1877F2] hover:bg-[#166FE5] text-white text-sm font-medium transition-colors"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            <span>{t('followFacebook')}</span>
          </a>
        </div>
      </div>
    </footer>
  );
}

// Client component for cookie button click handler
function CookieManageButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-white/60 text-sm hover:text-white transition-colors text-left"
    >
      {label}
    </button>
  );
}
