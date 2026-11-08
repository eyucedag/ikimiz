import { nowIso, supabase } from '@/src/lib/supabase';
import { CoupleState, Invitation, ServiceResult, User } from '@/src/types';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generateCode = () =>
  Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

const mapInvitation = (row: Record<string, unknown>): Invitation => ({
  id: String(row.id),
  code: String(row.code),
  inviterId: String(row.inviter_id),
  inviterName: String(row.inviter_name ?? ''),
  inviteeId: row.invitee_id == null ? null : String(row.invitee_id),
  status: row.status as Invitation['status'],
  createdAt: String(row.created_at),
});

export const coupleService = {
  async getState(userId: string): Promise<CoupleState> {
    const client = supabase;
    let membership: Record<string, unknown> | null;
    let membershipError: { code?: string; message: string } | null;
    ({ data: membership, error: membershipError } = await client
      .from('couple_members')
      .select('couple_id, couples!inner(id, created_at, ended_at, photo_path, relationship_started_at)')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .is('couples.ended_at', null)
      .maybeSingle());

    // Yeni fotoğraf migration'ı henüz uygulanmadıysa mevcut eşleşme akışını koru.
    if (
      membershipError?.code === '42703' ||
      membershipError?.code === 'PGRST204' ||
      membershipError?.message?.includes('photo_path') ||
      membershipError?.message?.includes('relationship_started_at')
    ) {
      const fallback = await client
        .from('couple_members')
        .select('couple_id, couples!inner(id, created_at, ended_at, photo_path)')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .is('couples.ended_at', null)
        .maybeSingle();
      if (fallback.error?.message?.includes('photo_path')) {
        const older = await client
          .from('couple_members')
          .select('couple_id, couples!inner(id, created_at, ended_at)')
          .eq('user_id', userId)
          .eq('is_deleted', false)
          .is('couples.ended_at', null)
          .maybeSingle();
        membership = older.data;
        membershipError = older.error;
      } else {
        membership = fallback.data;
        membershipError = fallback.error;
      }
    }

    if (membershipError) throw new Error('Eşleşme bilgisi yüklenemedi. Bağlantınızı kontrol edin.');

    const { data: pending, error: pendingError } = await client
      .from('invitations')
      .select('*')
      .eq('inviter_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingError) throw new Error('Davet bilgisi yüklenemedi.');
    if (!membership)
      return { couple: null, partner: null, pendingInvitation: pending ? mapInvitation(pending) : null };

    const { data: members, error: membersError } = await client
      .from('couple_members')
      .select('user_id')
      .eq('couple_id', membership.couple_id)
      .eq('is_deleted', false);
    if (membersError) throw new Error('Partner bilgisi yüklenemedi.');
    const memberIds = (members ?? []).map((m: Record<string, unknown>) => String(m.user_id));
    const partnerId = memberIds.find((id) => id !== userId);
    let partner: User | null = null;
    if (partnerId) {
      const { data: p, error: profileError } = await client
        .from('profiles')
        .select('*')
        .eq('id', partnerId)
        .maybeSingle();
      if (profileError) throw new Error('Partner profili yüklenemedi.');
      if (p)
        partner = {
          id: p.id,
          email: p.email,
          fullName: p.full_name,
          displayName: p.display_name,
          createdAt: p.created_at,
        };
    }
    const c = (Array.isArray(membership.couples) ? membership.couples[0] : membership.couples) as Record<
      string,
      unknown
    >;
    const photoPath = typeof c?.photo_path === 'string' ? c.photo_path : null;
    let photoUrl: string | null = null;
    if (photoPath) {
      const { data: signedPhoto } = await client.storage
        .from('couple-photos')
        .createSignedUrl(photoPath, 60 * 60 * 24 * 7);
      photoUrl = signedPhoto?.signedUrl ?? null;
    }
    return {
      couple: {
        id: String(membership.couple_id),
        memberIds,
        createdAt: String(c?.created_at ?? nowIso()),
        endedAt: null,
        photoPath,
        photoUrl,
        relationshipStartedAt:
          typeof c?.relationship_started_at === 'string' ? c.relationship_started_at : null,
      },
      partner,
      pendingInvitation: pending ? mapInvitation(pending) : null,
    };
  },

  async createInvitation(user: User): Promise<ServiceResult<Invitation>> {
    const client = supabase;
    await client
      .from('invitations')
      .update({ status: 'cancelled', updated_at: nowIso() })
      .eq('inviter_id', user.id)
      .eq('status', 'pending');
    const { data, error } = await client
      .from('invitations')
      .insert({
        inviter_id: user.id,
        owner_id: user.id,
        inviter_name: user.displayName,
        code: generateCode(),
        status: 'pending',
      })
      .select('*')
      .single();
    if (error) return { error: error.message };
    return { data: mapInvitation(data) };
  },

  async acceptInvitation(_userId: string, rawCode: string): Promise<ServiceResult> {
    const code = rawCode.trim().toUpperCase();
    if (code.length !== 6) return { error: 'Davet kodu 6 karakter olmalı.' };

    // Güvenlik için kabul işlemi sunucu tarafındaki accept_invitation() fonksiyonuyla yapılır.
    const { error } = await supabase.rpc('accept_invitation', { p_code: code });
    return error ? { error: error.message } : {};
  },

  async rejectInvitation(rawCode: string): Promise<ServiceResult> {
    const code = rawCode.trim().toUpperCase();
    const { error } = await supabase.rpc('reject_invitation', { p_code: code });
    return error ? { error: error.message } : {};
  },

  async cancelInvitation(userId: string): Promise<ServiceResult> {
    const { error } = await supabase
      .from('invitations')
      .update({ status: 'cancelled', updated_at: nowIso() })
      .eq('inviter_id', userId)
      .eq('status', 'pending');
    return error ? { error: error.message } : {};
  },

  async endCouple(_userId: string): Promise<ServiceResult> {
    const { error } = await supabase.rpc('end_couple');
    return error ? { error: error.message } : {};
  },

  async setRelationshipStartedAt(startedAt: string): Promise<ServiceResult> {
    const { error } = await supabase.rpc('set_relationship_started_at', { p_started_at: startedAt });
    return error ? { error: error.message } : {};
  },
};
