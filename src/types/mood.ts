export type MoodValue =
  'great' | 'good' | 'okay' | 'low' | 'rough' | 'tired' | 'energetic' | 'angry' | 'bored';

export interface MoodEntry {
  id: string;
  ownerId: string;
  coupleId: string | null;
  /** Kullanıcının yerel takvim günü, YYYY-MM-DD. */
  date: string;
  mood: MoodValue;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface MoodDraft {
  mood: MoodValue;
  note: string;
}
