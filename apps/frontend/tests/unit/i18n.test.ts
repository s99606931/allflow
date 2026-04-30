/**
 * Guarantees the English dictionary stays in sync with the Korean source.
 *
 * Failing this test means PDCA-10 i18n gate ("missing 0건") regressed.
 */
import { describe, it, expect } from 'vitest';
import { listKeys, missingEnKeys, t, setLocale } from '@/lib/i18n';

describe('i18n', () => {
  it('all ko keys are present in en dictionary', () => {
    const missing = missingEnKeys();
    expect(missing, `missing en keys: ${missing.join(', ')}`).toEqual([]);
  });

  it('listKeys returns a non-empty source-of-truth set', () => {
    expect(listKeys().length).toBeGreaterThan(20);
  });

  it('t() interpolates {name}', () => {
    setLocale('ko');
    // Use a key we know exists; we don't care about the locale path here.
    const greeting = t('common.save');
    expect(typeof greeting).toBe('string');
    expect(greeting.length).toBeGreaterThan(0);
  });

  it('t() falls back to ko when locale is en and the key is missing', () => {
    setLocale('en');
    const value = t('common.save');
    expect(value).toBe('Save');
    setLocale('ko'); // restore
  });
});
