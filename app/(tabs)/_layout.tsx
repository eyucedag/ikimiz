import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { colors, fontSize, shadow } from '@/src/constants/theme';
import { useAppState } from '@/src/hooks/useAppState';

type IconName = keyof typeof Feather.glyphMap;

const tabIcon =
  (name: IconName) =>
  ({ color, size }: { color: string; size: number }) => <Feather name={name} size={size - 2} color={color} />;

/** Ortadaki büyük, yuvarlak "+" butonu */
function AddTabButton({ onPress, accessibilityState }: BottomTabBarButtonProps) {
  return (
    <View style={styles.addWrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Hızlı ekle"
        accessibilityState={accessibilityState}
        style={({ pressed }) => [styles.addButton, pressed && styles.addPressed]}
      >
        <Feather name="plus" size={28} color={colors.white} />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  const { unreadCount } = useAppState();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: fontSize.xs, fontWeight: '500' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Bugün', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="search" options={{ title: 'Ara', tabBarIcon: tabIcon('search') }} />
      <Tabs.Screen
        name="add"
        options={{ title: 'Ekle', tabBarLabel: () => null, tabBarButton: (props) => <AddTabButton {...props} /> }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Bildirimler',
          tabBarIcon: tabIcon('bell'),
          tabBarBadge: unreadCount > 0 ? (unreadCount > 9 ? '9+' : unreadCount) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.earth2, fontSize: 10 },
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: tabIcon('user') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  addWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  addButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
    borderWidth: 4,
    borderColor: colors.background,
    ...shadow,
  },
  addPressed: { opacity: 0.85 },
});
