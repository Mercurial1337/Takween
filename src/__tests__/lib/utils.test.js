import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDate,
  formatRelativeTime,
  getInitials,
  truncateText,
  cn,
  debounce,
} from '@/lib/utils';

// ============================================================================
// formatDate
// ============================================================================
describe('formatDate', () => {
  it('returns empty string for falsy input', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('')).toBe('');
  });

  it('formats a valid ISO date string', () => {
    // "May 21, 2026" in en-US locale
    const result = formatDate('2026-05-21T10:00:00Z');
    expect(result).toMatch(/May\s+21,\s+2026/);
  });

  it('handles different dates correctly', () => {
    const result = formatDate('2025-01-15T00:00:00Z');
    expect(result).toMatch(/January\s+1[45],\s+2025/);
  });
});

// ============================================================================
// formatRelativeTime
// ============================================================================
describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-22T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty string for falsy input', () => {
    expect(formatRelativeTime(null)).toBe('');
    expect(formatRelativeTime('')).toBe('');
  });

  it('returns "just now" for times less than 60 seconds ago', () => {
    expect(formatRelativeTime('2026-05-22T11:59:30Z')).toBe('just now');
  });

  it('returns minutes ago', () => {
    expect(formatRelativeTime('2026-05-22T11:55:00Z')).toBe('5 minutes ago');
  });

  it('uses singular "minute" for 1 minute ago', () => {
    expect(formatRelativeTime('2026-05-22T11:59:00Z')).toBe('1 minute ago');
  });

  it('returns hours ago', () => {
    expect(formatRelativeTime('2026-05-22T09:00:00Z')).toBe('3 hours ago');
  });

  it('uses singular "hour" for 1 hour ago', () => {
    expect(formatRelativeTime('2026-05-22T11:00:00Z')).toBe('1 hour ago');
  });

  it('returns days ago', () => {
    expect(formatRelativeTime('2026-05-20T12:00:00Z')).toBe('2 days ago');
  });

  it('returns weeks ago', () => {
    expect(formatRelativeTime('2026-05-08T12:00:00Z')).toBe('2 weeks ago');
  });

  it('returns months ago', () => {
    expect(formatRelativeTime('2026-02-22T12:00:00Z')).toBe('2 months ago');
  });

  it('returns years ago', () => {
    expect(formatRelativeTime('2024-05-22T12:00:00Z')).toBe('2 years ago');
  });
});

// ============================================================================
// getInitials
// ============================================================================
describe('getInitials', () => {
  it('returns empty string for falsy input', () => {
    expect(getInitials(null)).toBe('');
    expect(getInitials(undefined)).toBe('');
    expect(getInitials('')).toBe('');
  });

  it('returns single letter for single name', () => {
    expect(getInitials('Ahmed')).toBe('A');
  });

  it('returns first and last initials for full name', () => {
    expect(getInitials('Ahmed Hassan')).toBe('AH');
  });

  it('handles multiple names (uses first and last)', () => {
    expect(getInitials('Ahmed Ali Hassan')).toBe('AH');
  });

  it('handles extra whitespace', () => {
    expect(getInitials('  Ahmed   Hassan  ')).toBe('AH');
  });

  it('returns uppercase initials', () => {
    expect(getInitials('ahmed hassan')).toBe('AH');
  });
});

// ============================================================================
// truncateText
// ============================================================================
describe('truncateText', () => {
  it('returns empty string for falsy input', () => {
    expect(truncateText(null)).toBe('');
    expect(truncateText(undefined)).toBe('');
    expect(truncateText('')).toBe('');
  });

  it('returns full text if within maxLength', () => {
    expect(truncateText('Hello', 10)).toBe('Hello');
  });

  it('returns full text if exactly at maxLength', () => {
    expect(truncateText('12345', 5)).toBe('12345');
  });

  it('truncates text exceeding maxLength with ellipsis', () => {
    expect(truncateText('Hello World!', 5)).toBe('Hello...');
  });

  it('trims trailing whitespace before adding ellipsis', () => {
    expect(truncateText('Hello World', 6)).toBe('Hello...');
  });

  it('uses default maxLength of 100', () => {
    const longText = 'a'.repeat(150);
    const result = truncateText(longText);
    expect(result).toBe('a'.repeat(100) + '...');
  });
});

// ============================================================================
// cn
// ============================================================================
describe('cn', () => {
  it('joins class names with space', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('filters out falsy values', () => {
    expect(cn('foo', null, undefined, false, '', 'bar')).toBe('foo bar');
  });

  it('returns empty string when all values are falsy', () => {
    expect(cn(null, undefined, false, '')).toBe('');
  });

  it('works with a single class name', () => {
    expect(cn('solo')).toBe('solo');
  });
});

// ============================================================================
// debounce
// ============================================================================
describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delays function execution', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('resets timer on subsequent calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced();
    vi.advanceTimersByTime(100);
    debounced(); // reset
    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('passes arguments to the original function', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('a', 'b');
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith('a', 'b');
  });

  it('uses default delay of 300ms', () => {
    const fn = vi.fn();
    const debounced = debounce(fn);

    debounced();
    vi.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledOnce();
  });
});
