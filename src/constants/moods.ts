import { MoodValue } from '@/src/types/mood';

export const MOOD_NOTE_MAX_LENGTH = 280;

export interface MoodOption {
  value: MoodValue;
  label: string;
  emoji: string;
  color: string;
}

export const moodOptions: readonly MoodOption[] = [
  { value: 'great', label: 'Harika', emoji: '🤩', color: '#80935B' },
  { value: 'good', label: 'İyi', emoji: '😊', color: '#346C59' },
  { value: 'okay', label: 'İdare eder', emoji: '😐', color: '#66758C' },
  { value: 'low', label: 'Keyifsiz', emoji: '😔', color: '#3D6796' },
  { value: 'rough', label: 'Zorlanıyorum', emoji: '😣', color: '#93485F' },
  { value: 'tired', label: 'Yorgunum', emoji: '😴', color: '#66758C' },
  { value: 'energetic', label: 'Enerjik', emoji: '💪', color: '#346C59' },
  { value: 'angry', label: 'Kızgın', emoji: '😡', color: '#93485F' },
  { value: 'bored', label: 'Sıkılmış', emoji: '😒', color: '#706D69' },
];

export function getMoodOption(value: MoodValue): MoodOption {
  return moodOptions.find((option) => option.value === value) ?? moodOptions[2];
}
