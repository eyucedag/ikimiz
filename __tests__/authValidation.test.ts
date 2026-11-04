jest.mock('@/src/lib/supabase', () => ({
  nowIso: () => new Date().toISOString(),
  supabase: { auth: { signInWithPassword: jest.fn(), signUp: jest.fn() }, rpc: jest.fn() },
}));

import { authService } from '@/src/services/authService';
import { coupleService } from '@/src/services/coupleService';
import { screenNoteService } from '@/src/services/screenNoteService';
import { supabase } from '@/src/lib/supabase';

test('giriş ve kayıt doğrulamaları Supabase çağrısından önce yapılır', async () => {
  expect((await authService.signIn('gecersiz', '123456')).error).toBeTruthy();
  expect((await authService.signIn('a@b.co', '')).error).toBeTruthy();
  expect((await authService.signUp('A', 'a@b.co', '123456')).error).toBeTruthy();
  expect((await authService.signUp('Ece', 'a@b.co', '123')).error).toBeTruthy();
  expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  expect(supabase.auth.signUp).not.toHaveBeenCalled();
});

test('davet kodu ve not uzunluğu doğrulanır', async () => {
  expect((await coupleService.acceptInvitation('u1', 'ABC')).error).toBeTruthy();
  expect(supabase.rpc).not.toHaveBeenCalled();
  const base = { senderId: 'a', senderName: 'A', coupleId: 'c', receiverId: 'b', emoji: '🌿', backgroundColor: '#fff' };
  expect((await screenNoteService.send({ ...base, text: '   ' })).error).toBeTruthy();
  expect((await screenNoteService.send({ ...base, text: 'x'.repeat(141) })).error).toBeTruthy();
});
