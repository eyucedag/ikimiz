import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Button, Card, CoupleLoading, EmptyState, Input, Screen } from '@/src/components/ui';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { getCategoryColor } from '@/src/constants/categories';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';
import { supabase } from '@/src/lib/supabase';
import { DailySong, songOfTheDayService } from '@/src/services/songOfTheDayService';

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const todayLabel = () => new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

export default function SongOfTheDayScreen() {
  const { user } = useAuth();
  const couple = useCouple();
  const categoryColor = getCategoryColor('gunun-sarkisi');
  const [song, setSong] = useState<DailySong | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const date = today();

  const refresh = useCallback(async () => {
    if (!couple.couple?.id) return;
    setLoading(true);
    try {
      const current = await songOfTheDayService.get(couple.couple.id, date);
      setSong(current);
      setTitle(current?.title ?? '');
      setArtist(current?.artist ?? '');
      setUrl(current?.url ?? '');
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Günün şarkısı yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [couple.couple?.id, date]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  useEffect(() => {
    const coupleId = couple.couple?.id;
    if (!coupleId) return;
    const channel = supabase.channel(`daily-song-${coupleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_songs', filter: `couple_id=eq.${coupleId}` }, () => { void refresh(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [couple.couple?.id, refresh]);

  const save = async () => {
    if (!user || !couple.couple || !couple.partner) return;
    setSaving(true);
    setError('');
    try {
      const next = await songOfTheDayService.save({
        ownerId: user.id, partnerId: couple.partner.id, coupleId: couple.couple.id,
        date, title, artist, url,
      });
      setSong(next);
      setTitle(next.title); setArtist(next.artist); setUrl(next.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Şarkı kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const listen = async () => {
    if (!song?.url) return;
    try { await Linking.openURL(song.url); }
    catch { Alert.alert('Bağlantı açılamadı', 'Şarkı bağlantısını kontrol edip yeniden deneyin.'); }
  };

  if (couple.loading) return <Screen title="Günün Şarkısı"><CoupleLoading /></Screen>;

  return (
    <Screen title="Günün Şarkısı" onRefresh={refresh} refreshing={loading}>
      {!couple.isPaired ? <EmptyState icon="users" title="Önce eşleşin" description="Günün şarkısını partnerinizle paylaşmak için önce eşleşin." toneColor={categoryColor.color} toneTint={categoryColor.tint} /> : <>
        <View style={styles.heading}>
          <View style={[styles.icon, { backgroundColor: categoryColor.tint }]}><Feather name="music" size={21} color={categoryColor.color} /></View>
          <View style={styles.headingText}><Text style={styles.headingTitle}>Bugünün şarkısı</Text><Text style={styles.date}>{todayLabel()}</Text></View>
        </View>

        {song ? <Card style={[styles.songCard, { borderColor: categoryColor.color }]}>
          <View style={[styles.albumArt, { backgroundColor: categoryColor.tint }]}><Feather name="music" size={30} color={categoryColor.color} /></View>
          <Text style={styles.songTitle}>{song.title}</Text>
          <Text style={styles.artist}>{song.artist}</Text>
          <Button title="Şarkıyı dinle" icon="play" toneColor={categoryColor.color} onPress={() => { void listen(); }} compact style={styles.listenButton} />
        </Card> : <Card style={[styles.emptyCard, { borderColor: categoryColor.color }]}>
          <EmptyState compact icon="headphones" title="Bugünün şarkısı henüz seçilmedi" description="Bir şarkı seçip partnerinle paylaşın." toneColor={categoryColor.color} toneTint={categoryColor.tint} />
        </Card>}

        <Card style={[styles.form, { borderColor: categoryColor.color }]}>
          <Text style={[styles.formTitle, { color: categoryColor.color }]}>{song ? 'Şarkıyı değiştir' : 'Bugünün şarkısını seç'}</Text>
          <Input label="Şarkı" compact placeholder="Şarkı adı" value={title} onChangeText={setTitle} />
          <Input label="Sanatçı" compact placeholder="Sanatçı adı" value={artist} onChangeText={setArtist} />
          <Input label="Dinleme bağlantısı" compact placeholder="Spotify veya YouTube bağlantısı" value={url} onChangeText={setUrl} autoCapitalize="none" keyboardType="url" autoCorrect={false} />
          <Text style={styles.hint}>Şarkı bağlantısını Spotify, YouTube veya kullandığınız başka bir uygulamadan kopyalayın.</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title={song ? 'Günün şarkısını güncelle' : 'Günün şarkısını paylaş'} icon="music" toneColor={categoryColor.color} onPress={() => { void save(); }} loading={saving} disabled={!title.trim() || !artist.trim() || !url.trim()} compact />
        </Card>
      </>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headingText: { flex: 1 },
  headingTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  date: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2, textTransform: 'capitalize' },
  songCard: { alignItems: 'center', borderWidth: 1.5, padding: spacing.lg, marginBottom: spacing.md },
  albumArt: { width: 76, height: 76, borderRadius: radius.card, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  songTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700', textAlign: 'center' },
  artist: { color: colors.textSecondary, fontSize: fontSize.md, marginTop: spacing.xs },
  listenButton: { minWidth: 170, marginTop: spacing.md },
  emptyCard: { borderWidth: 1.5, marginBottom: spacing.md },
  form: { borderWidth: 1.5, padding: spacing.md },
  formTitle: { fontSize: fontSize.md, fontWeight: '700', marginBottom: spacing.md },
  hint: { fontSize: fontSize.xs, lineHeight: 17, color: colors.textTertiary, marginTop: -spacing.xs, marginBottom: spacing.md },
  error: { color: colors.error, fontSize: fontSize.xs, marginBottom: spacing.sm },
});
