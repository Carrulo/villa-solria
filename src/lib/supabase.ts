import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  price_per_night: number;
  min_nights: number;
  allowed_checkin_days: number[];
  cleaning_fee: number;
  weekly_discount: number;
  biweekly_discount: number;
  monthly_discount: number;
  mid_stay_cleaning_fee: number;
  mid_stay_cleaning_auto_threshold: number;
  created_at: string;
}

export interface Review {
  id: string;
  guest_name: string;
  country: string;
  rating: number;
  comment: string;
  source: string;
  visible: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  checkin_date: string;
  checkout_date: string;
  num_guests: number;
  message: string | null;
  num_nights: number;
  price_per_night: number | null;
  cleaning_fee: number | null;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  source: string;
  created_at: string;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  created_at: string;
}

export interface Photo {
  id: string;
  filename: string;
  storage_path: string;
  alt_text: string;
  category: string; // 'hero' | 'bedroom' | 'living' | 'kitchen' | 'bathroom' | 'outdoor' | 'view' | 'general'
  sort_order: number;
  is_hero: boolean;
  is_visible: boolean;
  source: 'local' | 'storage';
  width?: number;
  height?: number;
  created_at: string;
}

export const PHOTO_CATEGORIES = [
  'hero', 'bedroom', 'living', 'kitchen', 'bathroom', 'outdoor', 'view', 'general',
] as const;

export type PhotoCategory = typeof PHOTO_CATEGORIES[number];

export const PHOTO_CATEGORY_LABELS: Record<PhotoCategory, string> = {
  hero: 'Capa Principal',
  bedroom: 'Quartos',
  living: 'Sala / Refeições',
  kitchen: 'Cozinha',
  bathroom: 'Casa de Banho',
  outdoor: 'Exterior / Terraço',
  view: 'Vistas',
  general: 'Geral',
};

export function getPhotoUrl(photo: Photo): string {
  if (photo.source === 'storage') {
    return `https://esqkhahcifdtthnvlyos.supabase.co/storage/v1/object/public/property-photos/${photo.storage_path}`;
  }
  return `/images/property/${photo.storage_path}`;
}
