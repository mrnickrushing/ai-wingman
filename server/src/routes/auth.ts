import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  findByEmail, findByAppleId, findByGoogleSubject, findById,
  createAccount, updateAccount, deleteAccount, DbAccount,
} from '../db/accounts';
import { signToken, verifyToken } from '../services/jwt';

const router = Router();

// Wrap an async handler so a rejected promise (e.g. a transient DB error)
// returns a 500 JSON response instead of becoming an unhandled rejection that
// hangs the request or crashes the process.
function asyncHandler(fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler {
  return (req: Request, res: Response, _next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch((err) => {
      console.error(`[auth] ${req.method} ${req.path} failed:`, (err as Error).message);
      if (!res.headersSent) res.status(500).json({ error: 'Something went wrong. Please try again.' });
    });
  };
}

// ── helpers ─────────────────────────────────────────────────────────────────

function hashPassword(password: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

function newSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

function decodeJwtPayload<T>(token: string): T | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    return JSON.parse(Buffer.from(part, 'base64url').toString()) as T;
  } catch {
    return null;
  }
}

function toClientAccount(a: DbAccount) {
  return {
    id: a.id,
    provider: a.provider,
    email: a.email ?? '',
    displayName: a.display_name ?? '',
    premium: a.premium,
    seenIntro: a.seen_intro,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  };
}

function authHeader(req: Request): string | null {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  return h.slice(7);
}

function requireAuth(req: Request, res: Response): string | null {
  const token = authHeader(req);
  if (!token) { res.status(401).json({ error: 'Missing token' }); return null; }
  const payload = verifyToken(token);
  if (!payload) { res.status(401).json({ error: 'Invalid or expired token' }); return null; }
  return payload.sub;
}

// ── POST /auth/register ──────────────────────────────────────────────────────

router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const { email, password, displayName } = req.body as {
    email?: string; password?: string; displayName?: string;
  };
  if (!email?.trim() || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const normalEmail = email.trim().toLowerCase();
  if (await findByEmail(normalEmail)) {
    return res.status(409).json({ error: 'An account with that email already exists. Sign in instead.' });
  }
  const salt = newSalt();
  const hash = hashPassword(password, salt);
  const account = await createAccount({
    id: uuidv4(),
    provider: 'email',
    email: normalEmail,
    displayName: displayName?.trim() || normalEmail.split('@')[0],
    passwordHash: hash,
    passwordSalt: salt,
  });
  const token = signToken(account.id, account.email);
  return res.json({ token, account: toClientAccount(account) });
}));

// ── POST /auth/login ─────────────────────────────────────────────────────────

router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email?.trim() || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const account = await findByEmail(email.trim().toLowerCase());
  if (
    !account
    || account.provider !== 'email'
    || !account.password_hash
    || !account.password_salt
    || hashPassword(password, account.password_salt) !== account.password_hash
  ) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }
  const token = signToken(account.id, account.email);
  return res.json({ token, account: toClientAccount(account) });
}));

// ── POST /auth/apple ─────────────────────────────────────────────────────────

router.post('/apple', asyncHandler(async (req: Request, res: Response) => {
  const { userId, email, displayName } = req.body as {
    userId?: string; email?: string; displayName?: string;
  };
  if (!userId) return res.status(400).json({ error: 'userId is required.' });

  let account = await findByAppleId(userId);
  const normalEmail = email?.trim().toLowerCase() || `apple-${userId}@apple.local`;

  if (account) {
    account = await updateAccount(account.id, {
      email: normalEmail,
      displayName: displayName?.trim() || account.display_name || normalEmail.split('@')[0],
    }) ?? account;
  } else {
    account = await createAccount({
      id: uuidv4(),
      provider: 'apple',
      email: normalEmail,
      displayName: displayName?.trim() || normalEmail.split('@')[0],
      appleUserId: userId,
    });
  }
  const token = signToken(account.id, account.email);
  return res.json({ token, account: toClientAccount(account) });
}));

// ── POST /auth/google ────────────────────────────────────────────────────────

router.post('/google', asyncHandler(async (req: Request, res: Response) => {
  const { idToken, fallbackEmail, fallbackName } = req.body as {
    idToken?: string; fallbackEmail?: string; fallbackName?: string;
  };
  if (!idToken) return res.status(400).json({ error: 'idToken is required.' });

  const payload = decodeJwtPayload<{ sub?: string; email?: string; name?: string }>(idToken);
  const subject = payload?.sub ?? idToken.slice(0, 32);
  const normalEmail = (payload?.email ?? fallbackEmail ?? `google-${subject.slice(0, 16)}@google.local`).toLowerCase();
  const name = payload?.name ?? fallbackName ?? normalEmail.split('@')[0];

  let account = await findByGoogleSubject(subject);
  if (account) {
    account = await updateAccount(account.id, { email: normalEmail, displayName: name }) ?? account;
  } else {
    account = await createAccount({
      id: uuidv4(),
      provider: 'google',
      email: normalEmail,
      displayName: name,
      googleSubject: subject,
    });
  }
  const token = signToken(account.id, account.email);
  return res.json({ token, account: toClientAccount(account) });
}));

// ── GET /auth/me ─────────────────────────────────────────────────────────────

router.get('/me', asyncHandler(async (req: Request, res: Response) => {
  const accountId = requireAuth(req, res);
  if (!accountId) return;
  const account = await findById(accountId);
  if (!account) return res.status(404).json({ error: 'Account not found.' });
  return res.json({ account: toClientAccount(account) });
}));

// ── PATCH /auth/premium ──────────────────────────────────────────────────────

router.patch('/premium', asyncHandler(async (req: Request, res: Response) => {
  const accountId = requireAuth(req, res);
  if (!accountId) return;
  const account = await updateAccount(accountId, { premium: true });
  if (!account) return res.status(404).json({ error: 'Account not found.' });
  return res.json({ account: toClientAccount(account) });
}));

// ── PATCH /auth/seen-intro ───────────────────────────────────────────────────

router.patch('/seen-intro', asyncHandler(async (req: Request, res: Response) => {
  const accountId = requireAuth(req, res);
  if (!accountId) return;
  const account = await updateAccount(accountId, { seenIntro: true });
  if (!account) return res.status(404).json({ error: 'Account not found.' });
  return res.json({ account: toClientAccount(account) });
}));

// ── DELETE /auth/account ─────────────────────────────────────────────────────

router.delete('/account', asyncHandler(async (req: Request, res: Response) => {
  const accountId = requireAuth(req, res);
  if (!accountId) return;
  await deleteAccount(accountId);
  return res.json({ ok: true });
}));

export default router;
