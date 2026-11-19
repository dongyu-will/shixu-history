import { useCallback, useEffect, useState } from 'react';

export const THEME_STORAGE_KEY = 'shixu-theme';
export const THEME_COLORS = {
  light: '#ffffff',
  dark: '#0c1829',
};

export function normalizeTheme(value) {
  return value === 'dark' ? 'dark' : 'light';
}

export function nextTheme(current) {
  return normalizeTheme(current) === 'dark' ? 'light' : 'dark';
}

export function readStoredTheme(storage = globalThis.localStorage) {
  try {
    const saved = storage?.getItem(THEME_STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch {
    return null;
  }
}

export function applyTheme(theme, { doc = globalThis.document, storage = globalThis.localStorage, persist = false } = {}) {
  const normalized = normalizeTheme(theme);
  if (doc?.documentElement) {
    doc.documentElement.dataset.theme = normalized;
  }
  doc?.querySelector?.('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[normalized]);
  if (persist) {
    try {
      storage?.setItem(THEME_STORAGE_KEY, normalized);
    } catch {
      // Keep the current tab switchable even when browser storage is blocked.
    }
  }
  return normalized;
}

export function useTheme() {
  const [theme, setTheme] = useState(() => normalizeTheme(globalThis.document?.documentElement?.dataset?.theme));

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      setTheme(normalizeTheme(event.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => applyTheme(nextTheme(current), { persist: true }));
  }, []);

  return [theme, toggleTheme];
}
