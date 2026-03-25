'use strict';

const request = require('supertest');

describe('GET / (health)', () => {
  test('returns service health payload', async () => {
    const app = require('./src/app');

    const resp = await request(app).get('/');

    expect(resp.status).toBe(200);
    expect(resp.type).toMatch(/json/);
    expect(resp.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        message: 'Service is healthy',
        environment: expect.any(String),
        timestamp: expect.any(String),
      })
    );
  });
});
