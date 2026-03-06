const { createRateLimitPerUser } = require('../src/middleware/rateLimitPerUser');

function buildReq(userId) {
  if (!userId) {
    return {};
  }
  return { user: { id: userId } };
}

function buildRes() {
  const res = {
    headers: {},
    statusCode: null,
    body: null,
    set: jest.fn((key, value) => {
      res.headers[key] = value;
      return res;
    }),
    status: jest.fn((code) => {
      res.statusCode = code;
      return res;
    }),
    json: jest.fn((body) => {
      res.body = body;
      return res;
    }),
  };
  return res;
}

describe('rateLimitPerUser middleware', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('allows up to 5 requests and blocks the 6th with 429', () => {
    const limiter = createRateLimitPerUser({ windowMs: 60000, maxRequests: 5, cleanupIntervalMs: 1000 });
    const req = buildReq('u1');

    for (let i = 0; i < 5; i += 1) {
      const res = buildRes();
      const next = jest.fn();
      limiter(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    }

    const blockedRes = buildRes();
    const blockedNext = jest.fn();
    limiter(req, blockedRes, blockedNext);

    expect(blockedNext).not.toHaveBeenCalled();
    expect(blockedRes.status).toHaveBeenCalledWith(429);
    expect(blockedRes.body).toEqual({ error: 'Rate limit exceeded' });
    expect(Number(blockedRes.headers['Retry-After'])).toBeGreaterThan(0);
  });

  test('resets after 60 seconds', () => {
    const limiter = createRateLimitPerUser({ windowMs: 60000, maxRequests: 5, cleanupIntervalMs: 1000 });
    const req = buildReq('u1');

    for (let i = 0; i < 6; i += 1) {
      const res = buildRes();
      const next = jest.fn();
      limiter(req, res, next);
    }

    jest.setSystemTime(new Date('2026-01-01T00:01:01.000Z'));

    const res = buildRes();
    const next = jest.fn();
    limiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('uses separate buckets per user', () => {
    const limiter = createRateLimitPerUser({ windowMs: 60000, maxRequests: 5, cleanupIntervalMs: 1000 });

    for (let i = 0; i < 5; i += 1) {
      limiter(buildReq('u1'), buildRes(), jest.fn());
    }

    const user2Res = buildRes();
    const user2Next = jest.fn();
    limiter(buildReq('u2'), user2Res, user2Next);

    expect(user2Next).toHaveBeenCalledTimes(1);
    expect(user2Res.status).not.toHaveBeenCalled();
  });

  test('skips limiting when user is missing and lets auth middleware handle it', () => {
    const limiter = createRateLimitPerUser();
    const res = buildRes();
    const next = jest.fn();

    limiter(buildReq(null), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('cleans inactive users to prevent unbounded map growth', () => {
    const limiter = createRateLimitPerUser({ windowMs: 100, maxRequests: 5, cleanupIntervalMs: 50 });

    for (let i = 0; i < 100; i += 1) {
      limiter(buildReq(`u${i}`), buildRes(), jest.fn());
    }
    expect(limiter._debug.getTrackedUsers()).toBe(100);

    jest.setSystemTime(new Date('2026-01-01T00:00:01.000Z'));
    limiter(buildReq('active'), buildRes(), jest.fn());

    expect(limiter._debug.getTrackedUsers()).toBe(1);
  });

  test('burst requests remain deterministic in a single process: only first 5 pass', () => {
    const limiter = createRateLimitPerUser({ windowMs: 60000, maxRequests: 5, cleanupIntervalMs: 1000 });
    let allowed = 0;
    let blocked = 0;

    for (let i = 0; i < 10; i += 1) {
      const res = buildRes();
      const next = jest.fn();
      limiter(buildReq('burst-user'), res, next);
      if (next.mock.calls.length > 0) {
        allowed += 1;
      } else if (res.statusCode === 429) {
        blocked += 1;
      }
    }

    expect(allowed).toBe(5);
    expect(blocked).toBe(5);
  });
});
