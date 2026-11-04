import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/src/hooks/useAuth';
import { AppStateProvider } from '@/src/hooks/useAppState';
import { colors } from '@/src/constants/theme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Oturum yoksa (auth) ekranlarına, oturum varsa sekmelere yönlendirir. */
function RootNavigator() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    SplashScreen.hideAsync().catch(() => undefined);
    const inAuthGroup = segments[0] === '(auth)';
    if (!user && !inAuthGroup) router.replace('/(auth)/welcome');
    else if (user && inAuthGroup) router.replace('/(tabs)');
  }, [user, loading, segments, router]);

  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="couple/invite" />
        <Stack.Screen name="couple/accept" />
        <Stack.Screen name="couple/status" />
        <Stack.Screen name="screen-note/compose" options={{ presentation: 'modal' }} />
        <Stack.Screen name="screen-note/history" />
        <Stack.Screen name="categories/[slug]" />
      </Stack>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppStateProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </AppStateProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  loading: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
});
