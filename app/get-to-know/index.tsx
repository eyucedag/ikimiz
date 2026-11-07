import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Button, Card, CoupleLoading, EmptyState, Screen } from '@/src/components/ui';
import { coupleQuestions, CoupleQuestionId } from '@/src/constants/coupleQuestions';
import { getCategoryColor } from '@/src/constants/categories';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';
import { CoupleQuestionAnswer, coupleQuestionService } from '@/src/services/coupleQuestionService';

export default function GetToKnowScreen() {
  const tone = getCategoryColor('birbirimizi-taniyalim');
  const { user } = useAuth();
  const couple = useCouple();
  const [answers, setAnswers] = useState<CoupleQuestionAnswer[]>([]);
  const [selectedId, setSelectedId] = useState<CoupleQuestionId>(coupleQuestions[0].id);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const activeQuestion = coupleQuestions.find((item) => item.id === selectedId) ?? coupleQuestions[0];

  const refresh = useCallback(async () => {
    if (!couple.couple?.id) return;
    try {
      const next = await coupleQuestionService.list(couple.couple.id);
      setAnswers(next);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yanıtlar yüklenemedi.');
    }
  }, [couple.couple?.id]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    void refresh().finally(() => setLoading(false));
    const timer = setInterval(() => { void refresh(); }, 8000);
    return () => clearInterval(timer);
  }, [refresh]));

  const mine = useMemo(() => answers.find((item) => item.question_id === selectedId && item.owner_id === user?.id), [answers, selectedId, user?.id]);
  const partnerAnswer = useMemo(() => answers.find((item) => item.question_id === selectedId && item.owner_id === couple.partner?.id), [answers, selectedId, couple.partner?.id]);
  const answeredCount = useMemo(() => new Set(answers.filter((item) => item.owner_id === user?.id).map((item) => item.question_id)).size, [answers, user?.id]);
  const partnerCount = useMemo(() => new Set(answers.filter((item) => item.owner_id === couple.partner?.id).map((item) => item.question_id)).size, [answers, couple.partner?.id]);

  React.useEffect(() => { setDraft(mine?.answer ?? ''); }, [selectedId, mine?.answer]);

  const save = async () => {
    if (!user || !couple.couple || !draft.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      await coupleQuestionService.save(couple.couple.id, user.id, selectedId, draft);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yanıt kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  if (couple.loading) return <Screen title="Birbirimizi Tanıyalım" toneColor={tone.color}><CoupleLoading /></Screen>;

  return (
    <Screen title="Birbirimizi Tanıyalım" toneColor={tone.color}>
      {!couple.couple || !couple.partner ? (
        <EmptyState icon="users" toneColor={tone.color} toneTint={tone.tint} title="Önce partnerinle eşleş" description="Sorulara verdiğiniz yanıtlar yalnızca ikinizin ortak alanında görünür." />
      ) : (
        <>
          <Card style={[styles.summary, { borderColor: tone.color }]}>
            <View style={[styles.summaryIcon, { backgroundColor: tone.tint }]}><Feather name="message-circle" size={20} color={tone.color} /></View>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryTitle}>Birbirinizi keşfedin</Text>
              <Text style={styles.summaryText}>Soruları istediğiniz sırayla yanıtlayın; cevaplarınız ikinize de açık.</Text>
            </View>
            <View style={styles.progress}><Text style={[styles.progressNumber, { color: tone.color }]}>{answeredCount}/{coupleQuestions.length}</Text><Text style={styles.progressLabel}>sen</Text></View>
          </Card>

          <Card style={[styles.questionCard, { borderColor: tone.color }]}>
            <Text style={[styles.questionCount, { color: tone.color }]}>SORU {coupleQuestions.findIndex((item) => item.id === selectedId) + 1} · {coupleQuestions.length}</Text>
            <Text style={styles.question}>{activeQuestion.question}</Text>
            <View style={styles.answerHeading}><View style={[styles.avatar, { backgroundColor: tone.tint }]}><Feather name="user" size={16} color={tone.color} /></View><Text style={styles.answerName}>Sen</Text></View>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Yanıtını yaz…"
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={1000}
              textAlignVertical="top"
              style={styles.answerInput}
            />
            <Button title={mine ? 'Yanıtı güncelle' : 'Yanıtla'} icon="check" toneColor={tone.color} onPress={() => { void save(); }} loading={saving} disabled={!draft.trim() || draft.trim() === mine?.answer} compact />

            <View style={styles.partnerHeading}>
              <View style={[styles.avatar, { backgroundColor: tone.tint }]}><Feather name="heart" size={16} color={tone.color} /></View>
              <Text style={styles.answerName}>{couple.partner.displayName}</Text>
              <Text style={styles.partnerProgress}>{partnerCount}/{coupleQuestions.length}</Text>
            </View>
            {partnerAnswer ? <Text style={styles.partnerAnswer}>{partnerAnswer.answer}</Text> : <Text style={styles.waiting}>Partnerin bu soruyu yanıtladığında cevabı burada göreceksin.</Text>}
          </Card>

          {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Sorular</Text>
            {loading ? <Text style={styles.loadingText}>Güncelleniyor…</Text> : null}
          </View>
          {coupleQuestions.map((item, index) => {
            const selected = item.id === selectedId;
            const mineAnswer = answers.some((answer) => answer.question_id === item.id && answer.owner_id === user?.id);
            const partnerAnswered = answers.some((answer) => answer.question_id === item.id && answer.owner_id === couple.partner?.id);
            return (
              <Pressable key={item.id} onPress={() => setSelectedId(item.id)} accessibilityRole="button" accessibilityState={{ selected }} style={[styles.questionRow, selected && { borderColor: tone.color, backgroundColor: tone.tint }]}>
                <Text style={[styles.questionIndex, { color: tone.color }]}>{String(index + 1).padStart(2, '0')}</Text>
                <Text style={styles.questionRowText}>{item.question}</Text>
                <View style={styles.statusDots}><View style={[styles.statusDot, mineAnswer && { backgroundColor: tone.color }]} /><View style={[styles.statusDot, partnerAnswered && { backgroundColor: tone.color }]} /></View>
              </Pressable>
            );
          })}
          <Text style={styles.legend}><Feather name="circle" size={9} color={tone.color} /> İlk nokta sen, ikinci nokta partnerin</Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  summaryIcon: { width: 38, height: 38, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center' },
  summaryCopy: { flex: 1 },
  summaryTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  summaryText: { color: colors.textSecondary, fontSize: fontSize.xs, lineHeight: 16, marginTop: 2 },
  progress: { alignItems: 'center' },
  progressNumber: { fontSize: fontSize.md, fontWeight: '700' },
  progressLabel: { color: colors.textSecondary, fontSize: 10 },
  questionCard: { marginBottom: spacing.md },
  questionCount: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  question: { color: colors.text, fontSize: fontSize.lg, lineHeight: 24, fontWeight: '700', marginTop: spacing.xs, marginBottom: spacing.md },
  answerHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  answerName: { color: colors.text, fontSize: fontSize.sm, fontWeight: '700', flex: 1 },
  answerInput: { minHeight: 78, maxHeight: 160, borderWidth: 1, borderColor: colors.border, borderRadius: radius.control, padding: spacing.sm, color: colors.text, backgroundColor: colors.card, fontSize: fontSize.sm, lineHeight: 20, marginBottom: spacing.sm },
  partnerHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md, marginBottom: spacing.xs },
  partnerProgress: { color: colors.textTertiary, fontSize: fontSize.xs },
  partnerAnswer: { color: colors.text, fontSize: fontSize.sm, lineHeight: 21, backgroundColor: colors.beige, padding: spacing.sm, borderRadius: radius.control },
  waiting: { color: colors.textSecondary, fontSize: fontSize.xs, lineHeight: 18, backgroundColor: colors.beige, padding: spacing.sm, borderRadius: radius.control },
  error: { color: colors.error, fontSize: fontSize.sm, marginBottom: spacing.sm },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs, marginBottom: spacing.xs },
  listTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  loadingText: { color: colors.textTertiary, fontSize: fontSize.xs },
  questionRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: radius.control, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, marginBottom: spacing.xs },
  questionIndex: { width: 24, fontSize: fontSize.xs, fontWeight: '700' },
  questionRowText: { flex: 1, color: colors.text, fontSize: fontSize.xs, lineHeight: 16 },
  statusDots: { flexDirection: 'row', gap: 4 },
  statusDot: { width: 7, height: 7, borderRadius: 4, borderWidth: 1, borderColor: colors.border },
  legend: { color: colors.textTertiary, fontSize: 10, marginTop: spacing.xs, marginBottom: spacing.md },
});
