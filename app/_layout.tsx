import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/src/hooks/useAuth';
import { AppStateProvider } from '@/src/hooks/useAppState';
import { colors } from '@/src/constants/theme';
import { AppAppearanceProvider, useAppAppearance } from '@/src/hooks/useAppAppearance';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Oturum yoksa (auth) ekranlarına, oturum varsa sekmelere yönlendirir. */
function RootNavigator() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { backgroundColor } = useAppAppearance();

  useEffect(() => {
    if (loading) return;
    SplashScreen.hideAsync().catch(() => undefined);
    const inAuthGroup = segments[0] === '(auth)';
    if (!user && !inAuthGroup) router.replace('/(auth)/welcome');
    else if (user && inAuthGroup) router.replace('/(tabs)');
  }, [user, loading, segments, router]);

  return (
    <View style={[styles.root, { backgroundColor }]}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="couple/invite" />
        <Stack.Screen name="couple/accept" />
        <Stack.Screen name="couple/status" />
        <Stack.Screen name="screen-note/compose" options={{ presentation: 'modal' }} />
        <Stack.Screen name="screen-note/history" />
        <Stack.Screen name="mood/index" />
        <Stack.Screen name="travel-map/index" />
        <Stack.Screen name="categories/[slug]" />
        <Stack.Screen name="calendar/index" />
        <Stack.Screen name="special-dates/index" />
        <Stack.Screen name="song-of-the-day/index" />
        <Stack.Screen name="lists/index" />
        <Stack.Screen name="lists/[id]" />
      </Stack>
      {loading ? (
        <View style={[styles.loading, { backgroundColor }]}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppAppearanceProvider>
        <AuthProvider>
          <AppStateProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </AppStateProvider>
        </AuthProvider>
      </AppAppearanceProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  loading: { ...StyleSheet.absoluteFill, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
});
