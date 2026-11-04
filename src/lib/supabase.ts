import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Expo Go .env dosyasını okuyamadığı için bağlantı bilgileri bundle'a gömülüdür.
 * Anon (public) anahtar istemcide kullanılmak üzere tasarlanmıştır; veriler RLS ile korunur.
 */
export const SUPABASE_URL = 'https://phrfepvdjebxfmfkhiju.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBocmZlcHZkamVieGZtZmtoaWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3NzM4NDYsImV4cCI6MjEwOTM0OTg0Nn0.VlR6CPci9P6UY2sn5QVsjFmX_GnfZIjqpb0YVJCJldk';

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const nowIso = () => new Date().toISOString();
