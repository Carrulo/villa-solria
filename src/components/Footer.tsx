import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { MapPin, Mail, Phone } from 'lucide-react';

export default function Footer() {
  const t = useTranslations('footer');
  const nav = useTranslations('nav');

  return (
    <footer className="bg-primary text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          <div>
            <h3 className="text-xl font-bold mb-4">Villa Solria</h3>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              Rua do Junco 3.5B<br />
              8800-591 Tavira, Portugal
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
                <a href="mailto:bruno@kontrolsat.com" className="hover:text-white transition-colors">
                  bruno@kontrolsat.com
                </a>
              </li>
              <li className="flex items-center gap-2 text-white/60 text-sm">
                <Phone size={16} />
                <a href="tel:+351912345678" className="hover:text-white transition-colors">
                  +351 912 345 678
                </a>
              </li>
              <li className="flex items-start gap-2 text-white/60 text-sm">
                <MapPin size={16} className="mt-0.5 shrink-0" />
                <span>Cabanas de Tavira, Algarve</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-white/90">Legal</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://www.livroreclamacoes.pt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 text-sm hover:text-white transition-colors"
                >
                  {t('complaints')}
                </a>
              </li>
              <li>
                <span className="text-white/60 text-sm">{t('privacy')}</span>
              </li>
              <li>
                <span className="text-white/60 text-sm">{t('terms')}</span>
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
