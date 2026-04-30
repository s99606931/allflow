/**
 * ISO-8601 date helpers.
 *
 * Accepts the common BE/FE shapes (`Date | number | string`) and produces a
 * canonical UTC ISO string. `parseIso` returns `null` on failure to avoid
 * unhandled exceptions in render paths.
 */

const ISO_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

export function toIsoString(value: Date | number | string): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new RangeError('toIsoString: invalid Date');
    }
    return value.toISOString();
  }
  if (typeof value === 'number') {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      throw new RangeError('toIsoString: invalid timestamp');
    }
    return d.toISOString();
  }
  // string
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new RangeError(`toIsoString: invalid date string: ${value}`);
  }
  return new Date(parsed).toISOString();
}

export function isIsoString(value: string): boolean {
  if (typeof value !== 'string') return false;
  if (!ISO_REGEX.test(value)) return false;
  return !Number.isNaN(Date.parse(value));
}

export function parseIso(value: string): Date | null {
  if (!isIsoString(value)) return null;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return null;
  return new Date(t);
}
