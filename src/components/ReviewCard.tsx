import { Star, Quote } from 'lucide-react';

const COUNTRY_FLAGS: Record<string, string> = {
  portugal: '\u{1F1F5}\u{1F1F9}',
  alemanha: '\u{1F1E9}\u{1F1EA}',
  germany: '\u{1F1E9}\u{1F1EA}',
  deutschland: '\u{1F1E9}\u{1F1EA}',
  eua: '\u{1F1FA}\u{1F1F8}',
  usa: '\u{1F1FA}\u{1F1F8}',
  'united states': '\u{1F1FA}\u{1F1F8}',
  'estados unidos': '\u{1F1FA}\u{1F1F8}',
  'españa': '\u{1F1EA}\u{1F1F8}',
  spain: '\u{1F1EA}\u{1F1F8}',
  spanien: '\u{1F1EA}\u{1F1F8}',
  espanha: '\u{1F1EA}\u{1F1F8}',
  france: '\u{1F1EB}\u{1F1F7}',
  'frança': '\u{1F1EB}\u{1F1F7}',
  uk: '\u{1F1EC}\u{1F1E7}',
  england: '\u{1F1EC}\u{1F1E7}',
  'united kingdom': '\u{1F1EC}\u{1F1E7}',
  'reino unido': '\u{1F1EC}\u{1F1E7}',
  inglaterra: '\u{1F1EC}\u{1F1E7}',
  netherlands: '\u{1F1F3}\u{1F1F1}',
  holanda: '\u{1F1F3}\u{1F1F1}',
  'países baixos': '\u{1F1F3}\u{1F1F1}',
  'paises baixos': '\u{1F1F3}\u{1F1F1}',
  belgium: '\u{1F1E7}\u{1F1EA}',
  'bélgica': '\u{1F1E7}\u{1F1EA}',
  belgica: '\u{1F1E7}\u{1F1EA}',
  italy: '\u{1F1EE}\u{1F1F9}',
  'itália': '\u{1F1EE}\u{1F1F9}',
  italia: '\u{1F1EE}\u{1F1F9}',
  brasil: '\u{1F1E7}\u{1F1F7}',
  brazil: '\u{1F1E7}\u{1F1F7}',
  ireland: '\u{1F1EE}\u{1F1EA}',
  irlanda: '\u{1F1EE}\u{1F1EA}',
  switzerland: '\u{1F1E8}\u{1F1ED}',
  'suíça': '\u{1F1E8}\u{1F1ED}',
  suica: '\u{1F1E8}\u{1F1ED}',
};

function getCountryFlag(country: string): string {
  return COUNTRY_FLAGS[country.toLowerCase().trim()] || '\u{1F30D}';
}

interface ReviewCardProps {
  name: string;
  country: string;
  text: string;
  rating: string;
  source?: string;
}

export default function ReviewCard({ name, country, text, rating, source }: ReviewCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <Quote size={24} className="text-sand/40" />
        <div className="flex items-center gap-2">
          {source && (
            <span className="text-xs text-gray-400 font-medium">{source}</span>
          )}
          <div className="flex items-center gap-1 bg-accent/10 px-3 py-1 rounded-full">
            <Star size={14} className="text-accent fill-accent" />
            <span className="text-sm font-semibold text-accent">{rating}</span>
          </div>
        </div>
      </div>
      <p className="text-gray-600 leading-relaxed mb-6 text-sm lg:text-base">{text}</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
          <span className="text-primary font-semibold text-sm">{name[0]}</span>
        </div>
        <div>
          <p className="font-medium text-gray-900 text-sm">{name}</p>
          <p className="text-gray-400 text-xs">{getCountryFlag(country)} {country}</p>
        </div>
      </div>
    </div>
  );
}
