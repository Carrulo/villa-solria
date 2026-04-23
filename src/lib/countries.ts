// Curated list of likely guest origins for Villa Solria (Algarve).
// Ordered roughly by expected volume. `lang` is the default email
// language to use for guests from that country — the admin can always
// override on the booking row.

export type CountryCode =
  | 'PT' | 'ES' | 'FR' | 'DE' | 'GB' | 'IE' | 'NL' | 'BE' | 'IT' | 'CH'
  | 'AT' | 'LU' | 'DK' | 'SE' | 'NO' | 'FI' | 'PL' | 'CZ' | 'US' | 'CA'
  | 'BR' | 'AR' | 'MX' | 'AU' | 'NZ' | 'ZA' | 'OTHER';

export interface CountryInfo {
  code: CountryCode;
  name_pt: string;
  lang: 'pt' | 'en' | 'es' | 'de';
  flag: string;
}

export const COUNTRIES: CountryInfo[] = [
  { code: 'PT', name_pt: 'Portugal', lang: 'pt', flag: '🇵🇹' },
  { code: 'ES', name_pt: 'Espanha', lang: 'es', flag: '🇪🇸' },
  { code: 'FR', name_pt: 'França', lang: 'en', flag: '🇫🇷' },
  { code: 'DE', name_pt: 'Alemanha', lang: 'de', flag: '🇩🇪' },
  { code: 'GB', name_pt: 'Reino Unido', lang: 'en', flag: '🇬🇧' },
  { code: 'IE', name_pt: 'Irlanda', lang: 'en', flag: '🇮🇪' },
  { code: 'NL', name_pt: 'Países Baixos', lang: 'en', flag: '🇳🇱' },
  { code: 'BE', name_pt: 'Bélgica', lang: 'en', flag: '🇧🇪' },
  { code: 'IT', name_pt: 'Itália', lang: 'en', flag: '🇮🇹' },
  { code: 'CH', name_pt: 'Suíça', lang: 'de', flag: '🇨🇭' },
  { code: 'AT', name_pt: 'Áustria', lang: 'de', flag: '🇦🇹' },
  { code: 'LU', name_pt: 'Luxemburgo', lang: 'en', flag: '🇱🇺' },
  { code: 'DK', name_pt: 'Dinamarca', lang: 'en', flag: '🇩🇰' },
  { code: 'SE', name_pt: 'Suécia', lang: 'en', flag: '🇸🇪' },
  { code: 'NO', name_pt: 'Noruega', lang: 'en', flag: '🇳🇴' },
  { code: 'FI', name_pt: 'Finlândia', lang: 'en', flag: '🇫🇮' },
  { code: 'PL', name_pt: 'Polónia', lang: 'en', flag: '🇵🇱' },
  { code: 'CZ', name_pt: 'República Checa', lang: 'en', flag: '🇨🇿' },
  { code: 'US', name_pt: 'Estados Unidos', lang: 'en', flag: '🇺🇸' },
  { code: 'CA', name_pt: 'Canadá', lang: 'en', flag: '🇨🇦' },
  { code: 'BR', name_pt: 'Brasil', lang: 'pt', flag: '🇧🇷' },
  { code: 'AR', name_pt: 'Argentina', lang: 'es', flag: '🇦🇷' },
  { code: 'MX', name_pt: 'México', lang: 'es', flag: '🇲🇽' },
  { code: 'AU', name_pt: 'Austrália', lang: 'en', flag: '🇦🇺' },
  { code: 'NZ', name_pt: 'Nova Zelândia', lang: 'en', flag: '🇳🇿' },
  { code: 'ZA', name_pt: 'África do Sul', lang: 'en', flag: '🇿🇦' },
  { code: 'OTHER', name_pt: 'Outro / Other', lang: 'en', flag: '🌍' },
];

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

export function countryFlag(code: string | null | undefined): string {
  if (!code) return '';
  return BY_CODE.get(code.toUpperCase() as CountryCode)?.flag || '🌍';
}

export function countryToLanguage(
  code: string | null | undefined,
): 'pt' | 'en' | 'es' | 'de' {
  if (!code) return 'pt';
  return BY_CODE.get(code.toUpperCase() as CountryCode)?.lang || 'en';
}

export function countryName(code: string | null | undefined): string {
  if (!code) return '';
  return BY_CODE.get(code.toUpperCase() as CountryCode)?.name_pt || code;
}
