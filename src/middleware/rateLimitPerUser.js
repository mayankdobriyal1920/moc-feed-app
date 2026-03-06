// Default policy: 5 requests per 60 seconds per authenticated user.
const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_MAX_REQUESTS = 5;
// Cleanup runs periodically to remove inactive user buckets from memory.
const DEFAULT_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

// Resolves the user key used for throttling. Supports both id shapes used in this app.
function getUserKey(req) {
  return req.user?.id || req.user?.userId || null;
}

/**
 * Creates per-user rate-limit middleware using an in-memory sliding window.
 * - Key: authenticated user id
 * - Limit: maxRequests within windowMs
 * - Response on exceed: 429 + { error: 'Rate limit exceeded' }
 */
function createRateLimitPerUser(options = {}) {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = options.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const cleanupIntervalMs = options.cleanupIntervalMs ?? DEFAULT_CLEANUP_INTERVAL_MS;

  // Map<userId, number[]> where each number is a request timestamp (ms).
  const requestsByUser = new Map();
  let lastCleanupAt = Date.now();

  // Evict old timestamps and remove users with no recent traffic.
  function cleanupInactiveUsers(now) {
    if (now - lastCleanupAt < cleanupIntervalMs) {
      return;
    }
    lastCleanupAt = now;

    for (const [userId, timestamps] of requestsByUser) {
      const recent = timestamps.filter((ts) => now - ts < windowMs);
      if (recent.length === 0) {
        requestsByUser.delete(userId);
      } else {
        requestsByUser.set(userId, recent);
      }
    }
  }

  function rateLimitPerUser(req, res, next) {
    const userId = getUserKey(req);
    // Auth middleware should handle unauthorized requests.
    if (!userId) {
      return next();
    }

    const now = Date.now();
    cleanupInactiveUsers(now);

    const requestTimestamps = requestsByUser.get(userId) || [];
    const recentTimestamps = requestTimestamps.filter((ts) => now - ts < windowMs);

    if (recentTimestamps.length >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - recentTimestamps[0])) / 1000));
      res.set('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    recentTimestamps.push(now);
    requestsByUser.set(userId, recentTimestamps);
    return next();
  }

  rateLimitPerUser._debug = {
    // Test/debug helpers (not used by runtime request flow).
    getTrackedUsers: () => requestsByUser.size,
    reset: () => {
      requestsByUser.clear();
      lastCleanupAt = Date.now();
    },
  };

  return rateLimitPerUser;
}

const rateLimitPerUser = createRateLimitPerUser();

module.exports = {
  rateLimitPerUser,
  createRateLimitPerUser,
};
