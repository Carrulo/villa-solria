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
      <h2>1. Responsavel pelo Tratamento de Dados</h2>
      <p>
        <strong>Villa Solria</strong><br />
        Responsavel: Bruno Carrulo<br />
        Morada: Rua do Junco 3.5B, 8800-591 Tavira, Portugal<br />
        Email: bruno@kontrolsat.com<br />
        Telefone: +351 912 345 678
      </p>
      <p>
        A Villa Solria compromete-se a proteger a privacidade dos seus utilizadores em conformidade
        com o Regulamento Geral sobre a Protecao de Dados (RGPD) — Regulamento (UE) 2016/679 — e a
        legislacao portuguesa aplicavel (Lei n.o 58/2019).
      </p>

      <h2>2. Dados Pessoais Recolhidos</h2>
      <p>Recolhemos os seguintes dados pessoais atraves do formulario de reserva e contacto:</p>
      <ul>
        <li>Nome completo</li>
        <li>Endereco de email</li>
        <li>Numero de telefone</li>
        <li>Datas de estadia pretendidas</li>
        <li>Numero de hospedes</li>
        <li>Mensagens e pedidos especificos</li>
      </ul>
      <p>Podemos tambem recolher dados tecnicos automaticamente (endereco IP, tipo de navegador, paginas visitadas) atraves de cookies analiticos, caso tenha dado o seu consentimento.</p>

      <h2>3. Finalidades do Tratamento</h2>
      <p>Os seus dados pessoais sao tratados para as seguintes finalidades:</p>
      <ul>
        <li><strong>Gestao de reservas:</strong> Processar e confirmar o seu pedido de reserva</li>
        <li><strong>Comunicacao:</strong> Responder a pedidos de informacao e fornecer detalhes sobre a estadia</li>
        <li><strong>Obrigacoes legais:</strong> Cumprimento de obrigacoes fiscais e de registo de hospedes (SEF)</li>
        <li><strong>Marketing:</strong> Envio de comunicacoes promocionais, apenas com o seu consentimento expresso</li>
        <li><strong>Melhoria do servico:</strong> Analise estatistica anonimizada do uso do website</li>
      </ul>

      <h2>4. Base Legal do Tratamento</h2>
      <ul>
        <li><strong>Consentimento (Art. 6.o(1)(a) RGPD):</strong> Para cookies analiticos, de marketing e comunicacoes promocionais</li>
        <li><strong>Execucao de contrato (Art. 6.o(1)(b) RGPD):</strong> Para processar reservas e gerir a estadia</li>
        <li><strong>Obrigacao legal (Art. 6.o(1)(c) RGPD):</strong> Para cumprimento de obrigacoes fiscais e de registo</li>
        <li><strong>Interesse legitimo (Art. 6.o(1)(f) RGPD):</strong> Para melhorar o nosso website e servicos</li>
      </ul>

      <h2>5. Cookies</h2>
      <p>O nosso website utiliza os seguintes tipos de cookies:</p>
      <h3>Cookies Necessarios</h3>
      <p>Essenciais para o funcionamento do website. Incluem cookies de sessao, preferencias de idioma e consentimento de cookies. Nao requerem consentimento.</p>
      <h3>Cookies Analiticos (Google Analytics 4)</h3>
      <p>Utilizados para compreender como os visitantes interagem com o website, recolhendo informacao anonimizada. So sao ativados com o seu consentimento.</p>
      <h3>Cookies de Marketing (Meta Pixel)</h3>
      <p>Utilizados para apresentar publicidade relevante em plataformas de redes sociais. So sao ativados com o seu consentimento.</p>
      <p>Pode gerir as suas preferencias de cookies a qualquer momento clicando em &quot;Gerir cookies&quot; no rodape do website.</p>

      <h2>6. Partilha de Dados</h2>
      <p>Os seus dados pessoais podem ser partilhados com:</p>
      <ul>
        <li>Servico de Estrangeiros e Fronteiras (SEF) — registo obrigatorio de hospedes</li>
        <li>Autoridade Tributaria — obrigacoes fiscais</li>
        <li>Google (Analytics) — apenas com consentimento</li>
        <li>Meta (Pixel) — apenas com consentimento</li>
      </ul>
      <p>Nao vendemos nem partilhamos os seus dados com terceiros para fins comerciais.</p>

      <h2>7. Periodo de Conservacao</h2>
      <ul>
        <li>Dados de reserva: 5 anos apos a estadia (obrigacao fiscal)</li>
        <li>Dados de contacto: Ate 2 anos apos o ultimo contacto, salvo consentimento para periodo superior</li>
        <li>Dados de cookies: Conforme a duracao do cookie (maximo 13 meses para analiticos)</li>
      </ul>

      <h2>8. Direitos do Titular dos Dados</h2>
      <p>Nos termos do RGPD, tem os seguintes direitos:</p>
      <ul>
        <li><strong>Direito de acesso:</strong> Saber que dados pessoais detemos sobre si</li>
        <li><strong>Direito de retificacao:</strong> Corrigir dados inexatos ou incompletos</li>
        <li><strong>Direito ao apagamento:</strong> Solicitar a eliminacao dos seus dados (&quot;direito a ser esquecido&quot;)</li>
        <li><strong>Direito a limitacao:</strong> Restringir o tratamento dos seus dados</li>
        <li><strong>Direito a portabilidade:</strong> Receber os seus dados num formato estruturado e legivel por maquina</li>
        <li><strong>Direito de oposicao:</strong> Opor-se ao tratamento dos seus dados para determinadas finalidades</li>
        <li><strong>Direito de retirar o consentimento:</strong> A qualquer momento, sem afetar a licitude do tratamento anterior</li>
      </ul>
      <p>
        Para exercer os seus direitos, contacte-nos atraves de: <strong>bruno@kontrolsat.com</strong>
      </p>
      <p>
        Tem tambem o direito de apresentar reclamacao junto da Comissao Nacional de Protecao de Dados (CNPD) — <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">www.cnpd.pt</a>
      </p>

      <h2>9. Seguranca</h2>
      <p>Implementamos medidas tecnicas e organizativas adequadas para proteger os seus dados pessoais contra acesso nao autorizado, perda ou destruicao, incluindo encriptacao SSL/TLS em todas as comunicacoes.</p>

      <h2>10. Alteracoes a esta Politica</h2>
      <p>Reservamo-nos o direito de atualizar esta politica de privacidade. Quaisquer alteracoes significativas serao comunicadas atraves do website.</p>
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
