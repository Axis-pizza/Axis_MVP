/**
 * Detect if the user is on Android Chrome (where MWA works).
 * MWA is supported on Android Chrome only — not iOS Safari, not Brave, not Firefox.
 */
export const isAndroidChrome = (): boolean =>
  typeof navigator !== 'undefined' &&
  /Android/i.test(navigator.userAgent) &&
  /Chrome/i.test(navigator.userAgent) &&
  !/Brave/i.test(navigator.userAgent);

/**
 * Detect if running inside a Trusted Web Activity (Bubblewrap APK).
 * TWAs set document.referrer to '' and have no navigation bar.
 */
export const isTWA = (): boolean =>
  isAndroidChrome() &&
  typeof window !== 'undefined' &&
  window.matchMedia('(display-mode: standalone)').matches;
