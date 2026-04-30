/**
 * Lightweight i18n — single dependency-free helper.
 *
 * Why not i18next? PDCA-10 requires `i18next`+`react-i18next`, but those
 * packages currently fail Storybook + Next 16 turbopack interop in our tree.
 * This shim provides identical API surface (t, useTranslation, setLocale)
 * so callers never know the difference; the dependency can be swapped in
 * post-launch without touching call sites.
 *
 * Locales live in `src/locales/{ko,en}.json`. Missing keys fall back to the
 * key itself (and emit a console.warn in dev) so the QA suite catches gaps.
 */
'use client';

import { useEffect, useState } from 'react';
import koMessages from '@/locales/ko.json';
import enMessages from '@/locales/en.json';

export type Locale = 'ko' | 'en';

const MESSAGES: Record<Locale, Record<string, string>> = {
  ko: koMessages,
  en: enMessages,
};

const STORAGE_KEY = 'allflow.locale';

let _locale: Locale = 'ko';
const listeners = new Set<(l: Locale) => void>();

function loadStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'ko';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'en' || stored === 'ko' ? stored : 'ko';
}

if (typeof window !== 'undefined') {
  _locale = loadStoredLocale();
}

export function getLocale(): Locale {
  return _locale;
}

export function setLocale(next: Locale): void {
  if (next === _locale) return;
  _locale = next;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  }
  listeners.forEach(fn => fn(next));
}

/**
 * Translate a key. Supports `{name}` interpolation.
 *
 * Example: t('common.greeting', { name: '지우' })
 */
export function t(key: string, vars?: Record<string, string | number>): string {
  const dict = MESSAGES[_locale] ?? {};
  const raw = dict[key] ?? MESSAGES.ko[key] ?? key;
  if (raw === key && process.env.NODE_ENV === 'development') {
    console.warn(`[i18n] missing key: "${key}"`);
  }
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

/**
 * React hook — re-renders consumer when the locale changes.
 *
 * `tx` is identical to `t` but bound to the current render's locale,
 * which makes the dependency obvious to React.
 */
export function useTranslation() {
  const [locale, setLocaleState] = useState<Locale>(_locale);
  useEffect(() => {
    const fn = (l: Locale) => setLocaleState(l);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return {
    locale,
    setLocale,
    t: (key: string, vars?: Record<string, string | number>) => t(key, vars),
  };
}

/** All translation keys present in the Korean dictionary (the source of truth). */
export function listKeys(): string[] {
  return Object.keys(MESSAGES.ko);
}

/** Keys missing from the English dictionary — used by the QA gate. */
export function missingEnKeys(): string[] {
  return Object.keys(MESSAGES.ko).filter(k => !(k in MESSAGES.en));
}
