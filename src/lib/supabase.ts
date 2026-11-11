import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { fetchWithTimeout } from '@/src/utils/network';

/**
 * Public Supabase proje ayarları istemci bundle'ına dahil edilir.
 * Anon (public) anahtar istemcide kullanılmak üzere tasarlanmıştır; veriler RLS ile korunur.
 */
export const SUPABASE_URL = 'https://phrfepvdjebxfmfkhiju.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBocmZlcHZkamVieGZtZmtoaWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3NzM4NDYsImV4cCI6MjEwOTM0OTg0Nn0.VlR6CPci9P6UY2sn5QVsjFmX_GnfZIjqpb0YVJCJldk';

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { fetch: fetchWithTimeout },
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const nowIso = () => new Date().toISOString();
