import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { countAccounts, listAccounts } from '../db/accounts';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler {
  return (req: Request, res: Response, _next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch((err) => {
      console.error(`[admin] ${req.method} ${req.path} failed:`, (err as Error).message);
      if (!res.headersSent) res.status(500).json({ error: 'Something went wrong.' });
    });
  };
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
  if (req.headers['x-admin-key'] !== expected) {
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
