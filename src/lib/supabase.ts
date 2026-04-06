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
  allowed_checkin_days: string[];
  cleaning_fee: number;
  weekly_discount: number;
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
  check_in: string;
  check_out: string;
  guests: number;
  message: string | null;
  nights: number;
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
