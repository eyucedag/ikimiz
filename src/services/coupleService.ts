import { nowIso, supabase } from '@/src/lib/supabase';
import { CoupleState, Invitation, ServiceResult, User } from '@/src/types';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generateCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

const mapInvitation = (row: any): Invitation => ({
  id: row.id,
  code: row.code,
  inviterId: row.inviter_id,
  inviterName: row.inviter_name ?? '',
  inviteeId: row.invitee_id,
  status: row.status,
  createdAt: row.created_at,
});

export const coupleService = {
  async getState(userId: string): Promise<CoupleState> {

    const client = supabase;
    let membership: any;
    let membershipError: any;
    ({ data: membership, error: membershipError } = await client
      .from('couple_members')
      .select('couple_id, couples!inner(id, created_at, ended_at, photo_path)')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .is('couples.ended_at', null)
      .maybeSingle());

    // Yeni fotoğraf migration'ı henüz uygulanmadıysa mevcut eşleşme akışını koru.
    if (membershipError?.code === '42703' || membershipError?.code === 'PGRST204' || membershipError?.message?.includes('photo_path')) {
      const fallback = await client.from('couple_members')
        .select('couple_id, couples!inner(id, created_at, ended_at)')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .is('couples.ended_at', null)
        .maybeSingle();
      membership = fallback.data;
      membershipError = fallback.error;
    }

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
    const photoPath = typeof c?.photo_path === 'string' ? c.photo_path : null;
    let photoUrl: string | null = null;
    if (photoPath) {
      const { data: signedPhoto } = await client.storage.from('couple-photos').createSignedUrl(photoPath, 60 * 60 * 24 * 7);
      photoUrl = signedPhoto?.signedUrl ?? null;
    }
    return {
      couple: { id: membership.couple_id, memberIds, createdAt: c?.created_at ?? nowIso(), endedAt: null, photoPath, photoUrl },
      partner,
      pendingInvitation: pending ? mapInvitation(pending) : null,
    };
  },

  async createInvitation(user: User): Promise<ServiceResult<Invitation>> {

    const client = supabase;
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

  async endCouple(userId: string): Promise<ServiceResult> {
    const { error } = await supabase.rpc('end_couple');
    return error ? { error: error.message } : {};
  },
};
