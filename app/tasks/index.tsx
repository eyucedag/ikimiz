import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect } from 'expo-router';
import { Button, Card, CoupleLoading, EmptyState, Input, Screen } from '@/src/components/ui';
import { getCategoryColor } from '@/src/constants/categories';
import { colors, fontSize, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';
import { Task, taskService } from '@/src/services/coupleCategoryService';

export default function TasksScreen() {
  const tone = getCategoryColor('gorevler');
  const { user } = useAuth();
  const couple = useCouple();
  const coupleId = couple.couple?.id;
  const [rows, setRows] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const refresh = useCallback(async () => {
    if (!coupleId) return;
    try {
      setRows(await taskService.list(coupleId));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Görevler yüklenemedi.');
    }
  }, [coupleId]);
  useFocusEffect(
    useCallback(() => {
      void refresh();
      const timer = setInterval(() => {
        void refresh();
      }, 8000);
      return () => clearInterval(timer);
    }, [refresh]),
  );
  const add = async () => {
    if (!user || !couple.couple || !title.trim() || saving) return;
    setSaving(true);
    try {
      await taskService.add(user.id, couple.couple.id, title);
      setTitle('');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Görev eklenemedi.');
    } finally {
      setSaving(false);
    }
  };
  const toggle = async (task: Task) => {
    try {
      await taskService.toggle(task.id, !!task.completed_at);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Görev güncellenemedi.');
    }
  };
  const remove = (task: Task) =>
    Alert.alert('Görevi kaldır', `“${task.title}” kaldırılsın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: async () => {
          try {
            await taskService.remove(task.id);
            await refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Görev kaldırılamadı.');
          }
        },
      },
    ]);
  if (couple.loading)
    return (
      <Screen title="Görevler" toneColor={tone.color}>
        <CoupleLoading />
      </Screen>
    );
  return (
    <Screen title="Görevler" toneColor={tone.color}>
      {!couple.couple ? (
        <EmptyState
          icon="users"
          toneColor={tone.color}
          toneTint={tone.tint}
          title="Önce eşleşin"
          description="Ortak görevler için partnerinizle eşleşin."
        />
      ) : (
        <>
          <Card style={[styles.card, { borderColor: tone.color }]}>
            <Text style={[styles.heading, { color: tone.color }]}>Yeni görev</Text>
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="…"
              returnKeyType="done"
              onSubmitEditing={() => {
                void add();
              }}
              compact
            />
            <Button
              title="Görev ekle"
              icon="plus"
              toneColor={tone.color}
              onPress={() => {
                void add();
              }}
              loading={saving}
              disabled={!title.trim()}
              compact
            />
          </Card>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {rows.length === 0 ? (
            <EmptyState
              icon="check-square"
              title="Henüz görev yok"
              description="Birlikte yapacağınız ilk işi ekleyin."
              toneColor={tone.color}
              toneTint={tone.tint}
            />
          ) : (
            rows.map((task) => (
              <Card key={task.id} style={[styles.row, { borderColor: tone.color }]}>
                <Pressable
                  onPress={() => {
                    void toggle(task);
                  }}
                  style={styles.check}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: !!task.completed_at }}
                >
                  <Feather
                    name={task.completed_at ? 'check-square' : 'square'}
                    size={22}
                    color={tone.color}
                  />
                </Pressable>
                <Text style={[styles.title, !!task.completed_at && styles.done]}>{task.title}</Text>
                <Pressable onPress={() => remove(task)} hitSlop={10}>
                  <Feather name="trash-2" size={17} color={colors.error} />
                </Pressable>
              </Card>
            ))
          )}
        </>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  card: { borderWidth: 1, marginBottom: spacing.md },
  heading: { fontSize: fontSize.md, fontWeight: '700', marginBottom: spacing.sm },
  row: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  check: { padding: spacing.xs },
  title: { flex: 1, color: colors.text, fontSize: fontSize.md },
  done: { color: colors.textTertiary, textDecorationLine: 'line-through' },
  error: { color: colors.error, marginBottom: spacing.sm },
});
