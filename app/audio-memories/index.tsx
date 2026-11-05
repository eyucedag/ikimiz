import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { useFocusEffect } from 'expo-router';
import { Button, Card, CoupleLoading, EmptyState, IconButton, Input, Screen } from '@/src/components/ui';
import { getCategoryColor } from '@/src/constants/categories';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';
import { AudioMemory, audioMemoryService } from '@/src/services/audioMemoryService';
import { formatDateTime } from '@/src/utils/date';

const MAX_RECORDING_SECONDS = 180;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const durationLabel = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

export default function AudioMemoriesScreen() {
  const tone = getCategoryColor('sesli-anilar');
  const { user } = useAuth();
  const couple = useCouple();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 400);
  const player = useAudioPlayer(null);
  const playerStatus = useAudioPlayerStatus(player);
  const wasRecording = useRef(false);
  const lastDurationSeconds = useRef(0);
  const [memories, setMemories] = useState<AudioMemory[]>([]);
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [pendingDurationSeconds, setPendingDurationSeconds] = useState(0);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const partnerName = couple.partner?.displayName || 'Partnerin';

  const refresh = useCallback(async (showLoading = false) => {
    if (!couple.couple?.id) return;
    if (showLoading) setLoading(true);
    try {
      setMemories(await audioMemoryService.list(couple.couple.id));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sesli anılar yüklenemedi.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [couple.couple?.id]);

  useFocusEffect(useCallback(() => {
    void refresh(true);
    return () => { player.pause(); };
  }, [refresh, player]));

  useEffect(() => {
    const coupleId = couple.couple?.id;
    if (!coupleId) return;
    const channel = supabase.channel(`couple-audio-memories-${coupleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'couple_audio_memories', filter: `couple_id=eq.${coupleId}` }, () => { void refresh(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [couple.couple?.id, refresh]);

  useEffect(() => {
    if (recorderState.isRecording) lastDurationSeconds.current = recorderState.durationMillis / 1000;
    if (wasRecording.current && !recorderState.isRecording && recorder.uri) {
      setPendingUri(recorder.uri);
      setPendingDurationSeconds(Math.min(MAX_RECORDING_SECONDS, lastDurationSeconds.current));
      setError('');
    }
    wasRecording.current = recorderState.isRecording;
  }, [recorderState.isRecording, recorder.uri]);

  useEffect(() => {
    if (recorderState.isRecording && recorderState.durationMillis >= MAX_RECORDING_SECONDS * 1000) {
      void recorder.stop();
    }
  }, [recorder, recorderState.durationMillis, recorderState.isRecording]);

  useEffect(() => {
    if (playerStatus.didJustFinish) setPlayingId(null);
  }, [playerStatus.didJustFinish]);

  const startRecording = async () => {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Mikrofon izni gerekli', 'Sesli anı kaydetmek için telefon ayarlarından mikrofon iznini açın.');
        return;
      }
      player.pause();
      setPlayingId(null);
      setPendingUri(null);
      setPendingDurationSeconds(0);
      lastDurationSeconds.current = 0;
      setTitle('');
      setError('');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record({ forDuration: MAX_RECORDING_SECONDS });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kayıt başlatılamadı. Mikrofon iznini kontrol edin.');
    }
  };

  const stopRecording = async () => {
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kayıt durdurulamadı.');
    }
  };

  const saveRecording = async () => {
    if (!pendingUri || !user || !couple.couple || !couple.partner || saving) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(pendingUri);
      if (!response.ok) throw new Error('Ses dosyası okunamadı. Yeniden kaydedin.');
      const content = await response.arrayBuffer();
      if (!content.byteLength || content.byteLength > MAX_FILE_BYTES) throw new Error('Kayıt boş ya da 25 MB sınırından büyük.');
      const saved = await audioMemoryService.add({
        ownerId: user.id, partnerId: couple.partner.id, coupleId: couple.couple.id,
        title, durationSeconds: pendingDurationSeconds, sizeBytes: content.byteLength, content,
      });
      setMemories((current) => [saved, ...current]);
      setPendingUri(null);
      setPendingDurationSeconds(0);
      setTitle('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ses kaydı kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const play = async (memory: AudioMemory) => {
    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      if (playingId === memory.id && playerStatus.playing) {
        player.pause();
        setPlayingId(null);
        return;
      }
      player.pause();
      player.replace(memory.audioUrl);
      setPlayingId(memory.id);
      player.play();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ses kaydı oynatılamadı.');
    }
  };

  const remove = (memory: AudioMemory) => Alert.alert('Sesli anıyı kaldır', 'Bu kayıt ortak arşivden silinsin mi?', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Kaldır', style: 'destructive', onPress: async () => {
      try {
        if (playingId === memory.id) { player.pause(); setPlayingId(null); }
        await audioMemoryService.remove(memory);
        setMemories((current) => current.filter((item) => item.id !== memory.id));
      } catch (e) { setError(e instanceof Error ? e.message : 'Sesli anı kaldırılamadı.'); }
    } },
  ]);

  const onRefresh = async () => { setRefreshing(true); try { await refresh(); } finally { setRefreshing(false); } };

  if (couple.loading) return <Screen title="Sesli Anılar" toneColor={tone.color}><CoupleLoading /></Screen>;

  return (
    <Screen title="Sesli Anılar" toneColor={tone.color} refreshing={refreshing || loading} onRefresh={() => { void onRefresh(); }}>
      {!couple.isPaired || !couple.couple || !couple.partner ? (
        <EmptyState icon="users" toneColor={tone.color} toneTint={tone.tint} title="Önce eşleşin" description="Sesli anılarınızı yalnızca partnerinizle paylaşabilirsiniz." />
      ) : <>
        <Text style={styles.intro}>İkiniz de en fazla 3 dakikalık sesli anılar bırakabilirsiniz. Kayıtlarınız yalnızca ortak alanınızda saklanır.</Text>
        <Card style={[styles.recorderCard, { borderColor: tone.color }]}>
          <View style={[styles.micIcon, { backgroundColor: tone.tint }]}><Feather name="mic" size={22} color={tone.color} /></View>
          <Text style={styles.recorderTitle}>{recorderState.isRecording ? 'Şu an kaydediliyor' : pendingUri ? 'Kaydın hazır' : 'Yeni bir sesli anı'}</Text>
          <Text style={[styles.timer, { color: recorderState.isRecording ? colors.error : tone.color }]}>{durationLabel(recorderState.durationMillis / 1000)} <Text style={styles.timerLimit}>/ 3:00</Text></Text>
          {recorderState.isRecording ? (
            <Button title="Kaydı durdur" icon="square" toneColor={tone.color} onPress={() => { void stopRecording(); }} compact />
          ) : pendingUri ? (
            <>
              <Input label="Başlık (isteğe bağlı)" value={title} onChangeText={setTitle} placeholder="…" compact />
              <View style={styles.pendingActions}>
                <Button title="Vazgeç" icon="x" variant="secondary" toneColor={tone.color} onPress={() => { setPendingUri(null); setPendingDurationSeconds(0); setTitle(''); }} compact style={styles.flexButton} />
                <Button title="Paylaş" icon="upload-cloud" toneColor={tone.color} onPress={() => { void saveRecording(); }} loading={saving} compact style={styles.flexButton} />
              </View>
            </>
          ) : <Button title="Kayda başla" icon="mic" toneColor={tone.color} onPress={() => { void startRecording(); }} compact />}
        </Card>

        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        <Text style={styles.sectionTitle}>Paylaşılan kayıtlar · {memories.length}</Text>
        {loading && memories.length === 0 ? <Card style={{ borderColor: tone.color }}><Text style={styles.emptyText}>Kayıtlar yükleniyor…</Text></Card> : memories.length === 0 ? (
          <EmptyState icon="headphones" toneColor={tone.color} toneTint={tone.tint} title="Henüz sesli anı yok" description="İlk kaydı bırakarak sesli anı arşivinizi başlatın." />
        ) : memories.map((memory) => {
          const mine = memory.ownerId === user?.id;
          const isPlaying = playingId === memory.id && playerStatus.playing;
          return (
            <Card key={memory.id} style={[styles.memoryCard, { borderColor: tone.color }]}>
              <Pressable onPress={() => { void play(memory); }} accessibilityRole="button" accessibilityLabel={isPlaying ? 'Sesli anıyı duraklat' : 'Sesli anıyı dinle'} style={[styles.playButton, { backgroundColor: tone.tint }]}>
                <Feather name={isPlaying ? 'pause' : 'play'} size={19} color={tone.color} />
              </Pressable>
              <View style={styles.memoryCopy}>
                <Text style={styles.memoryTitle} numberOfLines={2}>{memory.title || (mine ? 'Sesli anın' : `${partnerName} bir anı bıraktı`)}</Text>
                <Text style={styles.memoryMeta}>{mine ? 'Sen' : partnerName} · {durationLabel(memory.durationSeconds)} · {formatDateTime(memory.createdAt)}</Text>
              </View>
              {mine ? <IconButton icon="trash-2" color={colors.error} accessibilityLabel="Sesli anıyı kaldır" onPress={() => remove(memory)} /> : null}
            </Card>
          );
        })}
      </>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 19, marginBottom: spacing.md },
  recorderCard: { alignItems: 'center', marginBottom: spacing.md },
  micIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  recorderTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  timer: { fontSize: fontSize.xxl, fontWeight: '700', marginVertical: spacing.sm, fontVariant: ['tabular-nums'] },
  timerLimit: { color: colors.textTertiary, fontSize: fontSize.sm, fontWeight: '500' },
  pendingActions: { flexDirection: 'row', gap: spacing.sm, width: '100%', marginTop: spacing.xs },
  flexButton: { flex: 1 },
  error: { color: colors.error, fontSize: fontSize.sm, lineHeight: 19, marginBottom: spacing.md },
  sectionTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700', marginBottom: spacing.sm },
  emptyText: { color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing.sm },
  memoryCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm, paddingVertical: spacing.sm },
  playButton: { width: 40, height: 40, flexShrink: 0, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  memoryCopy: { flex: 1, minWidth: 0 },
  memoryTitle: { color: colors.text, fontSize: fontSize.sm, fontWeight: '700' },
  memoryMeta: { color: colors.textSecondary, fontSize: 10, lineHeight: 15, marginTop: 3 },
});
