import { authService } from '@/src/services/authService';
import { supabase } from '@/src/lib/supabase';

jest.mock('@/src/lib/supabase', () => ({ supabase: { auth: { onAuthStateChange: jest.fn() } } }));

test('auth listeners return before issuing new session/profile requests', () => {
  jest.useFakeTimers();
  let listener!: () => void;
  const unsubscribe = jest.fn();
  (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
    listener = callback;
    return { data: { subscription: { unsubscribe } } };
  });
  const callback = jest.fn();
  const stop = authService.onAuthChange(callback);
  expect(listener()).toBeUndefined();
  expect(callback).not.toHaveBeenCalled();
  jest.runOnlyPendingTimers();
  expect(callback).toHaveBeenCalledTimes(1);
  listener();
  stop();
  jest.runOnlyPendingTimers();
  expect(callback).toHaveBeenCalledTimes(1);
  expect(unsubscribe).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});
