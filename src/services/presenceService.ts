import { supabase } from '@/src/lib/supabase';

export interface CoupleLocation {
  userId: string;
  coupleId: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  updatedAt: string;
}

export interface CoupleSteps {
  userId: string;
  coupleId: string;
  localDate: string;
  steps: number;
}

export const presenceService = {
  async locations(coupleId: string): Promise<CoupleLocation[]> {
    const { data, error } = await supabase.from('couple_live_locations').select('*').eq('couple_id', coupleId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => ({ userId: row.user_id, coupleId: row.couple_id, latitude: Number(row.latitude), longitude: Number(row.longitude), heading: row.heading == null ? null : Number(row.heading), updatedAt: row.updated_at }));
  },
  async updateLocation(location: Omit<CoupleLocation, 'updatedAt'>): Promise<void> {
    const { error } = await supabase.from('couple_live_locations').upsert({
      user_id: location.userId, couple_id: location.coupleId, latitude: location.latitude,
      longitude: location.longitude, heading: location.heading, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (error) throw new Error(error.message);
  },
  async clearLocation(userId: string): Promise<void> {
    await supabase.from('couple_live_locations').delete().eq('user_id', userId);
  },
  async steps(coupleId: string, localDate: string): Promise<CoupleSteps[]> {
    const { data, error } = await supabase.from('couple_daily_steps').select('*').eq('couple_id', coupleId).eq('local_date', localDate);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => ({ userId: row.user_id, coupleId: row.couple_id, localDate: row.local_date, steps: Number(row.steps) }));
  },
  async saveSteps(coupleId: string, userId: string, localDate: string, steps: number): Promise<void> {
    const { error } = await supabase.from('couple_daily_steps').upsert({ couple_id: coupleId, user_id: userId, local_date: localDate, steps }, { onConflict: 'user_id,local_date' });
    if (error) throw new Error(error.message);
  },
  channel(coupleId: string, table: 'couple_live_locations' | 'couple_daily_steps', callback: () => void) {
    // A channel name is immutable after subscribe(); give each screen instance its own topic.
    const instanceId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return supabase.channel(`${table}-${coupleId}-${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter: `couple_id=eq.${coupleId}` }, callback)
      .subscribe();
  },
};

export function bearingBetween(from: Pick<CoupleLocation, 'latitude' | 'longitude'>, to: Pick<CoupleLocation, 'latitude' | 'longitude'>) {
  const rad = Math.PI / 180;
  const lat1 = from.latitude * rad;
  const lat2 = to.latitude * rad;
  const deltaLon = (to.longitude - from.longitude) * rad;
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
