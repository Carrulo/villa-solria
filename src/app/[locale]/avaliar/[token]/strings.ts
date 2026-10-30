// The review page speaks the guide's five languages. French, as in the
// guide, rides on the /en/ path with ?lang=fr.
export type ReviewLocale = 'pt' | 'en' | 'es' | 'de' | 'fr';

export interface ReviewStrings {
  title: string;
  intro: string;
  rating_label: string;
  comment_label: string;
  comment_placeholder: string;
  name_label: string;
  country_label: string;
  country_placeholder: string;
  note: string;
  send: string;
  sending: string;
  thanks_title: string;
  thanks_body: string;
  error: string;
  already: string;
  before: string;
  closed: string;
}

export const STRINGS: Record<ReviewLocale, ReviewStrings> = {
  pt: {
    title: 'Como correu a estadia?',
    intro: 'Obrigado por ter ficado na Villa Solria. A sua opinião ajuda outras famílias a encontrar-nos.',
    rating_label: 'A sua nota',
    comment_label: 'O seu comentário',
    comment_placeholder: 'O que gostou mais? Recomendaria a casa a quem?',
    name_label: 'Nome a mostrar',
    country_label: 'País',
    country_placeholder: 'Portugal',
    note: 'Aparece no site como estadia verificada, depois de a lermos.',
    send: 'Enviar avaliação',
    sending: 'A enviar…',
    thanks_title: 'Muito obrigado!',
    thanks_body: 'Recebemos a sua avaliação. Esperamos voltar a recebê-lo em breve.',
    error: 'Não foi possível enviar. Tente novamente.',
    already: 'A avaliação desta estadia já está publicada. Obrigado!',
    before: 'Poderá deixar a sua avaliação a partir da última noite da estadia.',
    closed: 'O prazo para avaliar esta estadia já terminou.',
  },
  en: {
    title: 'How was your stay?',
    intro: 'Thank you for staying at Villa Solria. Your review helps other families find us.',
    rating_label: 'Your rating',
    comment_label: 'Your review',
    comment_placeholder: 'What did you enjoy most? Who would you recommend the house to?',
    name_label: 'Name to display',
    country_label: 'Country',
    country_placeholder: 'United Kingdom',
    note: 'It appears on the website as a verified stay once we have read it.',
    send: 'Send review',
    sending: 'Sending…',
    thanks_title: 'Thank you so much!',
    thanks_body: 'We have received your review. We hope to welcome you back soon.',
    error: 'Could not send. Please try again.',
    already: 'The review for this stay is already published. Thank you!',
    before: 'You can leave your review from the last night of your stay.',
    closed: 'The period to review this stay has ended.',
  },
  es: {
    title: '¿Qué tal la estancia?',
    intro: 'Gracias por alojarse en Villa Solria. Su opinión ayuda a otras familias a encontrarnos.',
    rating_label: 'Su puntuación',
    comment_label: 'Su comentario',
    comment_placeholder: '¿Qué le gustó más? ¿A quién recomendaría la casa?',
    name_label: 'Nombre a mostrar',
    country_label: 'País',
    country_placeholder: 'España',
    note: 'Aparece en la web como estancia verificada, después de leerla.',
    send: 'Enviar opinión',
    sending: 'Enviando…',
    thanks_title: '¡Muchas gracias!',
    thanks_body: 'Hemos recibido su opinión. Esperamos volver a recibirle pronto.',
    error: 'No se pudo enviar. Inténtelo de nuevo.',
    already: 'La opinión de esta estancia ya está publicada. ¡Gracias!',
    before: 'Podrá dejar su opinión a partir de la última noche de la estancia.',
    closed: 'El plazo para valorar esta estancia ha terminado.',
  },
  de: {
    title: 'Wie war Ihr Aufenthalt?',
    intro: 'Danke, dass Sie in der Villa Solria gewohnt haben. Ihre Bewertung hilft anderen Familien, uns zu finden.',
    rating_label: 'Ihre Bewertung',
    comment_label: 'Ihr Kommentar',
    comment_placeholder: 'Was hat Ihnen am besten gefallen? Wem würden Sie das Haus empfehlen?',
    name_label: 'Angezeigter Name',
    country_label: 'Land',
    country_placeholder: 'Deutschland',
    note: 'Erscheint auf der Website als verifizierter Aufenthalt, sobald wir sie gelesen haben.',
    send: 'Bewertung senden',
    sending: 'Wird gesendet…',
    thanks_title: 'Vielen Dank!',
    thanks_body: 'Wir haben Ihre Bewertung erhalten und hoffen, Sie bald wieder begrüßen zu dürfen.',
    error: 'Senden fehlgeschlagen. Bitte erneut versuchen.',
    already: 'Die Bewertung für diesen Aufenthalt ist bereits veröffentlicht. Danke!',
    before: 'Sie können Ihre Bewertung ab der letzten Nacht Ihres Aufenthalts abgeben.',
    closed: 'Der Zeitraum für die Bewertung dieses Aufenthalts ist abgelaufen.',
  },
  fr: {
    title: 'Comment s’est passé votre séjour ?',
    intro: 'Merci d’avoir séjourné à la Villa Solria. Votre avis aide d’autres familles à nous trouver.',
    rating_label: 'Votre note',
    comment_label: 'Votre commentaire',
    comment_placeholder: 'Qu’avez-vous le plus apprécié ? À qui recommanderiez-vous la maison ?',
    name_label: 'Nom affiché',
    country_label: 'Pays',
    country_placeholder: 'France',
    note: 'Il apparaît sur le site comme séjour vérifié, une fois que nous l’avons lu.',
    send: 'Envoyer l’avis',
    sending: 'Envoi…',
    thanks_title: 'Merci beaucoup !',
    thanks_body: 'Nous avons bien reçu votre avis. Au plaisir de vous accueillir à nouveau.',
    error: 'Envoi impossible. Veuillez réessayer.',
    already: 'L’avis de ce séjour est déjà publié. Merci !',
    before: 'Vous pourrez laisser votre avis à partir de la dernière nuit du séjour.',
    closed: 'Le délai pour évaluer ce séjour est terminé.',
  },
};
