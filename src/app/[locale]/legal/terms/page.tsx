import { useTranslations, useLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal' });
  return {
    title: `${t('termsTitle')} - Villa Solria`,
  };
}

const termsContent: Record<string, React.FC> = {
  pt: PtTerms,
  en: EnTerms,
  es: EsTerms,
  de: DeTerms,
};

export default function TermsPage() {
  const t = useTranslations('legal');
  const locale = useLocale();
  const Content = termsContent[locale] || termsContent.pt;

  return (
    <div className="py-12 lg:py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          {t('backToHome')}
        </Link>

        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
          {t('termsTitle')}
        </h1>
        <p className="text-sm text-gray-400 mb-10">
          {t('lastUpdated')}: 2026-04-06
        </p>

        <div className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-li:text-gray-600 prose-a:text-accent hover:prose-a:text-accent-hover prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3">
          <Content />
        </div>
      </div>
    </div>
  );
}

function PtTerms() {
  return (
    <>
      <h2>1. Identifica\u00e7\u00e3o do Propriet\u00e1rio</h2>
      <p>
        <strong>Villa Solria</strong><br />
        Propriet\u00e1rio: Bruno Carrulo<br />
        Morada: Rua do Junco 3.5B, 8800-591 Tavira, Portugal<br />
        Licen\u00e7a de Alojamento Local: 120108/AL<br />
        Email: bruno@kontrolsat.com
      </p>

      <h2>2. Condi\u00e7\u00f5es de Reserva</h2>
      <ul>
        <li>A reserva s\u00f3 \u00e9 considerada confirmada ap\u00f3s confirma\u00e7\u00e3o escrita por parte do propriet\u00e1rio e pagamento do sinal correspondente.</li>
        <li>O pagamento do sinal (30% do valor total) deve ser efetuado no prazo de 48 horas ap\u00f3s a confirma\u00e7\u00e3o.</li>
        <li>O valor remanescente deve ser pago at\u00e9 14 dias antes da data de check-in.</li>
        <li>Os pre\u00e7os incluem IVA \u00e0 taxa legal em vigor.</li>
        <li>A taxa de limpeza est\u00e1 inclu\u00edda no pre\u00e7o.</li>
      </ul>

      <h2>3. Pol\u00edtica de Cancelamento</h2>
      <ul>
        <li><strong>At\u00e9 14 dias antes do check-in:</strong> Cancelamento gratuito com reembolso total do sinal.</li>
        <li><strong>Entre 14 e 7 dias antes:</strong> Reembolso de 50% do sinal.</li>
        <li><strong>Menos de 7 dias antes:</strong> Sem reembolso do sinal.</li>
        <li><strong>N\u00e3o comparência (no-show):</strong> Sem reembolso de qualquer valor pago.</li>
      </ul>
      <p>Recomendamos a contrata\u00e7\u00e3o de um seguro de viagem que cubra cancelamentos.</p>

      <h2>4. Check-in e Check-out</h2>
      <ul>
        <li><strong>Check-in:</strong> A partir das 16:00 (self check-in com fechadura digital)</li>
        <li><strong>Check-out:</strong> At\u00e9 \u00e0s 10:30</li>
        <li>Check-in antecipado ou check-out tardio pode ser solicitado, sujeito a disponibilidade e poss\u00edvel taxa adicional.</li>
      </ul>

      <h2>5. Regras da Casa</h2>
      <ul>
        <li>Capacidade m\u00e1xima: 6 h\u00f3spedes</li>
        <li>Proibido fumar em toda a propriedade (interior e exterior)</li>
        <li>N\u00e3o s\u00e3o permitidos animais de estima\u00e7\u00e3o</li>
        <li>N\u00e3o s\u00e3o permitidas festas ou eventos</li>
        <li>Respeitar o sil\u00eancio entre as 22:00 e as 08:00</li>
        <li>Manter a propriedade limpa e arrumada</li>
        <li>Reportar imediatamente qualquer dano ao propriet\u00e1rio</li>
      </ul>

      <h2>6. Responsabilidade</h2>
      <ul>
        <li>O h\u00f3spede \u00e9 respons\u00e1vel por quaisquer danos causados ao im\u00f3vel ou ao seu conte\u00fado durante a estadia.</li>
        <li>O propriet\u00e1rio n\u00e3o se responsabiliza por objetos pessoais perdidos, roubados ou danificados.</li>
        <li>O propriet\u00e1rio n\u00e3o se responsabiliza por interrup\u00e7\u00f5es de servi\u00e7os p\u00fablicos (\u00e1gua, eletricidade, internet) ou por obras em propriedades vizinhas.</li>
        <li>O propriet\u00e1rio reserva-se o direito de solicitar a sa\u00edda imediata do h\u00f3spede em caso de viola\u00e7\u00e3o grave das regras da casa, sem direito a reembolso.</li>
      </ul>

      <h2>7. Estadia M\u00ednima</h2>
      <ul>
        <li>\u00c9poca baixa (Nov-Mar): m\u00ednimo 3 noites</li>
        <li>\u00c9poca m\u00e9dia (Abr-Jun, Out): m\u00ednimo 3 noites</li>
        <li>\u00c9poca alta (Jul-Set): m\u00ednimo 7 noites</li>
      </ul>

      <h2>8. Servi\u00e7os Inclu\u00eddos</h2>
      <p>O pre\u00e7o da reserva inclui:</p>
      <ul>
        <li>Roupa de cama e toalhas (incluindo toalhas de praia)</li>
        <li>Produtos b\u00e1sicos de higiene</li>
        <li>Wi-Fi gratuito</li>
        <li>Estacionamento gratuito</li>
        <li>Limpeza final</li>
        <li>Consumos de \u00e1gua, eletricidade e g\u00e1s</li>
      </ul>

      <h2>9. Lei Aplic\u00e1vel e Foro Competente</h2>
      <p>
        Estes termos e condi\u00e7\u00f5es s\u00e3o regidos pela lei portuguesa. Para a resolu\u00e7\u00e3o de quaisquer lit\u00edgios
        emergentes ser\u00e1 competente o foro da comarca de Tavira, com ren\u00fancia a qualquer outro.
      </p>

      <h2>10. Reclama\u00e7\u00f5es</h2>
      <p>
        O Livro de Reclama\u00e7\u00f5es est\u00e1 dispon\u00edvel em formato eletr\u00f3nico em{' '}
        <a href="https://www.livroreclamacoes.pt" target="_blank" rel="noopener noreferrer">
          www.livroreclamacoes.pt
        </a>.
      </p>
    </>
  );
}

function EnTerms() {
  return (
    <>
      <h2>1. Property Owner</h2>
      <p>
        <strong>Villa Solria</strong><br />
        Owner: Bruno Carrulo<br />
        Address: Rua do Junco 3.5B, 8800-591 Tavira, Portugal<br />
        Local Accommodation License: 120108/AL<br />
        Email: bruno@kontrolsat.com
      </p>

      <h2>2. Booking Conditions</h2>
      <ul>
        <li>A booking is only confirmed after written confirmation and payment of the deposit.</li>
        <li>A deposit of 30% of the total amount must be paid within 48 hours of confirmation.</li>
        <li>The remaining balance must be paid at least 14 days before check-in.</li>
        <li>Prices include VAT at the applicable legal rate.</li>
        <li>Cleaning fee is included in the price.</li>
      </ul>

      <h2>3. Cancellation Policy</h2>
      <ul>
        <li><strong>Up to 14 days before check-in:</strong> Free cancellation with full deposit refund.</li>
        <li><strong>Between 14 and 7 days before:</strong> 50% deposit refund.</li>
        <li><strong>Less than 7 days before:</strong> No deposit refund.</li>
        <li><strong>No-show:</strong> No refund of any amount paid.</li>
      </ul>
      <p>We recommend purchasing travel insurance that covers cancellations.</p>

      <h2>4. Check-in and Check-out</h2>
      <ul>
        <li><strong>Check-in:</strong> From 4:00 PM (self check-in with digital lock)</li>
        <li><strong>Check-out:</strong> By 10:30 AM</li>
        <li>Early check-in or late check-out may be requested, subject to availability and possible additional fee.</li>
      </ul>

      <h2>5. House Rules</h2>
      <ul>
        <li>Maximum capacity: 6 guests</li>
        <li>No smoking on the entire property</li>
        <li>No pets allowed</li>
        <li>No parties or events</li>
        <li>Quiet hours: 10:00 PM to 8:00 AM</li>
        <li>Keep the property clean and tidy</li>
        <li>Report any damage immediately to the owner</li>
      </ul>

      <h2>6. Liability</h2>
      <ul>
        <li>Guests are responsible for any damage caused to the property or its contents.</li>
        <li>The owner is not responsible for lost, stolen, or damaged personal belongings.</li>
        <li>The owner is not responsible for interruptions to public services or neighboring construction.</li>
        <li>The owner reserves the right to ask guests to leave immediately in case of serious rule violations, without refund.</li>
      </ul>

      <h2>7. Minimum Stay</h2>
      <ul>
        <li>Low season (Nov-Mar): minimum 3 nights</li>
        <li>Mid season (Apr-Jun, Oct): minimum 3 nights</li>
        <li>High season (Jul-Sep): minimum 7 nights</li>
      </ul>

      <h2>8. Included Services</h2>
      <p>The booking price includes bed linen, towels (including beach towels), basic toiletries, free Wi-Fi, free parking, final cleaning, and utility consumption.</p>

      <h2>9. Applicable Law</h2>
      <p>These terms are governed by Portuguese law. The courts of Tavira shall have exclusive jurisdiction.</p>

      <h2>10. Complaints</h2>
      <p>The official complaints book is available at{' '}
        <a href="https://www.livroreclamacoes.pt" target="_blank" rel="noopener noreferrer">www.livroreclamacoes.pt</a>.
      </p>
    </>
  );
}

function EsTerms() {
  return (
    <>
      <h2>1. Propietario</h2>
      <p>
        <strong>Villa Solria</strong><br />
        Propietario: Bruno Carrulo<br />
        Direccion: Rua do Junco 3.5B, 8800-591 Tavira, Portugal<br />
        Licencia de Alojamiento Local: 120108/AL<br />
        Email: bruno@kontrolsat.com
      </p>

      <h2>2. Condiciones de Reserva</h2>
      <ul>
        <li>La reserva solo se confirma tras confirmacion escrita y pago de la senal (30%).</li>
        <li>El pago restante debe realizarse al menos 14 dias antes del check-in.</li>
        <li>Los precios incluyen IVA.</li>
      </ul>

      <h2>3. Politica de Cancelacion</h2>
      <ul>
        <li><strong>Hasta 14 dias antes:</strong> Cancelacion gratuita con reembolso total.</li>
        <li><strong>Entre 14 y 7 dias:</strong> Reembolso del 50%.</li>
        <li><strong>Menos de 7 dias:</strong> Sin reembolso.</li>
      </ul>

      <h2>4. Normas de la Casa</h2>
      <ul>
        <li>Capacidad maxima: 6 huespedes</li>
        <li>Prohibido fumar, mascotas y fiestas</li>
        <li>Silencio de 22:00 a 08:00</li>
        <li>Check-in desde las 16:00, check-out hasta las 10:30</li>
      </ul>

      <h2>5. Responsabilidad</h2>
      <p>Los huespedes son responsables de cualquier dano. El propietario no se responsabiliza de objetos personales.</p>

      <h2>6. Ley Aplicable</h2>
      <p>Estos terminos se rigen por la ley portuguesa. Foro competente: Tavira.</p>

      <h2>7. Reclamaciones</h2>
      <p>Libro de reclamaciones disponible en{' '}
        <a href="https://www.livroreclamacoes.pt" target="_blank" rel="noopener noreferrer">www.livroreclamacoes.pt</a>.
      </p>
    </>
  );
}

function DeTerms() {
  return (
    <>
      <h2>1. Eigentumer</h2>
      <p>
        <strong>Villa Solria</strong><br />
        Eigentumer: Bruno Carrulo<br />
        Adresse: Rua do Junco 3.5B, 8800-591 Tavira, Portugal<br />
        Unterkunftslizenz: 120108/AL<br />
        E-Mail: bruno@kontrolsat.com
      </p>

      <h2>2. Buchungsbedingungen</h2>
      <ul>
        <li>Eine Buchung gilt erst nach schriftlicher Bestatigung und Anzahlung (30%) als bestratigt.</li>
        <li>Der Restbetrag ist mindestens 14 Tage vor dem Check-in fallig.</li>
        <li>Alle Preise verstehen sich inklusive Mehrwertsteuer.</li>
      </ul>

      <h2>3. Stornierungsbedingungen</h2>
      <ul>
        <li><strong>Bis 14 Tage vorher:</strong> Kostenlose Stornierung mit voller Ruckerstattung.</li>
        <li><strong>14 bis 7 Tage vorher:</strong> 50% Ruckerstattung.</li>
        <li><strong>Weniger als 7 Tage:</strong> Keine Ruckerstattung.</li>
      </ul>

      <h2>4. Hausregeln</h2>
      <ul>
        <li>Maximale Kapazitat: 6 Gaste</li>
        <li>Rauchen, Haustiere und Partys sind nicht gestattet</li>
        <li>Ruhezeiten: 22:00 bis 08:00 Uhr</li>
        <li>Check-in ab 16:00 Uhr, Check-out bis 10:30 Uhr</li>
      </ul>

      <h2>5. Haftung</h2>
      <p>Gaste haften fur alle Schaden. Der Eigentumer haftet nicht fur personliche Gegenstande.</p>

      <h2>6. Anwendbares Recht</h2>
      <p>Es gilt portugiesisches Recht. Gerichtsstand: Tavira.</p>

      <h2>7. Beschwerden</h2>
      <p>Das Beschwerdebuch ist verfugbar unter{' '}
        <a href="https://www.livroreclamacoes.pt" target="_blank" rel="noopener noreferrer">www.livroreclamacoes.pt</a>.
      </p>
    </>
  );
}
