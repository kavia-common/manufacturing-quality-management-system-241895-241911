'use strict';

describe('src/auth', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // ensure module reads fresh env each time
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test('signAccessToken throws when JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET;
    const { signAccessToken } = require('./src/auth');
    expect(() => signAccessToken({ sub: 'u1' })).toThrow(/JWT_SECRET/);
  });

  test('signAccessToken and verifyAccessToken roundtrip payload', () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '1h';

    const { signAccessToken, verifyAccessToken } = require('./src/auth');

    const token = signAccessToken({ sub: 'user-123', email: 'a@b.com', role: 'QUALITY_ENGINEER' });
    const decoded = verifyAccessToken(token);

    expect(decoded.sub).toBe('user-123');
    expect(decoded.email).toBe('a@b.com');
    expect(decoded.role).toBe('QUALITY_ENGINEER');
  });

  test('hashPassword + verifyPassword work together', async () => {
    process.env.JWT_SECRET = 'test-secret'; // not needed, but keeps env consistent
    process.env.BCRYPT_SALT_ROUNDS = '4'; // faster test

    const { hashPassword, verifyPassword } = require('./src/auth');

    const hash = await hashPassword('ChangeMe123!');
    expect(typeof hash).toBe('string');
    expect(hash).toMatch(/^\$2[aby]\$/);

    await expect(verifyPassword('ChangeMe123!', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong', hash)).resolves.toBe(false);
  });
});
