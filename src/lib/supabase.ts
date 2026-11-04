import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** .env içinde Supabase bilgileri yoksa uygulama yerel mock modda çalışır. */
export const isMockMode = !supabaseUrl || !supabaseAnonKey;

export const supabase: SupabaseClient | null = isMockMode
  ? null
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

export const requireSupabase = (): SupabaseClient => {
  if (!supabase) throw new Error('Supabase yapılandırılmamış.');
  return supabase;
};
