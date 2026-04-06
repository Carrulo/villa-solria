interface PhotoPlaceholderProps {
  label: string;
  className?: string;
  gradient?: string;
  onClick?: () => void;
}

const gradients = [
  'from-primary/30 to-accent/20',
  'from-sand/40 to-primary/20',
  'from-accent/20 to-sand/30',
  'from-primary/20 to-sand/40',
  'from-sand/30 to-accent/20',
  'from-accent/30 to-primary/20',
];

export default function PhotoPlaceholder({ label, className = '', gradient, onClick }: PhotoPlaceholderProps) {
  const hash = label.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const bg = gradient || gradients[hash % gradients.length];

  return (
    <div
      onClick={onClick}
      className={`bg-gradient-to-br ${bg} rounded-2xl flex items-center justify-center ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''} ${className}`}
    >
      <span className="text-primary/60 font-medium text-sm text-center px-4">{label}</span>
    </div>
  );
}
