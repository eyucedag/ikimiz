import { supabase } from '@/src/lib/supabase';

export interface CoupleFlowerState {
  health: number;
  updatedAt: string;
  lastWateredAt: string | null;
}

function mapState(value: unknown): CoupleFlowerState {
  const row = (Array.isArray(value) ? value[0] : value) as Record<string, unknown> | null;
  if (!row) throw new Error('Çiçek durumu bulunamadı.');
  return {
    health: Math.max(0, Math.min(100, Number(row.health) || 0)),
    updatedAt: String(row.updated_at),
    lastWateredAt: typeof row.last_watered_at === 'string' ? row.last_watered_at : null,
  };
}

function setupError(message: string): Error {
  if (message.includes('get_couple_flower_state') || message.includes('water_couple_flower') || message.includes('couple_flower_state')) {
    return new Error('Ortak çiçek kurulumu eksik. Supabase SQL Editor’da 20261107_shared_couple_flower.sql dosyasını çalıştırın.');
  }
  return new Error(message || 'Çiçek güncellenemedi. Bağlantınızı kontrol edip yeniden deneyin.');
}

export function flowerHealthNow(state: CoupleFlowerState, now = Date.now()): number {
  const elapsedDays = Math.max(0, (now - new Date(state.updatedAt).getTime()) / 86_400_000);
  return Math.max(0, Math.min(100, state.health - Math.floor(elapsedDays * 12)));
}

export const coupleFlowerService = {
  async get(coupleId: string): Promise<CoupleFlowerState> {
    const { data, error } = await supabase.rpc('get_couple_flower_state', { p_couple_id: coupleId });
    if (error) throw setupError(error.message);
    return mapState(data);
  },

  async water(coupleId: string): Promise<CoupleFlowerState> {
    const { data, error } = await supabase.rpc('water_couple_flower', { p_couple_id: coupleId });
    if (error) throw setupError(error.message);
    return mapState(data);
  },
};
