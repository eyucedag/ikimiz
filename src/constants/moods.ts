import { MoodValue } from '@/src/types/mood';

export const MOOD_NOTE_MAX_LENGTH = 280;

export interface MoodOption {
  value: MoodValue;
  label: string;
  emoji: string;
  color: string;
}

export const moodOptions: readonly MoodOption[] = [
  { value: 'great', label: 'Harika', emoji: '🤩', color: '#D9A441' },
  { value: 'good', label: 'İyi', emoji: '😊', color: '#6F997A' },
  { value: 'okay', label: 'İdare eder', emoji: '😐', color: '#8E9AA6' },
  { value: 'low', label: 'Keyifsiz', emoji: '😔', color: '#8297B8' },
  { value: 'rough', label: 'Zorlanıyorum', emoji: '😣', color: '#B7859F' },
  { value: 'tired', label: 'Yorgunum', emoji: '😴', color: '#8297B8' },
  { value: 'energetic', label: 'Enerjik', emoji: '💪', color: '#6F997A' },
  { value: 'angry', label: 'Kızgın', emoji: '😡', color: '#C65B4B' },
  { value: 'bored', label: 'Sıkılmış', emoji: '😒', color: '#8E9AA6' },
];

export function getMoodOption(value: MoodValue): MoodOption {
  return moodOptions.find((option) => option.value === value) ?? moodOptions[2];
}
