import { addMockNotification, createId, MockDB, mockStore, nowIso } from '@/src/lib/mock-store';
import { isMockMode, requireSupabase } from '@/src/lib/supabase';
import { Couple, CoupleState, Invitation, ServiceResult, User } from '@/src/types';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generateCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

const activeCoupleOf = (db: MockDB, userId: string) => db.couples.find((c) => !c.endedAt && c.memberIds.includes(userId)) ?? null;

const mapInvitation = (row: any): Invitation => ({
  id: row.id,
  code: row.code,
  inviterId: row.inviter_id,
  inviterName: row.inviter_name ?? '',
  inviteeId: row.invitee_id,
  status: row.status,
  createdAt: row.created_at,
});

function mockAccept(db: MockDB, invitation: Invitation, inviteeId: string): ServiceResult<Couple> {
  if (invitation.inviterId === inviteeId) return { error: 'Kendi davet kodunuzu kabul edemezsiniz.' };
  if (activeCoupleOf(db, invitation.inviterId) || activeCoupleOf(db, inviteeId)) {
    return { error: 'Taraflardan biri zaten bir eşleşmeye sahip.' };
  }
  const couple: Couple = { id: createId(), memberIds: [invitation.inviterId, inviteeId], createdAt: nowIso(), endedAt: null };
  db.couples.push(couple);
  invitation.status = 'accepted';
  invitation.inviteeId = inviteeId;
  const invitee = db.users.find((u) => u.id === inviteeId);
  addMockNotification(db, invitation.inviterId, 'couple', 'Eşleşme tamamlandı', `${invitee?.displayName ?? 'Partneriniz'} davetinizi kabul etti.`);
  addMockNotification(db, inviteeId, 'couple', 'Eşleşme tamamlandı', `${invitation.inviterName} ile artık ortak alanınızı kullanabilirsiniz.`);
  return { data: couple };
}

export const coupleService = {
  async getState(userId: string): Promise<CoupleState> {
    if (isMockMode) {
      const db = await mockStore.read();
      const couple = activeCoupleOf(db, userId);
      const partnerId = couple?.memberIds.find((id) => id !== userId);
      return {
        couple,
        partner: db.users.find((u) => u.id === partnerId) ?? null,
        pendingInvitation: db.invitations.find((i) => i.inviterId === userId && i.status === 'pending') ?? null,
      };
    }

    const client = requireSupabase();
    const { data: membership } = await client
      .from('couple_members')
      .select('couple_id, couples!inner(id, created_at, ended_at)')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .is('couples.ended_at', null)
      .maybeSingle();

    const { data: pending } = await client
      .from('invitations')
      .select('*')
      .eq('inviter_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!membership) return { couple: null, partner: null, pendingInvitation: pending ? mapInvitation(pending) : null };

    const { data: members } = await client.from('couple_members').select('user_id').eq('couple_id', membership.couple_id);
    const memberIds = (members ?? []).map((m: any) => m.user_id as string);
    const partnerId = memberIds.find((id) => id !== userId);
    let partner: User | null = null;
    if (partnerId) {
      const { data: p } = await client.from('profiles').select('*').eq('id', partnerId).maybeSingle();
      if (p) partner = { id: p.id, email: p.email, fullName: p.full_name, displayName: p.display_name, createdAt: p.created_at };
    }
    const c: any = (membership as any).couples;
    return {
      couple: { id: membership.couple_id, memberIds, createdAt: c?.created_at ?? nowIso(), endedAt: null },
      partner,
      pendingInvitation: pending ? mapInvitation(pending) : null,
    };
  },

  async createInvitation(user: User): Promise<ServiceResult<Invitation>> {
    if (isMockMode) {
      return mockStore.update((db) => {
        if (activeCoupleOf(db, user.id)) return { error: 'Zaten bir partnerle eşleşmişsiniz.' };
        db.invitations.forEach((i) => {
          if (i.inviterId === user.id && i.status === 'pending') i.status = 'cancelled';
        });
        const invitation: Invitation = {
          id: createId(),
          code: generateCode(),
          inviterId: user.id,
          inviterName: user.displayName,
          inviteeId: null,
          status: 'pending',
          createdAt: nowIso(),
        };
        db.invitations.push(invitation);
        return { data: invitation };
      });
    }

    const client = requireSupabase();
    await client.from('invitations').update({ status: 'cancelled', updated_at: nowIso() }).eq('inviter_id', user.id).eq('status', 'pending');
    const { data, error } = await client
      .from('invitations')
      .insert({ inviter_id: user.id, owner_id: user.id, inviter_name: user.displayName, code: generateCode(), status: 'pending' })
      .select('*')
      .single();
    if (error) return { error: error.message };
    return { data: mapInvitation(data) };
  },

  async acceptInvitation(userId: string, rawCode: string): Promise<ServiceResult> {
    const code = rawCode.trim().toUpperCase();
    if (code.length !== 6) return { error: 'Davet kodu 6 karakter olmalı.' };

    if (isMockMode) {
      return mockStore.update((db) => {
        const invitation = db.invitations.find((i) => i.code === code && i.status === 'pending');
        if (!invitation) return { error: 'Bu koda ait geçerli bir davet bulunamadı.' };
        const result = mockAccept(db, invitation, userId);
        return result.error ? { error: result.error } : {};
      });
    }
    // Güvenlik için kabul işlemi sunucu tarafındaki accept_invitation() fonksiyonuyla yapılır.
    const { error } = await requireSupabase().rpc('accept_invitation', { p_code: code });
    return error ? { error: error.message } : {};
  },

  async rejectInvitation(rawCode: string): Promise<ServiceResult> {
    const code = rawCode.trim().toUpperCase();
    if (isMockMode) {
      return mockStore.update((db) => {
        const invitation = db.invitations.find((i) => i.code === code && i.status === 'pending');
        if (!invitation) return { error: 'Bu koda ait geçerli bir davet bulunamadı.' };
        invitation.status = 'rejected';
        addMockNotification(db, invitation.inviterId, 'invitation', 'Davet reddedildi', 'Gönderdiğiniz davet reddedildi.');
        return {};
      });
    }
    const { error } = await requireSupabase().rpc('reject_invitation', { p_code: code });
    return error ? { error: error.message } : {};
  },

  async cancelInvitation(userId: string): Promise<ServiceResult> {
    if (isMockMode) {
      await mockStore.update((db) => {
        db.invitations.forEach((i) => {
          if (i.inviterId === userId && i.status === 'pending') i.status = 'cancelled';
        });
      });
      return {};
    }
    const { error } = await requireSupabase()
      .from('invitations')
      .update({ status: 'cancelled', updated_at: nowIso() })
      .eq('inviter_id', userId)
      .eq('status', 'pending');
    return error ? { error: error.message } : {};
  },

  async endCouple(userId: string): Promise<ServiceResult> {
    if (isMockMode) {
      return mockStore.update((db) => {
        const couple = activeCoupleOf(db, userId);
        if (!couple) return { error: 'Aktif bir eşleşme bulunamadı.' };
        couple.endedAt = nowIso();
        const partnerId = couple.memberIds.find((id) => id !== userId);
        if (partnerId) addMockNotification(db, partnerId, 'couple', 'Eşleşme sonlandırıldı', 'Ortak alan erişimi kapatıldı.');
        return {};
      });
    }
    const { error } = await requireSupabase().rpc('end_couple');
    return error ? { error: error.message } : {};
  },

  /**
   * Yalnızca mock mod: tek cihazda test edebilmek için demo partnerin daveti
   * kabul etmesini ve bir karşılama notu bırakmasını simüle eder.
   */
  async simulatePartnerAccept(userId: string): Promise<ServiceResult> {
    if (!isMockMode) return { error: 'Simülasyon yalnızca mock modda kullanılabilir.' };
    return mockStore.update((db) => {
      const invitation = db.invitations.find((i) => i.inviterId === userId && i.status === 'pending');
      if (!invitation) return { error: 'Önce bir davet kodu oluşturun.' };
      const partner: User = {
        id: createId(),
        email: `demo.partner.${invitation.code.toLowerCase()}@ikimiz.app`,
        fullName: 'Deniz (Demo Partner)',
        displayName: 'Deniz',
        createdAt: nowIso(),
      };
      db.users.push(partner);
      const result = mockAccept(db, invitation, partner.id);
      if (result.error || !result.data) return { error: result.error };
      db.screenNotes.unshift({
        id: createId(),
        coupleId: result.data.id,
        senderId: partner.id,
        receiverId: userId,
        text: 'Merhaba! Artık ortak alanımız hazır.',
        emoji: '🌿',
        backgroundColor: '#E8F0E6',
        createdAt: nowIso(),
      });
      addMockNotification(db, userId, 'screen_note', 'Yeni ekran notu', '🌿 Merhaba! Artık ortak alanımız hazır.');
      return {};
    });
  },
};
