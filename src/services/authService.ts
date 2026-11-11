import { nowIso, supabase } from '@/src/lib/supabase';
import { ServiceResult, User } from '@/src/types';

const mapProfile = (row: Record<string, unknown>): User => ({
  id: String(row.id),
  email: String(row.email ?? ''),
  fullName: String(row.full_name ?? ''),
  displayName: String(row.display_name ?? row.full_name ?? 'Kullanıcı'),
  createdAt: String(row.created_at ?? nowIso()),
});

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

async function fetchSupabaseProfile(userId: string, email?: string): Promise<User> {
  const client = supabase;
  const { data } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (data) return mapProfile(data);
  // Tetikleyici henüz profil oluşturmadıysa minimal profil döndür.
  return mapProfile({ id: userId, email, full_name: email?.split('@')[0] });
}

export const authService = {
  async getCurrentUser(): Promise<User | null> {
    const { data } = await supabase.auth.getSession();
    const sessionUser = data.session?.user;
    return sessionUser ? fetchSupabaseProfile(sessionUser.id, sessionUser.email) : null;
  },

  async signIn(email: string, password: string): Promise<ServiceResult<User>> {
    if (!isValidEmail(email)) return { error: 'Lütfen geçerli bir e-posta adresi girin.' };
    if (!password) return { error: 'Lütfen şifrenizi girin.' };
    const normalized = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({ email: normalized, password });
    if (error || !data.user) return { error: 'E-posta veya şifre hatalı.' };
    return { data: await fetchSupabaseProfile(data.user.id, data.user.email) };
  },

  async signUp(fullName: string, email: string, password: string): Promise<ServiceResult<User | null>> {
    if (fullName.trim().length < 2) return { error: 'Lütfen adınızı girin.' };
    if (!isValidEmail(email)) return { error: 'Lütfen geçerli bir e-posta adresi girin.' };
    if (password.length < 6) return { error: 'Şifre en az 6 karakter olmalı.' };
    const normalized = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: normalized,
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    if (error) return { error: error.message };
    // E-posta doğrulaması açıksa oturum hemen oluşmaz.
    if (!data.session || !data.user) return { data: null };
    return { data: await fetchSupabaseProfile(data.user.id, data.user.email) };
  },

  async resetPassword(email: string): Promise<ServiceResult> {
    if (!isValidEmail(email)) return { error: 'Lütfen geçerli bir e-posta adresi girin.' };
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    return error ? { error: error.message } : {};
  },

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error('Oturum kapatılamadı. Bağlantınızı kontrol edip yeniden deneyin.');
  },

  async updateProfile(userId: string, fullName: string, displayName: string): Promise<ServiceResult<User>> {
    if (fullName.trim().length < 2 || displayName.trim().length < 1)
      return { error: 'Ad alanları boş bırakılamaz.' };

    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), display_name: displayName.trim(), updated_at: nowIso() })
      .eq('id', userId)
      .select('*')
      .single();
    if (error) return { error: error.message };
    return { data: mapProfile(data) };
  },

  async deleteAccount(_userId: string): Promise<ServiceResult> {
    // schema.sql içindeki delete_my_account() fonksiyonu kullanıcıyı ve verilerini siler.
    const client = supabase;
    const { error } = await client.rpc('delete_my_account');
    if (error) return { error: error.message };
    await client.auth.signOut();
    return {};
  },

  onAuthChange(callback: () => void): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Supabase holds its auth lock while invoking listeners. Profile/session
    // queries must run after the listener returns, otherwise sign-in can deadlock.
    const { data } = supabase.auth.onAuthStateChange(() => {
      clearTimeout(timer);
      timer = setTimeout(callback, 0);
    });
    return () => {
      clearTimeout(timer);
      data.subscription.unsubscribe();
    };
  },
};
