const limiters = new Map();

export function createRateLimiter({ windowMs = 60_000, maxRequests = 10 } = {}) {
  const store = new Map();

  // Periodic cleanup of expired entries (every 5 minutes)
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now - entry.windowStart >= windowMs) {
        store.delete(key);
      }
    }
  }, 5 * 60_000);

  // Prevent the interval from keeping Node alive in serverless
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return {
    check(key) {
      const now = Date.now();
      let entry = store.get(key);

      if (!entry || now - entry.windowStart >= windowMs) {
        // Start a new window
        entry = { windowStart: now, count: 0 };
        store.set(key, entry);
      }

      entry.count++;

      const remaining = Math.max(0, maxRequests - entry.count);
      const resetIn = Math.max(0, windowMs - (now - entry.windowStart));

      return {
        success: entry.count <= maxRequests,
        remaining,
        resetIn,
      };
    },
  };
}

export function getRateLimiter(name, options) {
  if (!limiters.has(name)) {
    limiters.set(name, createRateLimiter(options));
  }
  return limiters.get(name);
}

export function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}
