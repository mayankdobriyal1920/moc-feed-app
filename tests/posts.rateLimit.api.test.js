const request = require('supertest');

function loadAppWithDbMock() {
  jest.resetModules();

  const pool = {
    execute: jest.fn(),
    getConnection: jest.fn(),
  };

  jest.doMock('../src/config/db', () => ({
    pool,
    waitForDb: jest.fn(),
  }));

  const app = require('../src/app');
  return { app, pool };
}

describe('POST /posts rate limiting', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('allows 5 requests per minute and blocks the 6th with 429', async () => {
    const { app, pool } = loadAppWithDbMock();
    pool.execute.mockResolvedValue([{}]);

    for (let i = 0; i < 5; i += 1) {
      const res = await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer mock-userA')
        .send({ text: `hello ${i}` });

      expect(res.status).toBe(201);
    }

    const blocked = await request(app)
      .post('/posts')
      .set('Authorization', 'Bearer mock-userA')
      .send({ text: 'blocked attempt' });

    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: 'Rate limit exceeded' });
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect(pool.execute).toHaveBeenCalledTimes(5);
  });

  test('rate limit is per user, not global', async () => {
    const { app, pool } = loadAppWithDbMock();
    pool.execute.mockResolvedValue([{}]);

    for (let i = 0; i < 5; i += 1) {
      await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer mock-userA')
        .send({ text: `userA ${i}` });
    }

    const userBResponse = await request(app)
      .post('/posts')
      .set('Authorization', 'Bearer mock-userB')
      .send({ text: 'userB still allowed' });

    expect(userBResponse.status).toBe(201);
  });

  test('limit resets after 60 seconds', async () => {
    const { app, pool } = loadAppWithDbMock();
    pool.execute.mockResolvedValue([{}]);

    for (let i = 0; i < 6; i += 1) {
      await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer mock-userA')
        .send({ text: `try ${i}` });
    }

    jest.setSystemTime(new Date('2026-01-01T00:01:01.000Z'));

    const afterWindow = await request(app)
      .post('/posts')
      .set('Authorization', 'Bearer mock-userA')
      .send({ text: 'allowed again' });

    expect(afterWindow.status).toBe(201);
  });

  test('unauthorized requests are rejected by auth middleware', async () => {
    const { app } = loadAppWithDbMock();

    const res = await request(app)
      .post('/posts')
      .send({ text: 'no auth header' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Unauthorized' });
  });

  test('invalid payload returns 400', async () => {
    const { app, pool } = loadAppWithDbMock();
    pool.execute.mockResolvedValue([{}]);

    const res = await request(app)
      .post('/posts')
      .set('Authorization', 'Bearer mock-userA')
      .send({ text: '' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation error');
  });
});
