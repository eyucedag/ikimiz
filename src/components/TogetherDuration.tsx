import { StyleSheet, Text } from 'react-native';
import { useNow } from '@/src/hooks/useNow';
import { colors } from '@/src/constants/theme';

/** The second-by-second counter should not re-render every home card. */
export function TogetherDuration({ startedAt }: { startedAt: string | null | undefined }) {
  const now = useNow(1_000);
  const start = startedAt ? new Date(startedAt).getTime() : NaN;
  if (!Number.isFinite(start)) return null;
  const elapsed = Math.max(0, Math.floor((now - start) / 1_000));
  const days = Math.floor(elapsed / 86_400);
  const hours = Math.floor((elapsed % 86_400) / 3_600);
  const minutes = Math.floor((elapsed % 3_600) / 60);
  const seconds = elapsed % 60;
  return (
    <Text
      style={styles.duration}
      numberOfLines={1}
      adjustsFontSizeToFit
      accessibilityLabel={`${days} gün ${hours} saat ${minutes} dakika ${seconds} saniye`}
    >
      {days} gün · {hours} sa · {minutes} dk · {seconds} sn
    </Text>
  );
}

const styles = StyleSheet.create({
  duration: { color: colors.textSecondary, fontSize: 9, fontWeight: '700' },
});
