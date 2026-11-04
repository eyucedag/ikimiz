import { supabase } from '@/src/lib/supabase';

export interface TravelPlace {
  id: string;
  coupleId: string;
  ownerId: string;
  city: string;
  country: string;
  note: string | null;
  latitude: number;
  longitude: number;
  visitedOn: string;
  createdAt: string;
}

function mapPlace(row: Record<string, unknown>): TravelPlace {
  return {
    id: String(row.id), coupleId: String(row.couple_id), ownerId: String(row.owner_id),
    city: String(row.city), country: String(row.country), note: row.note == null ? null : String(row.note), latitude: Number(row.latitude),
    longitude: Number(row.longitude), visitedOn: String(row.visited_on), createdAt: String(row.created_at),
  };
}

export const travelService = {
  async list(coupleId: string): Promise<TravelPlace[]> {
    const { data, error } = await supabase.from('travel_places').select('*').eq('couple_id', coupleId).order('visited_on', { ascending: false });
    if (error) throw new Error('Gezilen yerler yüklenemedi. Supabase kurulumunu kontrol edin.');
    return (data ?? []).map((row) => mapPlace(row as Record<string, unknown>));
  },
  async add(input: Omit<TravelPlace, 'id' | 'createdAt'>): Promise<TravelPlace> {
    const { data, error } = await supabase.from('travel_places').insert({
      couple_id: input.coupleId, owner_id: input.ownerId, city: input.city, country: input.country,
      note: input.note, latitude: input.latitude, longitude: input.longitude, visited_on: input.visitedOn,
    }).select('*').single();
    if (error || !data) throw new Error(error?.message.includes('travel_places') ? 'Gezilen Yerler için Supabase SQL migration dosyasını çalıştırın.' : 'Yer eklenemedi. Lütfen bağlantınızı kontrol edip yeniden deneyin.');
    return mapPlace(data as Record<string, unknown>);
  },
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('travel_places').delete().eq('id', id);
    if (error) throw new Error('Yer silinemedi. Lütfen yeniden deneyin.');
  },
};

export async function findCoordinates(city: string, country: string): Promise<{ latitude: number; longitude: number }> {
  const query = new URLSearchParams({ city, country, format: 'jsonv2', limit: '1' });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${query.toString()}`, {
    headers: { 'Accept-Language': 'tr,en' },
  });
  if (!response.ok) throw new Error('Harita konumu bulunamadı. Biraz sonra yeniden deneyin.');
  const results = await response.json() as Array<{ lat: string; lon: string }>;
  if (!results.length) throw new Error('Bu şehir ve ülke eşleşmesini bulamadım. Adları kontrol edip yeniden deneyin.');
  return { latitude: Number(results[0].lat), longitude: Number(results[0].lon) };
}
