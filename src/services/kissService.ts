import { supabase } from '@/src/lib/supabase';

export type KissPeriod = 'morning' | 'evening';

export interface KissRecord {
  id: string;
  ownerId: string;
  partnerId: string;
  coupleId: string;
  localDate: string;
  period: KissPeriod;
  createdAt: string;
}

function toLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getKissPeriod(date: Date = new Date()): KissPeriod {
  return date.getHours() < 12 ? 'morning' : 'evening';
}

function mapKiss(row: Record<string, unknown>): KissRecord {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    partnerId: String(row.partner_id),
    coupleId: String(row.couple_id),
    localDate: String(row.local_date),
    period: row.period === 'morning' ? 'morning' : 'evening',
    createdAt: String(row.created_at),
  };
}

export const kissService = {
  async listToday(ownerId: string, date: Date = new Date()): Promise<KissRecord[]> {
    const { data, error } = await supabase.from('kisses')
      .select('id, owner_id, partner_id, couple_id, local_date, period, created_at')
      .eq('owner_id', ownerId)
      .eq('local_date', toLocalDate(date));
    if (error) throw new Error('Öpücük durumu yüklenemedi. Bağlantınızı kontrol edip yeniden deneyin.');
    return (data ?? []).map((row) => mapKiss(row as Record<string, unknown>));
  },

  async send(input: { ownerId: string; partnerId: string; coupleId: string }, date: Date = new Date()): Promise<KissRecord> {
    const { data, error } = await supabase.from('kisses')
      .insert({
        owner_id: input.ownerId,
        partner_id: input.partnerId,
        couple_id: input.coupleId,
        local_date: toLocalDate(date),
        period: getKissPeriod(date),
      })
      .select('id, owner_id, partner_id, couple_id, local_date, period, created_at')
      .single();
    if (error?.code === '23505') throw new Error('Bu zaman diliminde bugünkü öpücük hakkınızı kullandınız.');
    if (error) throw new Error('Öpücük gönderilemedi. Eşleşmenizi ve bağlantınızı kontrol edin.');
    if (!data) throw new Error('Öpücük gönderilemedi. Lütfen yeniden deneyin.');
    return mapKiss(data as Record<string, unknown>);
  },
};
