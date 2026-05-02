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
      <h2>1. Identificação do Proprietário</h2>
      <p>
        <strong>Villa Solria</strong><br />
        Proprietário: Bruno Carrulo<br />
        Morada: Rua do Junco 3.5B, 8800-591 Tavira, Portugal<br />
        Licença de Alojamento Local: 120108/AL<br />
        Email: reservas@villasolria.com
      </p>

      <h2>2. Condições de Reserva</h2>
      <ul>
        <li>A reserva é confirmada após pagamento integral do valor total no momento da reserva, processado de forma segura via Stripe.</li>
        <li>São aceites pagamentos com cartão (Visa, Mastercard, American Express), MB Way, Apple Pay e Google Pay.</li>
        <li>Os preços incluem IVA à taxa legal em vigor.</li>
        <li>A taxa de limpeza é cobrada à parte e adicionada ao total da reserva.</li>
      </ul>

      <h2>3. Política de Cancelamento</h2>
      <ul>
        <li><strong>Até 14 dias antes do check-in:</strong> Cancelamento gratuito com reembolso total.</li>
        <li><strong>Entre 14 e 7 dias antes:</strong> Reembolso de 50% do valor pago.</li>
        <li><strong>Menos de 7 dias antes:</strong> Sem reembolso.</li>
        <li><strong>Não comparência (no-show):</strong> Sem reembolso.</li>
      </ul>
      <p>Os reembolsos são processados via Stripe para o método de pagamento original em 5 a 10 dias úteis. Os encargos de processamento de pagamento (taxa Stripe, ~1,5% + €0,25) não são reembolsáveis, sendo deduzidos do valor a devolver. Recomendamos a contratação de um seguro de viagem que cubra cancelamentos.</p>

      <h2>4. Check-in e Check-out</h2>
      <ul>
        <li><strong>Check-in:</strong> A partir das 16:00 (self check-in com fechadura digital)</li>
        <li><strong>Check-out:</strong> Até às 10:30</li>
        <li>Check-in antecipado ou check-out tardio pode ser solicitado, sujeito a disponibilidade e possível taxa adicional.</li>
      </ul>

      <h2>5. Regras da Casa</h2>
      <ul>
        <li>Capacidade máxima: 6 hóspedes</li>
        <li>Proibido fumar em toda a propriedade (interior e exterior)</li>
        <li>Não são permitidos animais de estimação</li>
        <li>Não são permitidas festas ou eventos</li>
        <li>Respeitar o silêncio entre as 22:00 e as 08:00</li>
        <li>Manter a propriedade limpa e arrumada</li>
        <li>Reportar imediatamente qualquer dano ao proprietário</li>
      </ul>

      <h2>6. Responsabilidade</h2>
      <ul>
        <li>O hóspede é responsável por quaisquer danos causados ao imóvel ou ao seu conteúdo durante a estadia.</li>
        <li>O proprietário não se responsabiliza por objetos pessoais perdidos, roubados ou danificados.</li>
        <li>O proprietário não se responsabiliza por interrupções de serviços públicos (água, eletricidade, internet) ou por obras em propriedades vizinhas.</li>
        <li>O proprietário reserva-se o direito de solicitar a saída imediata do hóspede em caso de violação grave das regras da casa, sem direito a reembolso.</li>
      </ul>

      <h2>7. Estadia Mínima</h2>
      <ul>
        <li>Época baixa (Nov-Mar): mínimo 1 noite</li>
        <li>Época média (Abr-Jun, Out): mínimo 1 noite</li>
        <li>Época alta (Jul-Set): mínimo 7 noites</li>
      </ul>

      <h2>8. Serviços Incluídos</h2>
      <p>O preço da reserva inclui:</p>
      <ul>
        <li>Roupa de cama e toalhas de banho (não inclui toalhas de praia)</li>
        <li>Produtos básicos de higiene</li>
        <li>Wi-Fi gratuito</li>
        <li>Estacionamento gratuito</li>
        <li>Limpeza final</li>
        <li>Consumos de água, eletricidade e gás</li>
      </ul>

      <h2>9. Lei Aplicável e Foro Competente</h2>
      <p>
        Estes termos e condições são regidos pela lei portuguesa. Para a resolução de quaisquer litígios
        emergentes será competente o foro da comarca de Tavira, com renúncia a qualquer outro.
      </p>

      <h2>10. Reclamações</h2>
      <p>
        O Livro de Reclamações está disponível em formato eletrónico em{' '}
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
        Email: reservas@villasolria.com
      </p>

      <h2>2. Booking Conditions</h2>
      <ul>
        <li>The booking is confirmed once the full amount is paid at the time of booking, processed securely via Stripe.</li>
        <li>We accept card payments (Visa, Mastercard, American Express), MB Way, Apple Pay and Google Pay.</li>
        <li>Prices include VAT at the applicable legal rate.</li>
        <li>The cleaning fee is charged separately and added to the booking total.</li>
      </ul>

      <h2>3. Cancellation Policy</h2>
      <ul>
        <li><strong>Up to 14 days before check-in:</strong> Free cancellation with full refund.</li>
        <li><strong>Between 14 and 7 days before:</strong> 50% refund of the amount paid.</li>
        <li><strong>Less than 7 days before:</strong> No refund.</li>
        <li><strong>No-show:</strong> No refund.</li>
      </ul>
      <p>Refunds are processed via Stripe to the original payment method within 5 to 10 business days. Payment processing fees (Stripe fee, ~1.5% + €0.25) are non-refundable and will be deducted from the refund amount. We recommend purchasing travel insurance that covers cancellations.</p>

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
        <li>Low season (Nov-Mar): minimum 1 night</li>
        <li>Mid season (Apr-Jun, Oct): minimum 1 night</li>
        <li>High season (Jul-Sep): minimum 7 nights</li>
      </ul>

      <h2>8. Included Services</h2>
      <p>The booking price includes bed linen, bath towels (beach towels not provided), basic toiletries, free Wi-Fi, free parking, final cleaning, and utility consumption.</p>

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
        Email: reservas@villasolria.com
      </p>

      <h2>2. Condiciones de Reserva</h2>
      <ul>
        <li>La reserva se confirma con el pago íntegro en el momento de la reserva, procesado de forma segura mediante Stripe.</li>
        <li>Se aceptan pagos con tarjeta (Visa, Mastercard, American Express), MB Way, Apple Pay y Google Pay.</li>
        <li>Los precios incluyen IVA. La tasa de limpieza se cobra aparte y se suma al total de la reserva.</li>
      </ul>

      <h2>3. Política de Cancelación</h2>
      <ul>
        <li><strong>Hasta 14 días antes:</strong> Cancelación gratuita con reembolso total.</li>
        <li><strong>Entre 14 y 7 días antes:</strong> Reembolso del 50%.</li>
        <li><strong>Menos de 7 días antes:</strong> Sin reembolso.</li>
        <li><strong>No-show:</strong> Sin reembolso.</li>
      </ul>
      <p>Los reembolsos se procesan vía Stripe al método de pago original en 5 a 10 días laborables. Los gastos de procesamiento de pago (tasa Stripe, ~1,5% + €0,25) no son reembolsables y se deducen del importe a devolver.</p>

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
        E-Mail: reservas@villasolria.com
      </p>

      <h2>2. Buchungsbedingungen</h2>
      <ul>
        <li>Die Buchung ist nach vollständiger Zahlung des Gesamtbetrags zum Zeitpunkt der Buchung bestätigt, sicher abgewickelt über Stripe.</li>
        <li>Wir akzeptieren Kartenzahlung (Visa, Mastercard, American Express), MB Way, Apple Pay und Google Pay.</li>
        <li>Alle Preise verstehen sich inklusive Mehrwertsteuer. Die Reinigungsgebühr wird separat berechnet und zur Buchungssumme hinzugefügt.</li>
      </ul>

      <h2>3. Stornierungsbedingungen</h2>
      <ul>
        <li><strong>Bis 14 Tage vor Check-in:</strong> Kostenlose Stornierung mit voller Rückerstattung.</li>
        <li><strong>14 bis 7 Tage vorher:</strong> 50% Rückerstattung.</li>
        <li><strong>Weniger als 7 Tage:</strong> Keine Rückerstattung.</li>
        <li><strong>Nichterscheinen (No-show):</strong> Keine Rückerstattung.</li>
      </ul>
      <p>Rückerstattungen werden über Stripe auf die ursprüngliche Zahlungsmethode innerhalb von 5 bis 10 Werktagen veranlasst. Die Zahlungsabwicklungsgebühren (Stripe-Gebühr, ca. 1,5% + €0,25) sind nicht erstattungsfähig und werden vom Rückerstattungsbetrag abgezogen.</p>

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
