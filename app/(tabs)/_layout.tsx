import React from 'react';
import { ColorValue, GestureResponderEvent, Pressable, PressableProps, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fontSize, shadow } from '@/src/constants/theme';
import { useAppState } from '@/src/hooks/useAppState';
import { useAppAppearance } from '@/src/hooks/useAppAppearance';

type IconName = keyof typeof Feather.glyphMap;

const tabIcon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <Feather name={name} size={size - 2} color={color as string} />
  );

type AddTabButtonProps = {
  onPress?: ((e: GestureResponderEvent) => void) | null;
  accessibilityState?: PressableProps['accessibilityState'];
};

/** Ortadaki büyük, yuvarlak "+" butonu */
function AddTabButton({ onPress, accessibilityState }: AddTabButtonProps) {
  const { backgroundColor } = useAppAppearance();
  return (
    <View style={styles.addWrap}>
      <Pressable
        onPress={onPress ?? undefined}
        accessibilityRole="button"
        accessibilityLabel="Hızlı ekle"
        accessibilityState={accessibilityState}
        style={({ pressed }) => [styles.addButton, { borderColor: backgroundColor }, pressed && styles.addPressed]}
      >
        <Feather name="plus" size={28} color={colors.white} />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  const { unreadCount } = useAppState();
  const { surfaceColor } = useAppAppearance();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { backgroundColor: surfaceColor, borderTopColor: colors.border },
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
      <Tabs.Screen name="profile" options={{ title: 'Ayarlar', tabBarIcon: tabIcon('settings') }} />
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
