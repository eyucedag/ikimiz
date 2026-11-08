import { supabase } from '@/src/lib/supabase';

export type CouplePlantType = 'hanging' | 'cactus' | 'violet';

export interface CoupleFlowerState {
  health: number;
  updatedAt: string;
  lastWateredAt: string | null;
  plantType: CouplePlantType;
}

function mapState(value: unknown, fallbackPlantType: CouplePlantType = 'hanging'): CoupleFlowerState {
  const row = (Array.isArray(value) ? value[0] : value) as Record<string, unknown> | null;
  if (!row) throw new Error('Çiçek durumu bulunamadı.');
  return {
    health: Math.max(0, Math.min(100, Number(row.health) || 0)),
    updatedAt: String(row.updated_at),
    lastWateredAt: typeof row.last_watered_at === 'string' ? row.last_watered_at : null,
    plantType:
      row.plant_type === 'cactus' || row.plant_type === 'violet' || row.plant_type === 'hanging'
        ? row.plant_type
        : fallbackPlantType,
  };
}

function setupError(message: string): Error {
  if (message.includes('set_couple_flower_plant') || message.includes('plant_type')) {
    return new Error(
      'Bitki seçenekleri için Supabase SQL Editor’da 20261107_couple_flower_plant_types.sql dosyasını çalıştırın.',
    );
  }
  if (
    message.includes('get_couple_flower_state') ||
    message.includes('water_couple_flower') ||
    message.includes('couple_flower_state')
  ) {
    return new Error(
      'Ortak çiçek kurulumu eksik. Supabase SQL Editor’da 20261107_shared_couple_flower.sql dosyasını çalıştırın.',
    );
  }
  return new Error(message || 'Çiçek güncellenemedi. Bağlantınızı kontrol edip yeniden deneyin.');
}

export function flowerHealthNow(state: CoupleFlowerState, now = Date.now()): number {
  const elapsed = now - new Date(state.updatedAt).getTime();
  const elapsedDays = Number.isFinite(elapsed) ? Math.max(0, elapsed / 86_400_000) : 0;
  const decayPerDay = state.plantType === 'cactus' ? 1 : state.plantType === 'violet' ? 6 : 9;
  return Math.max(0, Math.min(100, state.health - Math.floor(elapsedDays * decayPerDay)));
}

export const coupleFlowerService = {
  async get(coupleId: string): Promise<CoupleFlowerState> {
    const { data, error } = await supabase.rpc('get_couple_flower_state', { p_couple_id: coupleId });
    if (error) throw setupError(error.message);
    const { data: plant, error: plantError } = await supabase
      .from('couple_flower_state')
      .select('plant_type')
      .eq('couple_id', coupleId)
      .maybeSingle();
    if (plantError && plantError.code !== '42703') throw setupError(plantError.message);
    return mapState(
      data,
      plant?.plant_type === 'cactus' || plant?.plant_type === 'violet' ? plant.plant_type : 'hanging',
    );
  },

  async setPlant(coupleId: string, plantType: CouplePlantType): Promise<CoupleFlowerState> {
    const { data, error } = await supabase.rpc('set_couple_flower_plant', {
      p_couple_id: coupleId,
      p_plant_type: plantType,
    });
    if (error) throw setupError(error.message);
    return mapState(data, plantType);
  },

  async water(coupleId: string): Promise<CoupleFlowerState> {
    const { data, error } = await supabase.rpc('water_couple_flower', { p_couple_id: coupleId });
    if (error) throw setupError(error.message);
    return mapState(data);
  },
};
