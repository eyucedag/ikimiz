import { Stack } from 'expo-router';
import { useAppAppearance } from '@/src/hooks/useAppAppearance';

export default function AuthLayout() {
  const { backgroundColor } = useAppAppearance();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor } }} />;
}
