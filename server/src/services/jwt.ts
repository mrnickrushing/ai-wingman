import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-prod';

export function signToken(accountId: string, email: string | null): string {
  return jwt.sign({ sub: accountId, email: email ?? '' }, SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): { sub: string; email: string } | null {
  try {
    return jwt.verify(token, SECRET) as { sub: string; email: string };
  } catch {
    return null;
  }
}
