import jwt from 'jsonwebtoken';

const ISSUER = 'ai-wingman-server';
const AUDIENCE = 'ai-wingman-app';

function secret(): string {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters.');
  }
  return value;
}

export function assertJwtConfigured(): void {
  void secret();
}

export function signToken(accountId: string, email: string | null): string {
  return jwt.sign({ sub: accountId, email: email ?? '' }, secret(), {
    algorithm: 'HS256',
    audience: AUDIENCE,
    issuer: ISSUER,
    expiresIn: '30d',
  });
}

export function verifyToken(token: string): { sub: string; email: string } | null {
  try {
    const payload = jwt.verify(token, secret(), {
      algorithms: ['HS256'],
      audience: AUDIENCE,
      issuer: ISSUER,
    }) as { sub?: string; email?: string };
    if (!payload.sub) return null;
    return { sub: payload.sub, email: payload.email ?? '' };
  } catch {
    return null;
  }
}
