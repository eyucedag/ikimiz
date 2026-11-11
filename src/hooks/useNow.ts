import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const refresh = () => {
      if (AppState.currentState !== 'background') setNow(Date.now());
    };
    const timer = setInterval(refresh, intervalMs);
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, [intervalMs]);
  return now;
}
