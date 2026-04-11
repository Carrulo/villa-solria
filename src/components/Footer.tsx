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
  email: 'bruno@kontrolsat.com',
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

        <div className="border-t border-white/10 mt-10 pt-8 text-center">
          <p className="text-white/40 text-sm">
            &copy; {new Date().getFullYear()} Villa Solria. {t('rights')}.
          </p>
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
