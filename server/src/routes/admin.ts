import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { countAccounts, listAccounts } from '../db/accounts';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();
router.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many admin requests.' },
}));

function safeEqual(actual: string, expected: string): boolean {
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

// Shared-secret gate. The Cloudflare admin dashboard worker calls these with an
// `x-admin-key` header. If ADMIN_API_KEY is not configured the endpoints reject
// everything, so they can never be accidentally left open.
function requireAdminKey(req: Request, res: Response): boolean {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) {
    res.status(503).json({ error: 'Admin API not configured' });
    return false;
  }
  const provided = req.headers['x-admin-key'];
  if (typeof provided !== 'string' || !safeEqual(provided, expected)) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

// Account totals from Postgres — the real signups (Apple/Google/email),
// which live here, not in the worker's D1 database.
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  if (!requireAdminKey(req, res)) return;
  const { total, premium } = await countAccounts();
  res.json({ accounts: total, premium });
}));

router.get('/accounts', asyncHandler(async (req: Request, res: Response) => {
  if (!requireAdminKey(req, res)) return;
  const accounts = await listAccounts(200);
  res.json({ accounts });
}));

export default router;
