import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { localDateKey } from '@/src/utils/date';

/** Refresh date-dependent queries at midnight and on returning to the app. */
export function useLocalDate(): string {
  const [date, setDate] = useState(() => localDateKey());
  useEffect(() => {
    const refresh = () => setDate(localDateKey());
    const timer = setInterval(refresh, 30_000);
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, []);
  return date;
}
