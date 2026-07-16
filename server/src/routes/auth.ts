import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import {
  findByEmail, findByAppleId, findByGoogleSubject, findById,
  createAccount, updateAccount, deleteAccount, DbAccount, hasActivePremium,
} from '../db/accounts';
import { signToken, verifyToken } from '../services/jwt';
import { verifyAppleIdentityToken, verifyGoogleIdentityToken } from '../services/oauth';
import { isRevenueCatConfigured, syncRevenueCatSubscription } from '../services/revenuecat';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// ── helpers ─────────────────────────────────────────────────────────────────

function legacyPasswordHash(password: string, salt: string): string {
  // Verification-only compatibility for old rows; a match is immediately
  // replaced with bcrypt before the login response is issued.
  // codeql[js/insufficient-password-hash]
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

function safeHexEqual(actual: string, expected: string): boolean {
  const left = Buffer.from(actual, 'hex');
  const right = Buffer.from(expected, 'hex');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function toClientAccount(a: DbAccount) {
  return {
    id: a.id,
    provider: a.provider,
    email: a.email ?? '',
    displayName: a.display_name ?? '',
    premium: hasActivePremium(a),
    seenIntro: a.seen_intro,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  };
}

const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Too many sign-in attempts. Please try again later.' },
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many account requests. Please try again later.' },
});

const subscriptionLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many membership checks. Please try again shortly.' },
});

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

router.post('/register', registrationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { email, password, displayName } = req.body as {
    email?: string; password?: string; displayName?: string;
  };
  if (!email?.trim() || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  if (password.length < 10 || password.length > 128) {
    return res.status(400).json({ error: 'Password must be between 10 and 128 characters.' });
  }
  const normalEmail = email.trim().toLowerCase();
  if (await findByEmail(normalEmail)) {
    return res.status(409).json({ error: 'An account with that email already exists. Sign in instead.' });
  }
  const hash = await bcrypt.hash(password, 12);
  const account = await createAccount({
    id: crypto.randomUUID(),
    provider: 'email',
    email: normalEmail,
    displayName: displayName?.trim() || normalEmail.split('@')[0],
    passwordHash: hash,
  });
  const token = signToken(account.id, account.email);
  return res.json({ token, account: toClientAccount(account) });
}));

// ── POST /auth/login ─────────────────────────────────────────────────────────

router.post('/login', credentialLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email?.trim() || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const account = await findByEmail(email.trim().toLowerCase());
  let passwordValid = false;
  if (account?.provider === 'email' && account.password_hash) {
    if (account.password_hash.startsWith('$2')) {
      passwordValid = await bcrypt.compare(password, account.password_hash);
    } else if (account.password_salt) {
      passwordValid = safeHexEqual(
        legacyPasswordHash(password, account.password_salt),
        account.password_hash
      );
      if (passwordValid) {
        // Transparently upgrade legacy single-round hashes after a valid login.
        await updateAccount(account.id, {
          passwordHash: await bcrypt.hash(password, 12),
          passwordSalt: '',
        });
      }
    }
  }
  if (!account || !passwordValid) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }
  const token = signToken(account.id, account.email);
  return res.json({ token, account: toClientAccount(account) });
}));

// ── POST /auth/apple ─────────────────────────────────────────────────────────

router.post('/apple', credentialLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { identityToken, displayName } = req.body as {
    identityToken?: string; displayName?: string;
  };
  if (!identityToken) return res.status(400).json({ error: 'identityToken is required.' });

  let identity;
  try {
    identity = await verifyAppleIdentityToken(identityToken);
  } catch (error) {
    console.warn('[auth] Rejected Apple identity token:', (error as Error).message);
    return res.status(401).json({ error: 'Apple identity token is invalid or expired.' });
  }

  let account = await findByAppleId(identity.subject);
  const normalEmail = identity.email || account?.email || `apple-${identity.subject}@apple.local`;
  const safeName = displayName?.trim().slice(0, 120);

  if (account) {
    account = await updateAccount(account.id, {
      email: normalEmail,
      displayName: account.display_name || safeName || normalEmail.split('@')[0],
    }) ?? account;
  } else {
    account = await createAccount({
      id: crypto.randomUUID(),
      provider: 'apple',
      email: normalEmail,
      displayName: safeName || normalEmail.split('@')[0],
      appleUserId: identity.subject,
    });
  }
  const token = signToken(account.id, account.email);
  return res.json({ token, account: toClientAccount(account) });
}));

// ── POST /auth/google ────────────────────────────────────────────────────────

router.post('/google', credentialLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { idToken } = req.body as { idToken?: string };
  if (!idToken) return res.status(400).json({ error: 'idToken is required.' });

  let identity;
  try {
    identity = await verifyGoogleIdentityToken(idToken);
  } catch (error) {
    console.warn('[auth] Rejected Google identity token:', (error as Error).message);
    return res.status(401).json({ error: 'Google identity token is invalid or expired.' });
  }
  const normalEmail = identity.email || `google-${identity.subject}@google.local`;
  const name = identity.name || normalEmail.split('@')[0];

  let account = await findByGoogleSubject(identity.subject);
  if (account) {
    account = await updateAccount(account.id, { email: normalEmail, displayName: name }) ?? account;
  } else {
    account = await createAccount({
      id: crypto.randomUUID(),
      provider: 'google',
      email: normalEmail,
      displayName: name,
      googleSubject: identity.subject,
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

// ── POST /auth/subscription/sync ─────────────────────────────────────────────

router.post('/subscription/sync', subscriptionLimiter, asyncHandler(async (req: Request, res: Response) => {
  const accountId = requireAuth(req, res);
  if (!accountId) return;
  if (!isRevenueCatConfigured()) {
    return res.status(503).json({ error: 'Membership verification is temporarily unavailable.' });
  }
  const account = await syncRevenueCatSubscription(accountId);
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
