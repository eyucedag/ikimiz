import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { CoupleLoading, EmptyState, Screen } from '@/src/components/ui';
import { getCategoryColor } from '@/src/constants/categories';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';
import { listService, SharedList } from '@/src/services/listService';

const BOOK_LIST_TITLE = 'Okuyacağımız Kitaplar';

export default function BooksListShortcut() {
  const router = useRouter();
  const { user } = useAuth();
  const couple = useCouple();
  const tone = getCategoryColor('listeler');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const coupleId = couple.couple?.id;
  const partnerId = couple.partner?.id;

  useEffect(() => {
    if (couple.loading) return;
    if (!user?.id || !coupleId || !partnerId) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const lists = await listService.list(coupleId);
        let bookList: SharedList | undefined = lists.find((item) => item.title.trim().toLocaleLowerCase('tr-TR') === BOOK_LIST_TITLE.toLocaleLowerCase('tr-TR'));
        if (!bookList) {
          bookList = await listService.create({ ownerId: user.id, partnerId, coupleId, title: BOOK_LIST_TITLE, kind: 'wish' });
        }
        if (active) router.replace({ pathname: '/lists/[id]', params: { id: bookList.id } });
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Kitap listesi açılamadı.');
          setLoading(false);
        }
      }
    })();
    return () => { active = false; };
  }, [attempt, couple.loading, coupleId, partnerId, user?.id, router]);

  if (couple.loading || loading) return <Screen title={BOOK_LIST_TITLE} toneColor={tone.color}><CoupleLoading /></Screen>;
  if (!couple.isPaired || !coupleId) return <Screen title={BOOK_LIST_TITLE} toneColor={tone.color}><EmptyState icon="users" toneColor={tone.color} toneTint={tone.tint} title="Önce eşleşin" description="Okuma listenizi partnerinizle paylaşmak için eşleşmeniz gerekiyor." actionLabel="Partner davet et" onAction={() => router.push('/couple/invite')} /></Screen>;
  return <Screen title={BOOK_LIST_TITLE} toneColor={tone.color}><EmptyState icon="book-open" toneColor={tone.color} toneTint={tone.tint} title="Liste açılamadı" description={error || 'Lütfen yeniden deneyin.'} actionLabel="Yeniden dene" onAction={() => { setError(''); setAttempt((value) => value + 1); }} /></Screen>;
}
