import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appBackgroundColors, colors } from '@/src/constants/theme';

const STORAGE_KEY = 'ikimiz:app-background-color';
const legacyBackgroundColors = [
  '#FAF8F5',
  '#FFD5EA',
  '#FFD9B0',
  '#FFEE9E',
  '#CFF28B',
  '#A6F0D8',
  '#B9D9FF',
  '#D8B8FF',
  '#F7F3EE',
  '#F8EDF1',
  '#F9F0E9',
  '#F8F4E8',
  '#F0F4EC',
  '#EDF4F1',
  '#EEF2F7',
  '#F3EEF6',
];
const previousAuroraBackgroundColors = ['#082D25', '#0E352B', '#123A30', '#173D32', '#1B382F', '#103833'];
const previousNeutralBackgroundColors = ['#292F2C', '#303633', '#363C38', '#3A3935', '#343A3B', '#363A35'];
const neutralSurface = 'rgba(255,252,245,0.96)';
interface AppearanceValue {
  backgroundColor: string;
  surfaceColor: string;
  setBackgroundColor: (color: string) => void;
}
const AppearanceContext = createContext<AppearanceValue>({
  backgroundColor: colors.background,
  surfaceColor: neutralSurface,
  setBackgroundColor: () => undefined,
});

export function AppAppearanceProvider({ children }: { children: React.ReactNode }) {
  const [backgroundColor, setBackgroundColorState] = useState(colors.background);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!active || !stored) return;
        if (appBackgroundColors.some((item) => item.color === stored)) {
          setBackgroundColorState(stored);
          return;
        }
        const previousAuroraIndex = previousAuroraBackgroundColors.indexOf(stored);
        if (previousAuroraIndex >= 0) {
          setBackgroundColorState(appBackgroundColors[previousAuroraIndex].color);
          return;
        }
        const previousNeutralIndex = previousNeutralBackgroundColors.indexOf(stored);
        if (previousNeutralIndex >= 0) {
          setBackgroundColorState(appBackgroundColors[previousNeutralIndex].color);
          return;
        }
        const legacyIndex = legacyBackgroundColors.indexOf(stored);
        if (legacyIndex >= 0)
          setBackgroundColorState(appBackgroundColors[legacyIndex % appBackgroundColors.length].color);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (hydrated) void AsyncStorage.setItem(STORAGE_KEY, backgroundColor).catch(() => undefined);
  }, [backgroundColor, hydrated]);
  const setBackgroundColor = useCallback((value: string) => {
    if (appBackgroundColors.some((item) => item.color === value)) setBackgroundColorState(value);
  }, []);
  const value = useMemo(
    () => ({
      backgroundColor,
      surfaceColor: neutralSurface,
      setBackgroundColor,
    }),
    [backgroundColor, setBackgroundColor],
  );
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppAppearance() {
  return useContext(AppearanceContext);
}
