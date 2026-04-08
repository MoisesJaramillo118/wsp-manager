import { useEffect, useRef } from 'react';

/**
 * Generic polling hook.
 * Calls `callback` immediately and then every `interval` ms.
 * Returns nothing; cleanup is automatic on unmount or dependency change.
 */
export function usePolling(
  callback: () => void | Promise<void>,
  interval: number = 10000,
  enabled: boolean = true
): void {
  const savedCallback = useRef(callback);

  // Keep the callback ref up to date
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    // Fire immediately
    savedCallback.current();

    const id = setInterval(() => {
      savedCallback.current();
    }, interval);

    return () => {
      clearInterval(id);
    };
  }, [interval, enabled]);
}
