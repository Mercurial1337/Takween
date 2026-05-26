import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRateLimiter, getClientIp } from '@/lib/rateLimit';

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests within the limit', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 3 });

    const r1 = limiter.check('user-1');
    expect(r1.success).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = limiter.check('user-1');
    expect(r2.success).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = limiter.check('user-1');
    expect(r3.success).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('blocks requests exceeding the limit', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 2 });

    limiter.check('user-1');
    limiter.check('user-1');

    const r3 = limiter.check('user-1');
    expect(r3.success).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it('resets after the window expires', () => {
    const limiter = createRateLimiter({ windowMs: 1_000, maxRequests: 1 });

    const r1 = limiter.check('user-1');
    expect(r1.success).toBe(true);

    const r2 = limiter.check('user-1');
    expect(r2.success).toBe(false);

    // Advance time past the window
    vi.advanceTimersByTime(1_001);

    const r3 = limiter.check('user-1');
    expect(r3.success).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('tracks different keys independently', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 1 });

    const r1 = limiter.check('user-a');
    expect(r1.success).toBe(true);

    const r2 = limiter.check('user-b');
    expect(r2.success).toBe(true);

    const r3 = limiter.check('user-a');
    expect(r3.success).toBe(false);
  });

  it('returns correct resetIn value', () => {
    const limiter = createRateLimiter({ windowMs: 5_000, maxRequests: 1 });

    limiter.check('user-1');
    vi.advanceTimersByTime(2_000);

    const r2 = limiter.check('user-1');
    expect(r2.success).toBe(false);
    // Should be approximately 3000ms remaining in the window
    expect(r2.resetIn).toBeLessThanOrEqual(3_000);
    expect(r2.resetIn).toBeGreaterThan(0);
  });
});

describe('getClientIp', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const request = {
      headers: new Map([
        ['x-forwarded-for', '192.168.1.1, 10.0.0.1'],
      ]),
    };
    // Simulate Headers API
    request.headers.get = (key) => {
      const map = { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' };
      return map[key] || null;
    };

    expect(getClientIp(request)).toBe('192.168.1.1');
  });

  it('falls back to x-real-ip', () => {
    const request = {
      headers: {
        get: (key) => {
          if (key === 'x-real-ip') return '10.0.0.5';
          return null;
        },
      },
    };

    expect(getClientIp(request)).toBe('10.0.0.5');
  });

  it('returns fallback IP when no headers present', () => {
    const request = {
      headers: {
        get: () => null,
      },
    };

    expect(getClientIp(request)).toBe('127.0.0.1');
  });
});
