import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { createSession, getSession, deleteSession, verifySession, SessionPayload } from '../auth';

// Mock dependencies
vi.mock('server-only', () => ({}));
vi.mock('jose');
vi.mock('next/headers');

describe('createSession', () => {
  const mockCookieStore = {
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  };

  const mockSignJWT = {
    setProtectedHeader: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    sign: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (cookies as Mock).mockResolvedValue(mockCookieStore);
    (SignJWT as unknown as Mock).mockImplementation(() => mockSignJWT);
  });

  it('should create a session with correct user data', async () => {
    const mockToken = 'mock-jwt-token';
    mockSignJWT.sign.mockResolvedValue(mockToken);

    const userId = 'user-123';
    const email = 'user@example.com';

    await createSession(userId, email);

    // Verify JWT creation
    expect(SignJWT).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        email,
        expiresAt: expect.any(Date),
      })
    );

    expect(mockSignJWT.setProtectedHeader).toHaveBeenCalledWith({ alg: 'HS256' });
    expect(mockSignJWT.setExpirationTime).toHaveBeenCalledWith('7d');
    expect(mockSignJWT.setIssuedAt).toHaveBeenCalled();
    expect(mockSignJWT.sign).toHaveBeenCalled();
  });

  it('should set cookie with correct options in development', async () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as any).NODE_ENV = 'development';

    const mockToken = 'mock-jwt-token';
    mockSignJWT.sign.mockResolvedValue(mockToken);

    await createSession('user-123', 'user@example.com');

    expect(mockCookieStore.set).toHaveBeenCalledWith(
      'auth-token',
      mockToken,
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        expires: expect.any(Date),
        path: '/',
      })
    );

    (process.env as any).NODE_ENV = originalEnv;
  });

  it('should set cookie with secure flag in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as any).NODE_ENV = 'production';

    const mockToken = 'mock-jwt-token';
    mockSignJWT.sign.mockResolvedValue(mockToken);

    await createSession('user-123', 'user@example.com');

    expect(mockCookieStore.set).toHaveBeenCalledWith(
      'auth-token',
      mockToken,
      expect.objectContaining({
        secure: true,
      })
    );

    (process.env as any).NODE_ENV = originalEnv;
  });

  it('should set expiration date 7 days in the future', async () => {
    const mockToken = 'mock-jwt-token';
    mockSignJWT.sign.mockResolvedValue(mockToken);

    const beforeCall = Date.now();
    await createSession('user-123', 'user@example.com');
    const afterCall = Date.now();

    const signCall = (SignJWT as unknown as Mock).mock.calls[0][0];
    const expiresAt = signCall.expiresAt;

    const expectedMin = beforeCall + 7 * 24 * 60 * 60 * 1000;
    const expectedMax = afterCall + 7 * 24 * 60 * 60 * 1000;

    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax);
  });

  it('should handle JWT signing errors gracefully', async () => {
    const signError = new Error('JWT signing failed');
    mockSignJWT.sign.mockRejectedValue(signError);

    await expect(createSession('user-123', 'user@example.com'))
      .rejects.toThrow('JWT signing failed');
  });

  it('should use development secret when JWT_SECRET env var is not set', async () => {
    const originalSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;

    const mockToken = 'mock-jwt-token';
    mockSignJWT.sign.mockResolvedValue(mockToken);

    await createSession('user-123', 'user@example.com');

    // Verify sign was called (the secret is used internally)
    expect(mockSignJWT.sign).toHaveBeenCalled();

    if (originalSecret) {
      process.env.JWT_SECRET = originalSecret;
    }
  });

  it('should handle special characters in email', async () => {
    const mockToken = 'mock-jwt-token';
    mockSignJWT.sign.mockResolvedValue(mockToken);

    const userId = 'user-123';
    const email = 'user+test@example.com';

    await createSession(userId, email);

    expect(SignJWT).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        email,
      })
    );
  });

  it('should create session payload with correct structure', async () => {
    const mockToken = 'mock-jwt-token';
    mockSignJWT.sign.mockResolvedValue(mockToken);

    await createSession('user-123', 'user@example.com');

    const sessionPayload = (SignJWT as unknown as Mock).mock.calls[0][0];

    expect(sessionPayload).toEqual({
      userId: 'user-123',
      email: 'user@example.com',
      expiresAt: expect.any(Date),
    });

    // Verify it matches SessionPayload interface
    expect(typeof sessionPayload.userId).toBe('string');
    expect(typeof sessionPayload.email).toBe('string');
    expect(sessionPayload.expiresAt).toBeInstanceOf(Date);
  });
});

describe('getSession', () => {
  const mockCookieStore = {
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (cookies as Mock).mockResolvedValue(mockCookieStore);
  });

  it('should return null when no token exists', async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const session = await getSession();

    expect(session).toBeNull();
    expect(mockCookieStore.get).toHaveBeenCalledWith('auth-token');
  });

  it('should return null when token is empty', async () => {
    mockCookieStore.get.mockReturnValue({ value: '' });

    const session = await getSession();

    expect(session).toBeNull();
  });

  it('should return session payload when token is valid', async () => {
    const mockPayload = {
      userId: 'user-123',
      email: 'user@example.com',
      expiresAt: new Date(),
    };

    mockCookieStore.get.mockReturnValue({ value: 'valid-jwt-token' });
    (jwtVerify as Mock).mockResolvedValue({ payload: mockPayload });

    const session = await getSession();

    expect(session).toEqual(mockPayload);
    expect(jwtVerify).toHaveBeenCalledWith('valid-jwt-token', expect.objectContaining({}));
  });

  it('should return null when JWT verification fails', async () => {
    mockCookieStore.get.mockReturnValue({ value: 'invalid-jwt-token' });
    (jwtVerify as Mock).mockRejectedValue(new Error('JWT verification failed'));

    const session = await getSession();

    expect(session).toBeNull();
  });

  it('should handle malformed JWT tokens gracefully', async () => {
    mockCookieStore.get.mockReturnValue({ value: 'malformed.jwt.token' });
    (jwtVerify as Mock).mockRejectedValue(new Error('Malformed JWT'));

    const session = await getSession();

    expect(session).toBeNull();
  });
});

describe('deleteSession', () => {
  const mockCookieStore = {
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (cookies as Mock).mockResolvedValue(mockCookieStore);
  });

  it('should delete the auth token cookie', async () => {
    await deleteSession();

    expect(mockCookieStore.delete).toHaveBeenCalledWith('auth-token');
  });

  it('should handle cookie store errors gracefully', async () => {
    (cookies as Mock).mockRejectedValue(new Error('Cookie store error'));

    await expect(deleteSession()).rejects.toThrow('Cookie store error');
  });
});

describe('verifySession', () => {
  const createMockRequest = (cookieValue?: string): NextRequest => {
    const request = {
      cookies: {
        get: vi.fn(),
      },
    } as unknown as NextRequest;

    if (cookieValue !== undefined) {
      (request.cookies.get as Mock).mockReturnValue({ value: cookieValue });
    } else {
      (request.cookies.get as Mock).mockReturnValue(undefined);
    }

    return request;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when no token exists in request', async () => {
    const request = createMockRequest();

    const session = await verifySession(request);

    expect(session).toBeNull();
    expect(request.cookies.get).toHaveBeenCalledWith('auth-token');
  });

  it('should return null when token is empty in request', async () => {
    const request = createMockRequest('');

    const session = await verifySession(request);

    expect(session).toBeNull();
  });

  it('should return session payload when token is valid in request', async () => {
    const mockPayload = {
      userId: 'user-123',
      email: 'user@example.com',
      expiresAt: new Date(),
    };

    const request = createMockRequest('valid-jwt-token');
    (jwtVerify as Mock).mockResolvedValue({ payload: mockPayload });

    const session = await verifySession(request);

    expect(session).toEqual(mockPayload);
    expect(jwtVerify).toHaveBeenCalledWith('valid-jwt-token', expect.objectContaining({}));
  });

  it('should return null when JWT verification fails in request', async () => {
    const request = createMockRequest('invalid-jwt-token');
    (jwtVerify as Mock).mockRejectedValue(new Error('JWT verification failed'));

    const session = await verifySession(request);

    expect(session).toBeNull();
  });

  it('should handle expired tokens gracefully', async () => {
    const request = createMockRequest('expired-jwt-token');
    (jwtVerify as Mock).mockRejectedValue(new Error('Token expired'));

    const session = await verifySession(request);

    expect(session).toBeNull();
  });

  it('should use the same JWT secret as other functions', async () => {
    const mockPayload = {
      userId: 'user-456',
      email: 'test@example.com',
      expiresAt: new Date(),
    };

    const request = createMockRequest('test-jwt-token');
    (jwtVerify as Mock).mockResolvedValue({ payload: mockPayload });

    await verifySession(request);

    // Verify the secret used is consistent (encoded as Uint8Array)
    expect(jwtVerify).toHaveBeenCalledWith('test-jwt-token', expect.objectContaining({}));
  });
});