// Mock modda uçtan uca servis akışı: kayıt → davet → kabul → not → bildirim → sonlandırma
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import { mockStore } from '@/src/lib/mock-store';
import { authService } from '@/src/services/authService';
import { coupleService } from '@/src/services/coupleService';
import { notificationService } from '@/src/services/notificationService';
import { screenNoteService } from '@/src/services/screenNoteService';

beforeEach(() => mockStore.reset());

test('mock mod etkin', () => {
  expect(authService.isMockMode).toBe(true);
});

test('kayıt, giriş ve doğrulama hataları', async () => {
  expect((await authService.signUp('A', 'x', '1')).error).toBeTruthy();
  const ece = await authService.signUp('Ece Yücedağ', 'ece@ornek.com', '123456');
  expect(ece.data?.displayName).toBe('Ece');
  expect((await authService.signUp('Ece', 'ece@ornek.com', '123456')).error).toMatch(/zaten/);
  await authService.signOut();
  expect(await authService.getCurrentUser()).toBeNull();
  expect((await authService.signIn('ece@ornek.com', 'yanlis')).error).toBeTruthy();
  expect((await authService.signIn('ECE@ornek.com', '123456')).data?.email).toBe('ece@ornek.com');
});

test('davet, kabul, not gönderme ve sonlandırma', async () => {
  const a = (await authService.signUp('Ece Yücedağ', 'ece@ornek.com', '123456')).data!;
  const inv = (await coupleService.createInvitation(a)).data!;
  expect(inv.code).toHaveLength(6);
  expect((await coupleService.acceptInvitation(a.id, inv.code)).error).toMatch(/Kendi/);

  const b = (await authService.signUp('Deniz Kaya', 'deniz@ornek.com', '123456')).data!;
  expect((await coupleService.acceptInvitation(b.id, 'ZZZZZZ')).error).toBeTruthy();
  expect((await coupleService.acceptInvitation(b.id, inv.code.toLowerCase())).error).toBeUndefined();

  const stateA = await coupleService.getState(a.id);
  expect(stateA.partner?.id).toBe(b.id);
  expect(stateA.pendingInvitation).toBeNull();

  const sent = await screenNoteService.send({
    senderId: b.id,
    senderName: b.displayName,
    coupleId: stateA.couple!.id,
    receiverId: a.id,
    text: 'Akşam görüşürüz',
    emoji: '🌙',
    backgroundColor: '#F0EBE3',
  });
  expect(sent.data?.text).toBe('Akşam görüşürüz');
  expect(await screenNoteService.list(a.id, stateA.couple!.id)).toHaveLength(1);

  const notifs = await notificationService.list(a.id);
  expect(notifs.some((n) => n.category === 'screen_note')).toBe(true);
  await notificationService.markAllRead(a.id);
  expect((await notificationService.list(a.id)).every((n) => n.readAt)).toBe(true);

  expect((await coupleService.endCouple(a.id)).error).toBeUndefined();
  expect((await coupleService.getState(b.id)).couple).toBeNull();
});

test('demo partner simülasyonu karşılama notu bırakır', async () => {
  const t = (await authService.signInAsTestUser()).data!;
  expect((await coupleService.simulatePartnerAccept(t.id)).error).toBeTruthy();
  await coupleService.createInvitation(t);
  expect((await coupleService.simulatePartnerAccept(t.id)).error).toBeUndefined();
  const state = await coupleService.getState(t.id);
  expect(state.partner?.displayName).toBe('Deniz');
  const notes = await screenNoteService.list(t.id, state.couple!.id);
  expect(notes[0].senderId).toBe(state.partner!.id);
});
