import { supabase } from '@/src/lib/supabase';
import { notificationService } from '@/src/services/notificationService';

export interface KissRecord {
  id: string;
  ownerId: string;
  partnerId: string;
  coupleId: string;
  localDate: string;
  createdAt: string;
  senderName?: string;
}

function toLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function mapKiss(row: Record<string, unknown>): KissRecord {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    partnerId: String(row.partner_id),
    coupleId: String(row.couple_id),
    localDate: String(row.local_date),
    createdAt: String(row.created_at),
  };
}

export const kissService = {
  async send(input: { ownerId: string; partnerId: string; coupleId: string }, date: Date = new Date()): Promise<KissRecord> {
    const { data, error } = await supabase.from('kisses')
      .insert({
        owner_id: input.ownerId,
        partner_id: input.partnerId,
        couple_id: input.coupleId,
        local_date: toLocalDate(date),
      })
      .select('id, owner_id, partner_id, couple_id, local_date, created_at')
      .single();
    if (error) throw new Error('Öpücük gönderilemedi. Eşleşmenizi ve bağlantınızı kontrol edin.');
    if (!data) throw new Error('Öpücük gönderilemedi. Lütfen yeniden deneyin.');
    await notificationService.notifyPartner({ partnerId: input.partnerId, coupleId: input.coupleId, title: 'Sana bir öpücük gönderdi', body: 'Partnerin sana bir öpücük gönderdi. 💋' });
    return mapKiss(data as Record<string, unknown>);
  },
};
