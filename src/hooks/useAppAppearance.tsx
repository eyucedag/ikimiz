import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appBackgroundColors, colors } from '@/src/constants/theme';

const STORAGE_KEY = 'ikimiz:app-background-color';
interface AppearanceValue { backgroundColor: string; surfaceColor: string; setBackgroundColor: (color: string) => void }
const AppearanceContext = createContext<AppearanceValue>({
  backgroundColor: colors.background, surfaceColor: colors.background, setBackgroundColor: () => undefined,
});

export function AppAppearanceProvider({ children }: { children: React.ReactNode }) {
  const [backgroundColor, setBackgroundColorState] = useState(colors.background);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (active && appBackgroundColors.some((item) => item.color === stored)) setBackgroundColorState(stored!);
    }).catch(() => undefined).finally(() => { if (active) setHydrated(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (hydrated) void AsyncStorage.setItem(STORAGE_KEY, backgroundColor);
  }, [backgroundColor, hydrated]);
  const setBackgroundColor = useCallback((value: string) => {
    if (appBackgroundColors.some((item) => item.color === value)) setBackgroundColorState(value);
  }, []);
  const value = useMemo(() => ({
    backgroundColor,
    surfaceColor: colors.background,
    setBackgroundColor,
  }), [backgroundColor, setBackgroundColor]);
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppAppearance() { return useContext(AppearanceContext); }
