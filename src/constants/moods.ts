import { MoodValue } from '@/src/types/mood';

export const MOOD_NOTE_MAX_LENGTH = 280;

export interface MoodOption {
  value: MoodValue;
  label: string;
  emoji: string;
  color: string;
}

export const moodOptions: readonly MoodOption[] = [
  { value: 'great', label: 'Harika', emoji: '🤩', color: '#DB9B3B' },
  { value: 'good', label: 'İyi', emoji: '😊', color: '#6F8F65' },
  { value: 'okay', label: 'İdare eder', emoji: '😐', color: '#8795A0' },
  { value: 'low', label: 'Keyifsiz', emoji: '😔', color: '#7186A4' },
  { value: 'rough', label: 'Zorlanıyorum', emoji: '😣', color: '#A77B96' },
  { value: 'tired', label: 'Yorgunum', emoji: '😴', color: '#7186A4' },
  { value: 'energetic', label: 'Enerjik', emoji: '💪', color: '#5B865A' },
  { value: 'angry', label: 'Kızgın', emoji: '😡', color: '#C95F4F' },
  { value: 'bored', label: 'Sıkılmış', emoji: '😒', color: '#798063' },
];

export function getMoodOption(value: MoodValue): MoodOption {
  return moodOptions.find((option) => option.value === value) ?? moodOptions[2];
}
