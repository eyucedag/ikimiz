import { MoodValue } from '@/src/types/mood';

export const MOOD_NOTE_MAX_LENGTH = 280;

export interface MoodOption {
  value: MoodValue;
  label: string;
  emoji: string;
  color: string;
}

export const moodOptions: readonly MoodOption[] = [
  { value: 'great', label: 'Harika', emoji: '🤩', color: '#C89A32' },
  { value: 'good', label: 'İyi', emoji: '😊', color: '#668B87' },
  { value: 'okay', label: 'İdare eder', emoji: '😐', color: '#B1AD80' },
  { value: 'low', label: 'Keyifsiz', emoji: '😔', color: '#6E7591' },
  { value: 'rough', label: 'Zorlanıyorum', emoji: '😣', color: '#AD7774' },
  { value: 'tired', label: 'Yorgunum', emoji: '😴', color: '#6E7591' },
  { value: 'energetic', label: 'Enerjik', emoji: '💪', color: '#365844' },
  { value: 'angry', label: 'Kızgın', emoji: '😡', color: '#8C3F32' },
  { value: 'bored', label: 'Sıkılmış', emoji: '😒', color: '#777B3D' },
];

export function getMoodOption(value: MoodValue): MoodOption {
  return moodOptions.find((option) => option.value === value) ?? moodOptions[2];
}
