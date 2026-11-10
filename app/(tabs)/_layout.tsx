import {
  ColorValue,
  GestureResponderEvent,
  Image,
  Pressable,
  PressableProps,
  StyleSheet,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router';
import { getCategoryColor } from '@/src/constants/categories';
import { colors, fontSize, shadow } from '@/src/constants/theme';
import { auroraIcons } from '@/src/constants/auroraAssets';
import { useAppState } from '@/src/hooks/useAppState';
import { useAppAppearance } from '@/src/hooks/useAppAppearance';

type IconName = 'today' | 'search' | 'notifications' | 'settings';

const tabIcon = (name: IconName) =>
  function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
    return (
      <Image
        source={auroraIcons[name]}
        resizeMode="contain"
        style={{ width: size + 2, height: size + 2, tintColor: color, opacity: focused ? 1 : 0.72 }}
      />
    );
  };

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
        style={({ pressed }) => [
          styles.addButton,
          { borderColor: backgroundColor },
          pressed && styles.addPressed,
        ]}
      >
        <Image source={auroraIcons.add} resizeMode="contain" style={styles.addIcon} />
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
        tabBarStyle: {
          backgroundColor: surfaceColor,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: 7,
          paddingBottom: 8,
          elevation: 12,
          shadowColor: colors.forestDeep,
          shadowOpacity: 0.22,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: -4 },
        },
        tabBarLabelStyle: { fontSize: fontSize.xs, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Bugün',
          tabBarIcon: tabIcon('today'),
          tabBarActiveTintColor: getCategoryColor('takvim').color,
          tabBarInactiveTintColor: getCategoryColor('takvim').color,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Kategoriler',
          tabBarIcon: ({ color, size }) => <Feather name="grid" size={size} color={color as string} />,
          tabBarActiveTintColor: getCategoryColor('gorevler').color,
          tabBarInactiveTintColor: getCategoryColor('gorevler').color,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Ekle',
          tabBarLabel: () => null,
          tabBarButton: (props) => <AddTabButton {...props} />,
          tabBarActiveTintColor: getCategoryColor('listeler').color,
          tabBarInactiveTintColor: getCategoryColor('listeler').color,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Bildirimler',
          tabBarIcon: tabIcon('notifications'),
          tabBarBadge: unreadCount > 0 ? (unreadCount > 9 ? '9+' : unreadCount) : undefined,
          tabBarBadgeStyle: { backgroundColor: getCategoryColor('gorevler').color, fontSize: 10 },
          tabBarActiveTintColor: getCategoryColor('gorevler').color,
          tabBarInactiveTintColor: getCategoryColor('gorevler').color,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Ayarlar',
          tabBarIcon: tabIcon('settings'),
          tabBarActiveTintColor: getCategoryColor('onemli-belgeler').color,
          tabBarInactiveTintColor: getCategoryColor('onemli-belgeler').color,
        }}
      />
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
  addIcon: { width: 35, height: 35 },
});
