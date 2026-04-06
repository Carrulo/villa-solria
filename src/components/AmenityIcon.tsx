import { LucideIcon } from 'lucide-react';

interface AmenityIconProps {
  icon: LucideIcon;
  label: string;
}

export default function AmenityIcon({ icon: Icon, label }: AmenityIconProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-primary/5 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon size={20} className="text-primary" />
      </div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </div>
  );
}
