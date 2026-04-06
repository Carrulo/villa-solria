import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Mail, Phone, MapPin, MessageCircle, Clock } from 'lucide-react';
import BookingForm from '@/components/BookingForm';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return { title: t('contactTitle'), description: t('contactDescription') };
}

export default function ContactPage() {
  const t = useTranslations('contact');

  return (
    <div className="py-12 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">{t('title')}</h1>
          <p className="text-lg text-gray-500">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 max-w-5xl mx-auto">
          {/* Contact Info */}
          <div className="lg:col-span-2 space-y-4">
            <a
              href="https://wa.me/351912345678?text=Hello%2C%20I%27m%20interested%20in%20Villa%20Solria"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 bg-whatsapp/10 rounded-2xl p-5 hover:bg-whatsapp/15 transition-colors"
            >
              <div className="w-12 h-12 bg-whatsapp rounded-xl flex items-center justify-center">
                <MessageCircle size={24} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{t('whatsapp')}</p>
                <p className="text-gray-500 text-xs">+351 912 345 678</p>
              </div>
            </a>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Mail size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">{t('email')}</p>
                  <a href="mailto:bruno@kontrolsat.com" className="text-accent text-sm hover:underline">
                    bruno@kontrolsat.com
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Phone size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">{t('phone')}</p>
                  <a href="tel:+351912345678" className="text-accent text-sm hover:underline">
                    +351 912 345 678
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <MapPin size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">{t('addressLabel')}</p>
                  <p className="text-gray-500 text-sm">
                    Rua do Junco 3.5B<br />
                    8800-591 Tavira, Portugal
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-accent/5 rounded-xl p-4">
              <Clock size={18} className="text-accent shrink-0" />
              <p className="text-sm text-gray-600">{t('responseTime')}</p>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-6">{t('formTitle')}</h2>
              <BookingForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
