import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  ScrollViewInstance,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, fontSize, layout, spacing } from '@/src/constants/theme';
import { IconButton } from './IconButton';
import { useAppAppearance } from '@/src/hooks/useAppAppearance';

interface ScreenProps {
  children: React.ReactNode;
  /** Üst başlık; verilirse geri butonlu bir başlık çubuğu gösterilir. */
  title?: string;
  toneColor?: string;
  showBack?: boolean;
  headerRight?: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Sekme ekranlarında alt güvenli alanı sekme çubuğu yönetir. */
  inTabs?: boolean;
  scrollRef?: React.RefObject<ScrollViewInstance | null>;
  contentMaxWidth?: number;
}

/**
 * Tüm ekranların ortak kabuğu: güvenli alan, krem zemin ve tabletlerde
 * en fazla 600pt genişliğinde ortalanmış içerik.
 */
export function Screen({
  children,
  title,
  toneColor,
  showBack = true,
  headerRight,
  scroll = true,
  refreshing,
  onRefresh,
  inTabs,
  scrollRef,
  contentMaxWidth = layout.maxContentWidth,
}: ScreenProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { backgroundColor } = useAppAppearance();
  const contentWidth = Math.min(width - insets.left - insets.right, contentMaxWidth);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  const header = title ? (
    <View style={[styles.header, { width: contentWidth }]}>
      {showBack ? (
        <IconButton
          icon="arrow-left"
          color={toneColor ?? colors.text}
          onPress={goBack}
          accessibilityLabel="Geri dön"
        />
      ) : (
        <View style={styles.headerSpacer} />
      )}
      <Text
        style={[styles.headerTitle, toneColor ? { color: toneColor } : undefined]}
        numberOfLines={1}
        accessibilityRole="header"
      >
        {title}
      </Text>
      <View style={styles.headerSide}>{headerRight ?? null}</View>
    </View>
  ) : null;

  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={toneColor ?? colors.accent}
          />
        ) : undefined
      }
    >
      <View style={[styles.inner, { width: contentWidth }]}>{children}</View>
    </ScrollView>
  ) : (
    <View style={[styles.inner, styles.fill, { width: contentWidth }]}>{children}</View>
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor }]}
      edges={inTabs ? ['top', 'left', 'right'] : ['top', 'left', 'right', 'bottom']}
    >
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.center}>{header}</View>
        <View style={[styles.fill, !scroll && styles.center]}>{body}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  center: { alignItems: 'center' },
  scrollContent: { alignItems: 'center', paddingBottom: spacing.xxxl },
  inner: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'serif',
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.15,
  },
  headerSpacer: { width: 40 },
  headerSide: { width: 40, alignItems: 'flex-end' },
});
