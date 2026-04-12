/**
 * Public holidays for PT, ES, DE, EN (UK).
 * Easter calculation uses the Anonymous Gregorian algorithm (Computus).
 */

type Country = 'pt' | 'es' | 'de' | 'en';

function computeEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** First Monday on or after a given date */
function firstMondayOnOrAfter(d: Date): Date {
  const dow = d.getDay(); // 0=Sun
  const offset = dow === 0 ? 1 : dow === 1 ? 0 : 8 - dow;
  return addDays(d, offset);
}

/** Last Monday of a given month */
function lastMonday(year: number, month: number): Date {
  // Start from last day of month
  const last = new Date(year, month + 1, 0);
  const dow = last.getDay();
  const offset = dow === 1 ? 0 : dow === 0 ? 6 : dow - 1;
  return addDays(last, -offset);
}

function fixed(year: number, month: number, day: number): string {
  return toISO(new Date(year, month - 1, day));
}

function getPortugalHolidays(year: number): Map<string, string> {
  const easter = computeEaster(year);
  const goodFriday = addDays(easter, -2);
  const corpusChristi = addDays(easter, 60);

  const holidays = new Map<string, string>();
  holidays.set(fixed(year, 1, 1), 'Ano Novo');
  holidays.set(toISO(goodFriday), 'Sexta-feira Santa');
  holidays.set(toISO(easter), 'Domingo de Pascoa');
  holidays.set(fixed(year, 4, 25), 'Dia da Liberdade');
  holidays.set(fixed(year, 5, 1), 'Dia do Trabalhador');
  holidays.set(toISO(corpusChristi), 'Corpo de Deus');
  holidays.set(fixed(year, 6, 10), 'Dia de Portugal');
  holidays.set(fixed(year, 8, 15), 'Assuncao de Nossa Senhora');
  holidays.set(fixed(year, 10, 5), 'Implantacao da Republica');
  holidays.set(fixed(year, 11, 1), 'Todos os Santos');
  holidays.set(fixed(year, 12, 1), 'Restauracao da Independencia');
  holidays.set(fixed(year, 12, 8), 'Imaculada Conceicao');
  holidays.set(fixed(year, 12, 25), 'Natal');
  return holidays;
}

function getSpainHolidays(year: number): Map<string, string> {
  const easter = computeEaster(year);
  const goodFriday = addDays(easter, -2);

  const holidays = new Map<string, string>();
  holidays.set(fixed(year, 1, 1), 'Ano Nuevo');
  holidays.set(fixed(year, 1, 6), 'Dia de Reyes');
  holidays.set(toISO(goodFriday), 'Viernes Santo');
  holidays.set(fixed(year, 5, 1), 'Dia del Trabajo');
  holidays.set(fixed(year, 8, 15), 'Asuncion');
  holidays.set(fixed(year, 10, 12), 'Fiesta Nacional');
  holidays.set(fixed(year, 11, 1), 'Todos los Santos');
  holidays.set(fixed(year, 12, 6), 'Dia de la Constitucion');
  holidays.set(fixed(year, 12, 8), 'Inmaculada Concepcion');
  holidays.set(fixed(year, 12, 25), 'Navidad');
  return holidays;
}

function getGermanyHolidays(year: number): Map<string, string> {
  const easter = computeEaster(year);
  const goodFriday = addDays(easter, -2);
  const easterMonday = addDays(easter, 1);
  const ascension = addDays(easter, 39);
  const whitMonday = addDays(easter, 50);

  const holidays = new Map<string, string>();
  holidays.set(fixed(year, 1, 1), 'Neujahr');
  holidays.set(toISO(goodFriday), 'Karfreitag');
  holidays.set(toISO(easterMonday), 'Ostermontag');
  holidays.set(fixed(year, 5, 1), 'Tag der Arbeit');
  holidays.set(toISO(ascension), 'Christi Himmelfahrt');
  holidays.set(toISO(whitMonday), 'Pfingstmontag');
  holidays.set(fixed(year, 10, 3), 'Tag der Deutschen Einheit');
  holidays.set(fixed(year, 12, 25), '1. Weihnachtstag');
  holidays.set(fixed(year, 12, 26), '2. Weihnachtstag');
  return holidays;
}

function getUKHolidays(year: number): Map<string, string> {
  const easter = computeEaster(year);
  const goodFriday = addDays(easter, -2);
  const easterMonday = addDays(easter, 1);
  const earlyMay = firstMondayOnOrAfter(new Date(year, 4, 1)); // first Mon in May
  const springBank = lastMonday(year, 4); // last Mon in May
  const summerBank = lastMonday(year, 7); // last Mon in August

  const holidays = new Map<string, string>();
  holidays.set(fixed(year, 1, 1), "New Year's Day");
  holidays.set(toISO(goodFriday), 'Good Friday');
  holidays.set(toISO(easterMonday), 'Easter Monday');
  holidays.set(toISO(earlyMay), 'Early May Bank Holiday');
  holidays.set(toISO(springBank), 'Spring Bank Holiday');
  holidays.set(toISO(summerBank), 'Summer Bank Holiday');
  holidays.set(fixed(year, 12, 25), 'Christmas Day');
  holidays.set(fixed(year, 12, 26), 'Boxing Day');
  return holidays;
}

export function getHolidays(year: number, country: Country): Map<string, string> {
  switch (country) {
    case 'pt':
      return getPortugalHolidays(year);
    case 'es':
      return getSpainHolidays(year);
    case 'de':
      return getGermanyHolidays(year);
    case 'en':
      return getUKHolidays(year);
  }
}

export function localeToCountry(locale: string): Country {
  const map: Record<string, Country> = {
    pt: 'pt',
    es: 'es',
    de: 'de',
    en: 'en',
  };
  return map[locale] ?? 'en';
}
