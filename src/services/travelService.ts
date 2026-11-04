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

export interface CityOption {
  id: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
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
  async update(id: string, input: Pick<TravelPlace, 'city' | 'country' | 'note' | 'latitude' | 'longitude' | 'visitedOn'>): Promise<TravelPlace> {
    const { data, error } = await supabase.from('travel_places').update({
      city: input.city, country: input.country, note: input.note, latitude: input.latitude,
      longitude: input.longitude, visited_on: input.visitedOn,
    }).eq('id', id).select('*').single();
    if (error || !data) throw new Error('Ziyaret düzenlenemedi. Lütfen yeniden deneyin.');
    return mapPlace(data as Record<string, unknown>);
  },
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('travel_places').delete().eq('id', id);
    if (error) throw new Error('Yer silinemedi. Lütfen yeniden deneyin.');
  },
};

export async function searchCities(search: string, country: string): Promise<CityOption[]> {
  const query = new URLSearchParams({ q: `${search}, ${country}`, format: 'jsonv2', addressdetails: '1', limit: '8' });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${query.toString()}`, {
    headers: { 'Accept-Language': 'tr,en' },
  });
  if (!response.ok) throw new Error('Harita konumu bulunamadı. Biraz sonra yeniden deneyin.');
  const results = await response.json() as Array<{
    place_id: number; name?: string; lat: string; lon: string;
    address?: { city?: string; town?: string; village?: string; municipality?: string; county?: string; country?: string };
  }>;
  return results.map((result) => ({
    id: String(result.place_id),
    city: result.address?.city ?? result.address?.town ?? result.address?.village ?? result.address?.municipality ?? result.address?.county ?? result.name ?? '',
    country: result.address?.country ?? country,
    latitude: Number(result.lat),
    longitude: Number(result.lon),
  })).filter((result) => result.city.length > 0);
}

export async function findCoordinates(city: string, country: string): Promise<{ latitude: number; longitude: number }> {
  const query = new URLSearchParams({ q: `${city}, ${country}`, format: 'jsonv2', limit: '1' });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${query.toString()}`, {
    headers: { 'Accept-Language': 'tr,en' },
  });
  if (!response.ok) throw new Error('Konum bulunamadı. Şehir ve ülke adını kontrol edip yeniden deneyin.');
  const results = await response.json() as Array<{ lat: string; lon: string }>;
  if (!results[0]) throw new Error('Bu şehir ve ülke için haritada konum bulunamadı. Adları kontrol edip yeniden deneyin.');
  return { latitude: Number(results[0].lat), longitude: Number(results[0].lon) };
}
