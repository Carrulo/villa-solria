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
    title: `${t('privacyTitle')} - Villa Solria`,
  };
}

const privacyContent: Record<string, React.FC> = {
  pt: PtPrivacy,
  en: EnPrivacy,
  es: EsPrivacy,
  de: DePrivacy,
};

export default function PrivacyPage() {
  const t = useTranslations('legal');
  const locale = useLocale();
  const Content = privacyContent[locale] || privacyContent.pt;

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
          {t('privacyTitle')}
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

function PtPrivacy() {
  return (
    <>
      <h2>1. Respons\u00e1vel pelo Tratamento de Dados</h2>
      <p>
        <strong>Villa Solria</strong><br />
        Respons\u00e1vel: Bruno Carrulo<br />
        Morada: Rua do Junco 3.5B, 8800-591 Tavira, Portugal<br />
        Email: bruno@kontrolsat.com<br />
        Telefone: +351 912 345 678
      </p>
      <p>
        A Villa Solria compromete-se a proteger a privacidade dos seus utilizadores em conformidade
        com o Regulamento Geral sobre a Prote\u00e7\u00e3o de Dados (RGPD) — Regulamento (UE) 2016/679 — e a
        legisla\u00e7\u00e3o portuguesa aplic\u00e1vel (Lei n.\u00ba 58/2019).
      </p>

      <h2>2. Dados Pessoais Recolhidos</h2>
      <p>Recolhemos os seguintes dados pessoais atrav\u00e9s do formul\u00e1rio de reserva e contacto:</p>
      <ul>
        <li>Nome completo</li>
        <li>Endere\u00e7o de email</li>
        <li>N\u00famero de telefone</li>
        <li>Datas de estadia pretendidas</li>
        <li>N\u00famero de h\u00f3spedes</li>
        <li>Mensagens e pedidos espec\u00edficos</li>
      </ul>
      <p>Podemos tamb\u00e9m recolher dados t\u00e9cnicos automaticamente (endere\u00e7o IP, tipo de navegador, p\u00e1ginas visitadas) atrav\u00e9s de cookies anal\u00edticos, caso tenha dado o seu consentimento.</p>

      <h2>3. Finalidades do Tratamento</h2>
      <p>Os seus dados pessoais s\u00e3o tratados para as seguintes finalidades:</p>
      <ul>
        <li><strong>Gest\u00e3o de reservas:</strong> Processar e confirmar o seu pedido de reserva</li>
        <li><strong>Comunica\u00e7\u00e3o:</strong> Responder a pedidos de informa\u00e7\u00e3o e fornecer detalhes sobre a estadia</li>
        <li><strong>Obriga\u00e7\u00f5es legais:</strong> Cumprimento de obriga\u00e7\u00f5es fiscais e de registo de h\u00f3spedes (SEF)</li>
        <li><strong>Marketing:</strong> Envio de comunica\u00e7\u00f5es promocionais, apenas com o seu consentimento expresso</li>
        <li><strong>Melhoria do servi\u00e7o:</strong> An\u00e1lise estat\u00edstica anonimizada do uso do website</li>
      </ul>

      <h2>4. Base Legal do Tratamento</h2>
      <ul>
        <li><strong>Consentimento (Art. 6.\u00ba(1)(a) RGPD):</strong> Para cookies anal\u00edticos, de marketing e comunica\u00e7\u00f5es promocionais</li>
        <li><strong>Execu\u00e7\u00e3o de contrato (Art. 6.\u00ba(1)(b) RGPD):</strong> Para processar reservas e gerir a estadia</li>
        <li><strong>Obriga\u00e7\u00e3o legal (Art. 6.\u00ba(1)(c) RGPD):</strong> Para cumprimento de obriga\u00e7\u00f5es fiscais e de registo</li>
        <li><strong>Interesse leg\u00edtimo (Art. 6.\u00ba(1)(f) RGPD):</strong> Para melhorar o nosso website e servi\u00e7os</li>
      </ul>

      <h2>5. Cookies</h2>
      <p>O nosso website utiliza os seguintes tipos de cookies:</p>
      <h3>Cookies Necess\u00e1rios</h3>
      <p>Essenciais para o funcionamento do website. Incluem cookies de sess\u00e3o, prefer\u00eancias de idioma e consentimento de cookies. N\u00e3o requerem consentimento.</p>
      <h3>Cookies Anal\u00edticos (Google Analytics 4)</h3>
      <p>Utilizados para compreender como os visitantes interagem com o website, recolhendo informa\u00e7\u00e3o anonimizada. S\u00f3 s\u00e3o ativados com o seu consentimento.</p>
      <h3>Cookies de Marketing (Meta Pixel)</h3>
      <p>Utilizados para apresentar publicidade relevante em plataformas de redes sociais. S\u00f3 s\u00e3o ativados com o seu consentimento.</p>
      <p>Pode gerir as suas prefer\u00eancias de cookies a qualquer momento clicando em &quot;Gerir cookies&quot; no rodap\u00e9 do website.</p>

      <h2>6. Partilha de Dados</h2>
      <p>Os seus dados pessoais podem ser partilhados com:</p>
      <ul>
        <li>Servi\u00e7o de Estrangeiros e Fronteiras (SEF) — registo obrigat\u00f3rio de h\u00f3spedes</li>
        <li>Autoridade Tribut\u00e1ria — obriga\u00e7\u00f5es fiscais</li>
        <li>Google (Analytics) — apenas com consentimento</li>
        <li>Meta (Pixel) — apenas com consentimento</li>
      </ul>
      <p>N\u00e3o vendemos nem partilhamos os seus dados com terceiros para fins comerciais.</p>

      <h2>7. Per\u00edodo de Conserva\u00e7\u00e3o</h2>
      <ul>
        <li>Dados de reserva: 5 anos ap\u00f3s a estadia (obriga\u00e7\u00e3o fiscal)</li>
        <li>Dados de contacto: At\u00e9 2 anos ap\u00f3s o \u00faltimo contacto, salvo consentimento para per\u00edodo superior</li>
        <li>Dados de cookies: Conforme a dura\u00e7\u00e3o do cookie (m\u00e1ximo 13 meses para anal\u00edticos)</li>
      </ul>

      <h2>8. Direitos do Titular dos Dados</h2>
      <p>Nos termos do RGPD, tem os seguintes direitos:</p>
      <ul>
        <li><strong>Direito de acesso:</strong> Saber que dados pessoais detemos sobre si</li>
        <li><strong>Direito de retifica\u00e7\u00e3o:</strong> Corrigir dados inexatos ou incompletos</li>
        <li><strong>Direito ao apagamento:</strong> Solicitar a elimina\u00e7\u00e3o dos seus dados (&quot;direito a ser esquecido&quot;)</li>
        <li><strong>Direito \u00e0 limita\u00e7\u00e3o:</strong> Restringir o tratamento dos seus dados</li>
        <li><strong>Direito \u00e0 portabilidade:</strong> Receber os seus dados num formato estruturado e leg\u00edvel por m\u00e1quina</li>
        <li><strong>Direito de oposi\u00e7\u00e3o:</strong> Opor-se ao tratamento dos seus dados para determinadas finalidades</li>
        <li><strong>Direito de retirar o consentimento:</strong> A qualquer momento, sem afetar a licitude do tratamento anterior</li>
      </ul>
      <p>
        Para exercer os seus direitos, contacte-nos atrav\u00e9s de: <strong>bruno@kontrolsat.com</strong>
      </p>
      <p>
        Tem tamb\u00e9m o direito de apresentar reclama\u00e7\u00e3o junto da Comiss\u00e3o Nacional de Prote\u00e7\u00e3o de Dados (CNPD) — <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">www.cnpd.pt</a>
      </p>

      <h2>9. Seguran\u00e7a</h2>
      <p>Implementamos medidas t\u00e9cnicas e organizativas adequadas para proteger os seus dados pessoais contra acesso n\u00e3o autorizado, perda ou destrui\u00e7\u00e3o, incluindo encripta\u00e7\u00e3o SSL/TLS em todas as comunica\u00e7\u00f5es.</p>

      <h2>10. Altera\u00e7\u00f5es a esta Pol\u00edtica</h2>
      <p>Reservamo-nos o direito de atualizar esta pol\u00edtica de privacidade. Quaisquer altera\u00e7\u00f5es significativas ser\u00e3o comunicadas atrav\u00e9s do website.</p>
    </>
  );
}

function EnPrivacy() {
  return (
    <>
      <h2>1. Data Controller</h2>
      <p>
        <strong>Villa Solria</strong><br />
        Controller: Bruno Carrulo<br />
        Address: Rua do Junco 3.5B, 8800-591 Tavira, Portugal<br />
        Email: bruno@kontrolsat.com<br />
        Phone: +351 912 345 678
      </p>
      <p>
        Villa Solria is committed to protecting your privacy in accordance with the General Data
        Protection Regulation (GDPR) — Regulation (EU) 2016/679 — and applicable Portuguese
        legislation (Law No. 58/2019).
      </p>

      <h2>2. Personal Data Collected</h2>
      <p>We collect the following personal data through our booking and contact forms:</p>
      <ul>
        <li>Full name</li>
        <li>Email address</li>
        <li>Phone number</li>
        <li>Intended stay dates</li>
        <li>Number of guests</li>
        <li>Messages and specific requests</li>
      </ul>
      <p>We may also collect technical data automatically (IP address, browser type, pages visited) through analytics cookies, subject to your consent.</p>

      <h2>3. Purposes of Processing</h2>
      <ul>
        <li><strong>Booking management:</strong> Processing and confirming your reservation request</li>
        <li><strong>Communication:</strong> Responding to inquiries and providing stay details</li>
        <li><strong>Legal obligations:</strong> Compliance with tax and guest registration requirements</li>
        <li><strong>Marketing:</strong> Promotional communications, only with your express consent</li>
        <li><strong>Service improvement:</strong> Anonymized statistical analysis of website usage</li>
      </ul>

      <h2>4. Legal Basis</h2>
      <ul>
        <li><strong>Consent (Art. 6(1)(a) GDPR):</strong> For analytics cookies, marketing cookies, and promotional communications</li>
        <li><strong>Contract performance (Art. 6(1)(b) GDPR):</strong> For processing bookings and managing stays</li>
        <li><strong>Legal obligation (Art. 6(1)(c) GDPR):</strong> For tax and registration compliance</li>
        <li><strong>Legitimate interest (Art. 6(1)(f) GDPR):</strong> For improving our website and services</li>
      </ul>

      <h2>5. Cookies</h2>
      <h3>Necessary Cookies</h3>
      <p>Essential for website operation. Include session cookies, language preferences, and cookie consent. No consent required.</p>
      <h3>Analytics Cookies (Google Analytics 4)</h3>
      <p>Used to understand how visitors interact with the website. Only activated with your consent.</p>
      <h3>Marketing Cookies (Meta Pixel)</h3>
      <p>Used to deliver relevant advertising on social media platforms. Only activated with your consent.</p>
      <p>You can manage your cookie preferences at any time by clicking &quot;Manage cookies&quot; in the website footer.</p>

      <h2>6. Data Sharing</h2>
      <p>Your personal data may be shared with:</p>
      <ul>
        <li>Portuguese Immigration and Borders Service (SEF) — mandatory guest registration</li>
        <li>Tax Authority — tax obligations</li>
        <li>Google (Analytics) — only with consent</li>
        <li>Meta (Pixel) — only with consent</li>
      </ul>
      <p>We do not sell or share your data with third parties for commercial purposes.</p>

      <h2>7. Data Retention</h2>
      <ul>
        <li>Booking data: 5 years after stay (tax obligation)</li>
        <li>Contact data: Up to 2 years after last contact</li>
        <li>Cookie data: Per cookie duration (maximum 13 months for analytics)</li>
      </ul>

      <h2>8. Your Rights</h2>
      <p>Under the GDPR, you have the right to:</p>
      <ul>
        <li>Access your personal data</li>
        <li>Rectify inaccurate or incomplete data</li>
        <li>Request erasure (&quot;right to be forgotten&quot;)</li>
        <li>Restrict processing</li>
        <li>Data portability</li>
        <li>Object to processing</li>
        <li>Withdraw consent at any time</li>
      </ul>
      <p>To exercise your rights, contact us at: <strong>bruno@kontrolsat.com</strong></p>
      <p>You also have the right to lodge a complaint with the Portuguese Data Protection Authority (CNPD) — <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">www.cnpd.pt</a></p>

      <h2>9. Security</h2>
      <p>We implement appropriate technical and organizational measures to protect your personal data, including SSL/TLS encryption for all communications.</p>

      <h2>10. Changes to this Policy</h2>
      <p>We reserve the right to update this privacy policy. Significant changes will be communicated through the website.</p>
    </>
  );
}

function EsPrivacy() {
  return (
    <>
      <h2>1. Responsable del Tratamiento</h2>
      <p>
        <strong>Villa Solria</strong><br />
        Responsable: Bruno Carrulo<br />
        Direccion: Rua do Junco 3.5B, 8800-591 Tavira, Portugal<br />
        Email: bruno@kontrolsat.com<br />
        Telefono: +351 912 345 678
      </p>
      <p>
        Villa Solria se compromete a proteger su privacidad de conformidad con el Reglamento General
        de Proteccion de Datos (RGPD) — Reglamento (UE) 2016/679.
      </p>

      <h2>2. Datos Personales Recogidos</h2>
      <ul>
        <li>Nombre completo</li>
        <li>Direccion de email</li>
        <li>Numero de telefono</li>
        <li>Fechas de estancia</li>
        <li>Numero de huespedes</li>
        <li>Mensajes y solicitudes</li>
      </ul>

      <h2>3. Finalidades del Tratamiento</h2>
      <ul>
        <li>Gestion de reservas y comunicacion</li>
        <li>Obligaciones legales (registro de huespedes, fiscalidad)</li>
        <li>Marketing (solo con consentimiento)</li>
        <li>Mejora del servicio (analisis anonimizado)</li>
      </ul>

      <h2>4. Base Legal</h2>
      <ul>
        <li><strong>Consentimiento:</strong> Cookies analiticas, marketing</li>
        <li><strong>Ejecucion de contrato:</strong> Gestion de reservas</li>
        <li><strong>Obligacion legal:</strong> Registro de huespedes y obligaciones fiscales</li>
        <li><strong>Interes legitimo:</strong> Mejora del website</li>
      </ul>

      <h2>5. Cookies</h2>
      <p>Cookies necesarias (sesion, idioma), analiticas (Google Analytics 4) y de marketing (Meta Pixel). Puede gestionar sus preferencias en &quot;Gestionar cookies&quot; en el pie de pagina.</p>

      <h2>6. Derechos del Titular</h2>
      <p>Acceso, rectificacion, supresion, limitacion, portabilidad, oposicion y retirada del consentimiento. Contacto: <strong>bruno@kontrolsat.com</strong></p>
      <p>Puede presentar reclamacion ante la CNPD — <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">www.cnpd.pt</a></p>

      <h2>7. Seguridad</h2>
      <p>Implementamos medidas tecnicas y organizativas adecuadas, incluyendo encriptacion SSL/TLS.</p>
    </>
  );
}

function DePrivacy() {
  return (
    <>
      <h2>1. Verantwortlicher</h2>
      <p>
        <strong>Villa Solria</strong><br />
        Verantwortlicher: Bruno Carrulo<br />
        Adresse: Rua do Junco 3.5B, 8800-591 Tavira, Portugal<br />
        E-Mail: bruno@kontrolsat.com<br />
        Telefon: +351 912 345 678
      </p>
      <p>
        Villa Solria verpflichtet sich, Ihre Privatsphare in Ubereinstimmung mit der
        Datenschutz-Grundverordnung (DSGVO) — Verordnung (EU) 2016/679 — zu schutzen.
      </p>

      <h2>2. Erhobene personenbezogene Daten</h2>
      <ul>
        <li>Vollstandiger Name</li>
        <li>E-Mail-Adresse</li>
        <li>Telefonnummer</li>
        <li>Gewunschte Aufenthaltsdaten</li>
        <li>Anzahl der Gaste</li>
        <li>Nachrichten und spezielle Wunsche</li>
      </ul>

      <h2>3. Zwecke der Verarbeitung</h2>
      <ul>
        <li>Buchungsverwaltung und Kommunikation</li>
        <li>Gesetzliche Pflichten (Gasteregistrierung, Steuern)</li>
        <li>Marketing (nur mit Einwilligung)</li>
        <li>Serviceverbesserung (anonymisierte Analyse)</li>
      </ul>

      <h2>4. Rechtsgrundlage</h2>
      <ul>
        <li><strong>Einwilligung:</strong> Analytische Cookies, Marketing</li>
        <li><strong>Vertragserfullung:</strong> Buchungsverwaltung</li>
        <li><strong>Gesetzliche Verpflichtung:</strong> Gasteregistrierung und steuerliche Pflichten</li>
        <li><strong>Berechtigtes Interesse:</strong> Website-Verbesserung</li>
      </ul>

      <h2>5. Cookies</h2>
      <p>Notwendige Cookies (Sitzung, Sprache), analytische (Google Analytics 4) und Marketing-Cookies (Meta Pixel). Verwalten Sie Ihre Einstellungen unter &quot;Cookies verwalten&quot; in der Fusszeile.</p>

      <h2>6. Ihre Rechte</h2>
      <p>Auskunft, Berichtigung, Loschung, Einschrankung, Datenubertragbarkeit, Widerspruch und Widerruf der Einwilligung. Kontakt: <strong>bruno@kontrolsat.com</strong></p>
      <p>Beschwerderecht bei der CNPD — <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">www.cnpd.pt</a></p>

      <h2>7. Sicherheit</h2>
      <p>Wir setzen geeignete technische und organisatorische Massnahmen ein, einschliesslich SSL/TLS-Verschlusselung.</p>
    </>
  );
}
