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
      <h2>1. Responsável pelo Tratamento de Dados</h2>
      <p>
        <strong>Villa Solria</strong><br />
        Responsável: Bruno Carrulo<br />
        Morada: Rua do Junco 3.5B, 8800-591 Tavira, Portugal<br />
        Email: reservas@villasolria.com<br />
        Telefone: +351 912 345 678
      </p>
      <p>
        A Villa Solria compromete-se a proteger a privacidade dos seus utilizadores em conformidade
        com o Regulamento Geral sobre a Proteção de Dados (RGPD) — Regulamento (UE) 2016/679 — e a
        legislação portuguesa aplicável (Lei n.º 58/2019).
      </p>

      <h2>2. Dados Pessoais Recolhidos</h2>
      <p>Recolhemos os seguintes dados pessoais através do formulário de reserva e contacto:</p>
      <ul>
        <li>Nome completo</li>
        <li>Endereço de email</li>
        <li>Número de telefone</li>
        <li>Datas de estadia pretendidas</li>
        <li>Número de hóspedes</li>
        <li>Mensagens e pedidos específicos</li>
      </ul>
      <p>Podemos também recolher dados técnicos automaticamente (endereço IP, tipo de navegador, páginas visitadas) através de cookies analíticos, caso tenha dado o seu consentimento.</p>

      <h2>3. Finalidades do Tratamento</h2>
      <p>Os seus dados pessoais são tratados para as seguintes finalidades:</p>
      <ul>
        <li><strong>Gestão de reservas:</strong> Processar e confirmar o seu pedido de reserva</li>
        <li><strong>Comunicação:</strong> Responder a pedidos de informação e fornecer detalhes sobre a estadia</li>
        <li><strong>Obrigações legais:</strong> Cumprimento de obrigações fiscais e de registo de hóspedes (SEF)</li>
        <li><strong>Marketing:</strong> Envio de comunicações promocionais, apenas com o seu consentimento expresso</li>
        <li><strong>Melhoria do serviço:</strong> Análise estatística anonimizada do uso do website</li>
      </ul>

      <h2>4. Base Legal do Tratamento</h2>
      <ul>
        <li><strong>Consentimento (Art. 6.º(1)(a) RGPD):</strong> Para cookies analíticos, de marketing e comunicações promocionais</li>
        <li><strong>Execução de contrato (Art. 6.º(1)(b) RGPD):</strong> Para processar reservas e gerir a estadia</li>
        <li><strong>Obrigação legal (Art. 6.º(1)(c) RGPD):</strong> Para cumprimento de obrigações fiscais e de registo</li>
        <li><strong>Interesse legítimo (Art. 6.º(1)(f) RGPD):</strong> Para melhorar o nosso website e serviços</li>
      </ul>

      <h2>5. Cookies</h2>
      <p>O nosso website utiliza os seguintes tipos de cookies:</p>
      <h3>Cookies Necessários</h3>
      <p>Essenciais para o funcionamento do website. Incluem cookies de sessão, preferências de idioma e consentimento de cookies. Não requerem consentimento.</p>
      <h3>Cookies Analíticos (Google Analytics 4)</h3>
      <p>Utilizados para compreender como os visitantes interagem com o website, recolhendo informação anonimizada. Só são ativados com o seu consentimento.</p>
      <h3>Cookies de Marketing (Meta Pixel)</h3>
      <p>Utilizados para apresentar publicidade relevante em plataformas de redes sociais. Só são ativados com o seu consentimento.</p>
      <p>Pode gerir as suas preferências de cookies a qualquer momento clicando em &quot;Gerir cookies&quot; no rodapé do website.</p>

      <h2>6. Partilha de Dados</h2>
      <p>Os seus dados pessoais podem ser partilhados com:</p>
      <ul>
        <li>Serviço de Estrangeiros e Fronteiras (SEF) — registo obrigatório de hóspedes</li>
        <li>Autoridade Tributária — obrigações fiscais</li>
        <li>Google (Analytics) — apenas com consentimento</li>
        <li>Meta (Pixel) — apenas com consentimento</li>
      </ul>
      <p>Não vendemos nem partilhamos os seus dados com terceiros para fins comerciais.</p>

      <h2>7. Período de Conservação</h2>
      <ul>
        <li>Dados de reserva: 5 anos após a estadia (obrigação fiscal)</li>
        <li>Dados de contacto: Até 2 anos após o último contacto, salvo consentimento para período superior</li>
        <li>Dados de cookies: Conforme a duração do cookie (máximo 13 meses para analíticos)</li>
      </ul>

      <h2>8. Direitos do Titular dos Dados</h2>
      <p>Nos termos do RGPD, tem os seguintes direitos:</p>
      <ul>
        <li><strong>Direito de acesso:</strong> Saber que dados pessoais detemos sobre si</li>
        <li><strong>Direito de retificação:</strong> Corrigir dados inexatos ou incompletos</li>
        <li><strong>Direito ao apagamento:</strong> Solicitar a eliminação dos seus dados (&quot;direito a ser esquecido&quot;)</li>
        <li><strong>Direito à limitação:</strong> Restringir o tratamento dos seus dados</li>
        <li><strong>Direito à portabilidade:</strong> Receber os seus dados num formato estruturado e legível por máquina</li>
        <li><strong>Direito de oposição:</strong> Opor-se ao tratamento dos seus dados para determinadas finalidades</li>
        <li><strong>Direito de retirar o consentimento:</strong> A qualquer momento, sem afetar a licitude do tratamento anterior</li>
      </ul>
      <p>
        Para exercer os seus direitos, contacte-nos através de: <strong>reservas@villasolria.com</strong>
      </p>
      <p>
        Tem também o direito de apresentar reclamação junto da Comissão Nacional de Proteção de Dados (CNPD) — <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">www.cnpd.pt</a>
      </p>

      <h2>9. Segurança</h2>
      <p>Implementamos medidas técnicas e organizativas adequadas para proteger os seus dados pessoais contra acesso não autorizado, perda ou destruição, incluindo encriptação SSL/TLS em todas as comunicações.</p>

      <h2>10. Videovigilância</h2>
      <p>
        O alojamento dispõe de <strong>uma câmara de videovigilância no exterior, na zona da entrada</strong>,
        orientada para a porta e a fachada.
      </p>
      <ul>
        <li><strong>Finalidade:</strong> segurança de pessoas e bens</li>
        <li><strong>Base legal:</strong> interesse legítimo (art. 6.º, n.º 1, alínea f, do RGPD)</li>
        <li><strong>Dados recolhidos:</strong> imagem. <strong>Não é captado som.</strong></li>
        <li><strong>Área abrangida:</strong> apenas o exterior da entrada da propriedade. Não existem câmaras no interior da habitação, no terraço nem no jardim</li>
        <li><strong>Conservação:</strong> as imagens são eliminadas automaticamente ao fim de 7 dias, salvo se forem necessárias como prova de um incidente</li>
        <li><strong>Destinatários:</strong> ninguém, salvo pedido de autoridade competente</li>
      </ul>
      <p>
        Pode exercer os direitos de acesso, cópia, apagamento e oposição através de{' '}
        <a href="mailto:reservas@villasolria.com">reservas@villasolria.com</a>, bem como reclamar junto da CNPD.
      </p>

      <h2>11. Alterações a esta Política</h2>
      <p>Reservamo-nos o direito de atualizar esta política de privacidade. Quaisquer alterações significativas serão comunicadas através do website.</p>
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
        Email: reservas@villasolria.com<br />
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
      <p>To exercise your rights, contact us at: <strong>reservas@villasolria.com</strong></p>
      <p>You also have the right to lodge a complaint with the Portuguese Data Protection Authority (CNPD) — <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">www.cnpd.pt</a></p>

      <h2>9. Security</h2>
      <p>We implement appropriate technical and organizational measures to protect your personal data, including SSL/TLS encryption for all communications.</p>

      <h2>10. CCTV</h2>
      <p>
        The property has <strong>one outdoor security camera at the entrance</strong>, pointed at the
        front door and the façade.
      </p>
      <ul>
        <li><strong>Purpose:</strong> security of people and property</li>
        <li><strong>Legal basis:</strong> legitimate interest (Art. 6(1)(f) GDPR)</li>
        <li><strong>Data collected:</strong> image only. <strong>No audio is recorded.</strong></li>
        <li><strong>Area covered:</strong> only the outside of the property entrance. There are no cameras inside the house, on the terrace or in the garden</li>
        <li><strong>Retention:</strong> footage is deleted automatically after 7 days, unless needed as evidence of an incident</li>
        <li><strong>Recipients:</strong> nobody, except at the request of a competent authority</li>
      </ul>
      <p>
        You may exercise your rights of access, copy, erasure and objection through{' '}
        <a href="mailto:reservas@villasolria.com">reservas@villasolria.com</a>, and lodge a complaint with the Portuguese supervisory authority, CNPD.
      </p>

      <h2>11. Changes to this Policy</h2>
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
        Email: reservas@villasolria.com<br />
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
      <p>Acceso, rectificacion, supresion, limitacion, portabilidad, oposicion y retirada del consentimiento. Contacto: <strong>reservas@villasolria.com</strong></p>
      <p>Puede presentar reclamacion ante la CNPD — <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">www.cnpd.pt</a></p>

      <h2>7. Seguridad</h2>
      <p>Implementamos medidas tecnicas y organizativas adecuadas, incluyendo encriptacion SSL/TLS.</p>

      <h2>8. Videovigilancia</h2>
      <p>
        El alojamiento dispone de <strong>una cámara de videovigilancia en el exterior, en la zona de
        la entrada</strong>, orientada a la puerta y a la fachada.
      </p>
      <ul>
        <li><strong>Finalidad:</strong> seguridad de personas y bienes</li>
        <li><strong>Base legal:</strong> interés legítimo (art. 6.1.f del RGPD)</li>
        <li><strong>Datos recogidos:</strong> imagen. <strong>No se capta sonido.</strong></li>
        <li><strong>Área cubierta:</strong> únicamente el exterior de la entrada. No hay cámaras en el interior de la vivienda, ni en la terraza ni en el jardín</li>
        <li><strong>Conservación:</strong> las imágenes se eliminan automáticamente a los 7 días, salvo que sean necesarias como prueba de un incidente</li>
        <li><strong>Destinatarios:</strong> nadie, salvo requerimiento de autoridad competente</li>
      </ul>
      <p>
        Puede ejercer los derechos de acceso, copia, supresión y oposición a través de{' '}
        <a href="mailto:reservas@villasolria.com">reservas@villasolria.com</a>, así como reclamar ante la CNPD portuguesa.
      </p>
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
        E-Mail: reservas@villasolria.com<br />
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
      <p>Auskunft, Berichtigung, Loschung, Einschrankung, Datenubertragbarkeit, Widerspruch und Widerruf der Einwilligung. Kontakt: <strong>reservas@villasolria.com</strong></p>
      <p>Beschwerderecht bei der CNPD — <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">www.cnpd.pt</a></p>

      <h2>7. Sicherheit</h2>
      <p>Wir setzen geeignete technische und organisatorische Massnahmen ein, einschliesslich SSL/TLS-Verschlusselung.</p>

      <h2>8. Videoüberwachung</h2>
      <p>
        Die Unterkunft verfügt über <strong>eine Außenkamera im Eingangsbereich</strong>, die auf die
        Haustür und die Fassade gerichtet ist.
      </p>
      <ul>
        <li><strong>Zweck:</strong> Sicherheit von Personen und Eigentum</li>
        <li><strong>Rechtsgrundlage:</strong> berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO)</li>
        <li><strong>Erhobene Daten:</strong> Bild. <strong>Es wird kein Ton aufgezeichnet.</strong></li>
        <li><strong>Erfasster Bereich:</strong> ausschließlich der Außenbereich des Eingangs. Im Haus, auf der Terrasse und im Garten gibt es keine Kameras</li>
        <li><strong>Speicherdauer:</strong> Aufnahmen werden nach 7 Tagen automatisch gelöscht, sofern sie nicht als Nachweis eines Vorfalls benötigt werden</li>
        <li><strong>Empfänger:</strong> niemand, außer auf Verlangen einer zuständigen Behörde</li>
      </ul>
      <p>
        Ihre Rechte auf Auskunft, Kopie, Löschung und Widerspruch können Sie über{' '}
        <a href="mailto:reservas@villasolria.com">reservas@villasolria.com</a> geltend machen; zudem können Sie sich bei der portugiesischen Aufsichtsbehörde CNPD beschweren.
      </p>
    </>
  );
}
