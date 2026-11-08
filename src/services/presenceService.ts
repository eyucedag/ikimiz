import { supabase } from '@/src/lib/supabase';

export interface CoupleLocation {
  userId: string;
  coupleId: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  updatedAt: string;
  directionEnabled: boolean;
}

export interface CoupleSteps {
  userId: string;
  coupleId: string;
  localDate: string;
  steps: number;
}

export const presenceService = {
  async locations(coupleId: string): Promise<CoupleLocation[]> {
    const { data, error } = await supabase
      .from('couple_live_locations')
      .select('*')
      .eq('couple_id', coupleId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: Record<string, unknown>) => ({
      userId: String(row.user_id),
      coupleId: String(row.couple_id),
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      heading: row.heading == null ? null : Number(row.heading),
      updatedAt: String(row.updated_at),
      directionEnabled: row.direction_enabled === true,
    }));
  },
  async updateLocation(
    location: Omit<CoupleLocation, 'updatedAt' | 'directionEnabled'> & { directionEnabled?: boolean },
  ): Promise<void> {
    const values: Record<string, unknown> = {
      user_id: location.userId,
      couple_id: location.coupleId,
      latitude: location.latitude,
      longitude: location.longitude,
      heading: location.heading,
      updated_at: new Date().toISOString(),
    };
    if (location.directionEnabled !== undefined) values.direction_enabled = location.directionEnabled;
    const { error } = await supabase.from('couple_live_locations').upsert(values, { onConflict: 'user_id' });
    if (error) throw new Error(error.message);
  },
  async clearLocation(userId: string, coupleId: string): Promise<void> {
    const { error } = await supabase
      .from('couple_live_locations')
      .delete()
      .eq('user_id', userId)
      .eq('couple_id', coupleId);
    if (error) throw new Error(error.message);
  },
  async steps(coupleId: string, localDate?: string): Promise<CoupleSteps[]> {
    let query = supabase.from('couple_daily_steps').select('*').eq('couple_id', coupleId);
    if (localDate) query = query.eq('local_date', localDate);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: Record<string, unknown>) => ({
      userId: String(row.user_id),
      coupleId: String(row.couple_id),
      localDate: String(row.local_date),
      steps: Number(row.steps),
    }));
  },
  async saveSteps(coupleId: string, userId: string, localDate: string, steps: number): Promise<void> {
    const { error } = await supabase
      .from('couple_daily_steps')
      .upsert(
        { couple_id: coupleId, user_id: userId, local_date: localDate, steps },
        { onConflict: 'user_id,local_date' },
      );
    if (error) throw new Error(error.message);
  },
  channel(coupleId: string, table: 'couple_live_locations' | 'couple_daily_steps', callback: () => void) {
    // A channel name is immutable after subscribe(); give each screen instance its own topic.
    const instanceId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return supabase
      .channel(`${table}-${coupleId}-${instanceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `couple_id=eq.${coupleId}` },
        callback,
      )
      .subscribe();
  },
};
