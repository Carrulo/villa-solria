import { Star, Quote } from 'lucide-react';

interface ReviewCardProps {
  name: string;
  country: string;
  text: string;
  rating: string;
}

export default function ReviewCard({ name, country, text, rating }: ReviewCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <Quote size={24} className="text-sand/40" />
        <div className="flex items-center gap-1 bg-accent/10 px-3 py-1 rounded-full">
          <Star size={14} className="text-accent fill-accent" />
          <span className="text-sm font-semibold text-accent">{rating}</span>
        </div>
      </div>
      <p className="text-gray-600 leading-relaxed mb-6 text-sm lg:text-base">{text}</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
          <span className="text-primary font-semibold text-sm">{name[0]}</span>
        </div>
        <div>
          <p className="font-medium text-gray-900 text-sm">{name}</p>
          <p className="text-gray-400 text-xs">{country}</p>
        </div>
      </div>
    </div>
  );
}
