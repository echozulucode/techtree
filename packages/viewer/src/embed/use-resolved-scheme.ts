import { useCallback, useSyncExternalStore, type RefObject } from 'react';
import type { ColorScheme } from './types.js';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Resolve the `colorScheme` prop to 'light' | 'dark' for React Flow's
 * `colorMode` (which puts that class on its container). 'system' follows a
 * `.dark` / `.light` class on an ancestor (class-based host themes such as
 * next-themes), else `prefers-color-scheme` — the same rules as the
 * stylesheet — so the class React Flow adds never contradicts the host theme.
 *
 * Server render and hydration use 'light' for 'system' (React Flow's own
 * default); the real value is read right after hydration.
 */
export function useResolvedColorScheme(
  scheme: ColorScheme,
  rootRef: RefObject<HTMLElement | null>,
): 'light' | 'dark' {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (scheme !== 'system' || typeof window === 'undefined') return () => {};
      const mq = typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : null;
      mq?.addEventListener?.('change', onChange);
      const mo = typeof MutationObserver === 'function' ? new MutationObserver(onChange) : null;
      // Host theme switchers toggle a class on <html> or <body>.
      for (const el of [document.documentElement, document.body]) {
        if (el) mo?.observe(el, { attributes: true, attributeFilter: ['class'] });
      }
      return () => {
        mq?.removeEventListener?.('change', onChange);
        mo?.disconnect();
      };
    },
    [scheme],
  );
  const getSnapshot = (): 'light' | 'dark' => {
    if (scheme !== 'system') return scheme;
    const themed = rootRef.current?.parentElement?.closest('.dark, .light');
    if (themed) return themed.classList.contains('dark') ? 'dark' : 'light';
    return typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(DARK_QUERY).matches
      ? 'dark'
      : 'light';
  };
  const getServerSnapshot = (): 'light' | 'dark' => (scheme === 'system' ? 'light' : scheme);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
