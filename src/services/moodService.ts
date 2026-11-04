import { MOOD_NOTE_MAX_LENGTH, moodOptions } from '@/src/constants/moods';
import { supabase } from '@/src/lib/supabase';
import { ServiceResult } from '@/src/types';
import { MoodDraft, MoodEntry, MoodValue } from '@/src/types/mood';
import { getLocalMoodDate, getMoodHistoryStartDate } from '@/src/utils/mood';

export interface MoodScope {
  ownerId: string;
  coupleId: string;
  partnerId: string;
}

export type SaveMoodInput = MoodScope & MoodDraft;

const isMoodValue = (value: unknown): value is MoodValue => moodOptions.some((option) => option.value === value);

function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return getLocalMoodDate(date) === value;
}

function mapMood(row: unknown): MoodEntry {
  if (!row || typeof row !== 'object') throw new Error('Ruh hali kaydı okunamadı. Lütfen yeniden deneyin.');
  const entry = row as Record<string, unknown>;
  if (
    typeof entry.id !== 'string' || typeof entry.owner_id !== 'string' ||
    (entry.couple_id !== null && typeof entry.couple_id !== 'string') ||
    !isDateKey(entry.entry_date) || !isMoodValue(entry.mood) ||
    typeof entry.note !== 'string' || typeof entry.created_at !== 'string' || typeof entry.updated_at !== 'string'
  ) throw new Error('Ruh hali kaydı okunamadı. Lütfen yeniden deneyin.');
  return {
    id: entry.id, ownerId: entry.owner_id, coupleId: entry.couple_id,
    date: entry.entry_date, mood: entry.mood, note: entry.note,
    createdAt: entry.created_at, updatedAt: entry.updated_at,
  };
}

function scopeError(input: MoodScope): string | null {
  if (!input.ownerId) return 'Oturum bulunamadı. Lütfen yeniden giriş yapın.';
  if (!input.coupleId || !input.partnerId || input.partnerId === input.ownerId) return 'Ruh halinizi paylaşmak için önce partnerinizle eşleşin.';
  return null;
}

function requestError(error: unknown, saving: boolean): string {
  const detail = error && typeof error === 'object' ? error as { code?: string; message?: string } : {};
  if (detail.code === '42P01' || detail.code === 'PGRST205' || detail.code === 'PGRST204') {
    return 'Ruh Halim henüz sunucuda hazır değil. Veritabanı güncellemesi uygulandıktan sonra yeniden deneyin.';
  }
  if (detail.code === '42501') return 'Eşleşmeniz doğrulanamadı. Sayfayı yenileyip yeniden deneyin.';
  return saving
    ? 'Ruh haliniz kaydedilemedi. Bağlantınızı kontrol edip yeniden deneyin.'
    : 'Ruh halleri yüklenemedi. Bağlantınızı kontrol edip yeniden deneyin.';
}

export const moodService = {
  async list(input: MoodScope, now: Date = new Date()): Promise<MoodEntry[]> {
    const invalidScope = scopeError(input);
    if (invalidScope) throw new Error(invalidScope);
    try {
      const { data, error } = await supabase.from('mood_entries')
        .select('*')
        .eq('couple_id', input.coupleId)
        .eq('visibility', 'shared')
        .eq('is_deleted', false)
        .in('owner_id', [input.ownerId, input.partnerId])
        .gte('entry_date', getMoodHistoryStartDate(now))
        .lte('entry_date', getLocalMoodDate(now))
        .order('entry_date', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(60);
      if (error) throw new Error(requestError(error, false));
      if (!Array.isArray(data)) throw new Error('Ruh halleri okunamadı. Lütfen yeniden deneyin.');
      return data.map(mapMood).filter((entry) =>
        entry.coupleId === input.coupleId && [input.ownerId, input.partnerId].includes(entry.ownerId),
      );
    } catch (error) {
      if (error instanceof Error && /^(Ruh hali|Ruh Halim|Eşleşmeniz)/.test(error.message)) throw error;
      throw new Error(requestError(error, false));
    }
  },

  async save(input: SaveMoodInput, now: Date = new Date()): Promise<ServiceResult<MoodEntry>> {
    const invalidScope = scopeError(input);
    if (invalidScope) return { error: invalidScope };
    if (!isMoodValue(input.mood)) return { error: 'Lütfen nasıl hissettiğinizi seçin.' };
    if (typeof input.note !== 'string') return { error: 'Lütfen geçerli bir not yazın.' };
    const note = input.note.trim();
    if (note.length > MOOD_NOTE_MAX_LENGTH) return { error: `Not en fazla ${MOOD_NOTE_MAX_LENGTH} karakter olabilir.` };
    const date = getLocalMoodDate(now);
    if (!isDateKey(date)) return { error: 'Bugünün tarihi belirlenemedi. Cihazınızın tarihini kontrol edin.' };
    try {
      const { data, error } = await supabase.from('mood_entries')
        .upsert({
          owner_id: input.ownerId, couple_id: input.coupleId,
          visibility: 'shared', is_deleted: false, entry_date: date, mood: input.mood, note,
        }, { onConflict: 'owner_id,entry_date' })
        .select('*')
        .single();
      if (error) return { error: requestError(error, true) };
      const entry = mapMood(data);
      if (entry.ownerId !== input.ownerId || entry.coupleId !== input.coupleId || entry.date !== date) {
        return { error: 'Kaydedilen ruh hali doğrulanamadı. Lütfen sayfayı yenileyin.' };
      }
      return { data: entry };
    } catch (error) {
      return { error: requestError(error, true) };
    }
  },
};
