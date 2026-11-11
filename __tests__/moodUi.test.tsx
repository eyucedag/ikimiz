import { fireEvent, render } from '@testing-library/react-native';
import MoodScreen from '@/app/mood';
import { MoodSummaryCard } from '@/src/components/MoodSummaryCard';
import { useMoods } from '@/src/hooks/useMoods';
import { MoodEntry, MoodValue } from '@/src/types/mood';
import { localDateKey } from '@/src/utils/date';

jest.mock('@expo/vector-icons/Feather', () => 'Feather');
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@/src/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
jest.mock('@/src/hooks/useCouple', () => ({
  useCouple: () => ({
    isPaired: true,
    loading: false,
    couple: { id: 'couple', memberIds: ['me', 'partner'] },
    partner: { id: 'partner', displayName: 'Partner' },
    refresh: jest.fn(),
  }),
}));
jest.mock('@/src/hooks/useMoods', () => ({ useMoods: jest.fn() }));

const makeEntry = (mood: MoodValue): MoodEntry => ({
  id: 'mood',
  ownerId: 'me',
  coupleId: 'couple',
  date: localDateKey(),
  mood,
  note: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

test.each<[MoodValue, string]>([
  ['tired', '😴'],
  ['energetic', '💪'],
  ['angry', '😡'],
  ['bored', '😒'],
])('home summary renders the selected %s emoji', async (mood, emoji) => {
  const view = await render(
    <MoodSummaryCard
      today={makeEntry(mood)}
      partnerToday={null}
      partnerName="Partner"
      paired
      loading={false}
      error={null}
      onPress={jest.fn()}
    />,
  );
  expect(view.getByText(emoji)).toBeTruthy();
  await view.unmount();
});

test('all nine mood choices can be selected; sharing sends the chosen value', async () => {
  const save = jest.fn().mockResolvedValue({ data: makeEntry('energetic') });
  jest.mocked(useMoods).mockReturnValue({
    today: null,
    partnerToday: null,
    history: [],
    loading: false,
    saving: false,
    error: null,
    refresh: jest.fn().mockResolvedValue(undefined),
    save,
  });
  const view = await render(<MoodScreen />);
  const buttonLabels = view.getAllByRole('button').map((button) => button.props.accessibilityLabel);
  for (const name of [
    'Harika',
    'İyi',
    'İdare eder',
    'Keyifsiz',
    'Zorlanıyorum',
    'Yorgunum',
    'Enerjik',
    'Kızgın',
    'Sıkılmış',
  ]) {
    expect(buttonLabels).toContain(name);
  }
  expect(view.queryByText(/Ruh haliniz ve notunuz/)).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Enerjik' }));
  await fireEvent.press(view.getByRole('button', { name: 'Ruh Halini Paylaş' }));
  expect(save).toHaveBeenCalledWith({ mood: 'energetic', note: '' });
  await view.unmount();
});
