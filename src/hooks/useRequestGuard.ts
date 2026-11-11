import { useCallback, useEffect, useRef } from 'react';

/** A slower previous fetch must not overwrite a newer snapshot or an unmounted screen. */
export function useRequestGuard() {
  const version = useRef(0);
  useEffect(
    () => () => {
      version.current += 1;
    },
    [],
  );
  return useCallback(() => {
    const request = ++version.current;
    return () => version.current === request;
  }, []);
}
