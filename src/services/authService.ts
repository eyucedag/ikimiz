import { createId, mockStore, nowIso } from '@/src/lib/mock-store';
import { isMockMode, requireSupabase } from '@/src/lib/supabase';
import { ServiceResult, User } from '@/src/types';

const TEST_EMAIL = 'test@ikimiz.app';

const mapProfile = (row: any): User => ({
  id: row.id,
  email: row.email ?? '',
  fullName: row.full_name ?? '',
  displayName: row.display_name ?? row.full_name ?? 'Kullanıcı',
  createdAt: row.created_at ?? nowIso(),
});

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

async function fetchSupabaseProfile(userId: string, email?: string): Promise<User> {
  const client = requireSupabase();
  const { data } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (data) return mapProfile(data);
  // Tetikleyici henüz profil oluşturmadıysa minimal profil döndür.
  return mapProfile({ id: userId, email, full_name: email?.split('@')[0] });
}

export const authService = {
  isMockMode,

  async getCurrentUser(): Promise<User | null> {
    if (isMockMode) {
      const db = await mockStore.read();
      return db.users.find((u) => u.id === db.currentUserId) ?? null;
    }
    const { data } = await requireSupabase().auth.getSession();
    const sessionUser = data.session?.user;
    return sessionUser ? fetchSupabaseProfile(sessionUser.id, sessionUser.email) : null;
  },

  async signIn(email: string, password: string): Promise<ServiceResult<User>> {
    if (!isValidEmail(email)) return { error: 'Lütfen geçerli bir e-posta adresi girin.' };
    if (!password) return { error: 'Lütfen şifrenizi girin.' };
    const normalized = email.trim().toLowerCase();

    if (isMockMode) {
      return mockStore.update((db) => {
        const user = db.users.find((u) => u.email === normalized);
        if (!user || db.passwords[user.id] !== password) return { error: 'E-posta veya şifre hatalı.' };
        db.currentUserId = user.id;
        return { data: user };
      });
    }

    const { data, error } = await requireSupabase().auth.signInWithPassword({ email: normalized, password });
    if (error || !data.user) return { error: 'E-posta veya şifre hatalı.' };
    return { data: await fetchSupabaseProfile(data.user.id, data.user.email) };
  },

  async signUp(fullName: string, email: string, password: string): Promise<ServiceResult<User | null>> {
    if (fullName.trim().length < 2) return { error: 'Lütfen adınızı girin.' };
    if (!isValidEmail(email)) return { error: 'Lütfen geçerli bir e-posta adresi girin.' };
    if (password.length < 6) return { error: 'Şifre en az 6 karakter olmalı.' };
    const normalized = email.trim().toLowerCase();

    if (isMockMode) {
      return mockStore.update((db) => {
        if (db.users.some((u) => u.email === normalized)) return { error: 'Bu e-posta ile kayıtlı bir hesap zaten var.' };
        const user: User = {
          id: createId(),
          email: normalized,
          fullName: fullName.trim(),
          displayName: fullName.trim().split(' ')[0],
          createdAt: nowIso(),
        };
        db.users.push(user);
        db.passwords[user.id] = password;
        db.currentUserId = user.id;
        return { data: user };
      });
    }

    const { data, error } = await requireSupabase().auth.signUp({
      email: normalized,
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    if (error) return { error: error.message };
    // E-posta doğrulaması açıksa oturum hemen oluşmaz.
    if (!data.session || !data.user) return { data: null };
    return { data: await fetchSupabaseProfile(data.user.id, data.user.email) };
  },

  /** Yalnızca mock modda: kayıt olmadan test kullanıcısıyla giriş. */
  async signInAsTestUser(): Promise<ServiceResult<User>> {
    if (!isMockMode) return { error: 'Test kullanıcısı yalnızca mock modda kullanılabilir.' };
    return mockStore.update((db) => {
      let user = db.users.find((u) => u.email === TEST_EMAIL);
      if (!user) {
        user = { id: createId(), email: TEST_EMAIL, fullName: 'Test Kullanıcısı', displayName: 'Test', createdAt: nowIso() };
        db.users.push(user);
        db.passwords[user.id] = '123456';
      }
      db.currentUserId = user.id;
      return { data: user };
    });
  },

  async resetPassword(email: string): Promise<ServiceResult> {
    if (!isValidEmail(email)) return { error: 'Lütfen geçerli bir e-posta adresi girin.' };
    if (isMockMode) return {};
    const { error } = await requireSupabase().auth.resetPasswordForEmail(email.trim().toLowerCase());
    return error ? { error: error.message } : {};
  },

  async signOut(): Promise<void> {
    if (isMockMode) {
      await mockStore.update((db) => {
        db.currentUserId = null;
      });
      return;
    }
    await requireSupabase().auth.signOut();
  },

  async updateProfile(userId: string, fullName: string, displayName: string): Promise<ServiceResult<User>> {
    if (fullName.trim().length < 2 || displayName.trim().length < 1) return { error: 'Ad alanları boş bırakılamaz.' };

    if (isMockMode) {
      return mockStore.update((db) => {
        const user = db.users.find((u) => u.id === userId);
        if (!user) return { error: 'Kullanıcı bulunamadı.' };
        user.fullName = fullName.trim();
        user.displayName = displayName.trim();
        return { data: { ...user } };
      });
    }

    const { data, error } = await requireSupabase()
      .from('profiles')
      .update({ full_name: fullName.trim(), display_name: displayName.trim(), updated_at: nowIso() })
      .eq('id', userId)
      .select('*')
      .single();
    if (error) return { error: error.message };
    return { data: mapProfile(data) };
  },

  async deleteAccount(userId: string): Promise<ServiceResult> {
    if (isMockMode) {
      await mockStore.update((db) => {
        db.users = db.users.filter((u) => u.id !== userId);
        delete db.passwords[userId];
        db.couples = db.couples.filter((c) => !c.memberIds.includes(userId));
        db.invitations = db.invitations.filter((i) => i.inviterId !== userId);
        db.screenNotes = db.screenNotes.filter((n) => n.senderId !== userId && n.receiverId !== userId);
        db.notifications = db.notifications.filter((n) => n.userId !== userId);
        db.currentUserId = null;
      });
      return {};
    }
    // schema.sql içindeki delete_my_account() fonksiyonu kullanıcıyı ve verilerini siler.
    const client = requireSupabase();
    const { error } = await client.rpc('delete_my_account');
    if (error) return { error: error.message };
    await client.auth.signOut();
    return {};
  },

  onAuthChange(callback: () => void): () => void {
    if (isMockMode) return () => undefined;
    const { data } = requireSupabase().auth.onAuthStateChange(() => callback());
    return () => data.subscription.unsubscribe();
  },
};
