import { Router, Request, Response } from 'express';
import { generateTextMessageCoaching } from '../services/claude';
import { verifyToken } from '../services/jwt';

const router = Router();

function authHeader(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7);
}

function requireAccountId(req: Request, res: Response): string | null {
  const token = authHeader(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return null;
  }
  const payload = verifyToken(token);
  if (!payload?.sub) {
    res.status(401).json({ error: 'Invalid or expired token.' });
    return null;
  }
  return payload.sub;
}

router.post('/text', async (req: Request, res: Response) => {
  const accountId = requireAccountId(req, res);
  if (!accountId) return;

  const {
    thread,
    latestMessage,
    goal,
    relationship,
    tone,
    length,
  } = req.body as {
    thread?: string;
    latestMessage?: string;
    goal?: string;
    relationship?: string;
    tone?: string;
    length?: 'short' | 'balanced' | 'warm' | 'direct';
  };

  if (!thread?.trim() && !latestMessage?.trim()) {
    return res.status(400).json({ error: 'A thread or latest message is required.' });
  }

  const suggestion = await generateTextMessageCoaching({
    thread: thread ?? '',
    latestMessage: latestMessage ?? '',
    goal: goal ?? '',
    relationship: relationship ?? '',
    tone: tone ?? 'balanced',
    length: length ?? 'balanced',
  });

  if (!suggestion) {
    return res.status(502).json({ error: 'Could not generate a text reply right now.' });
  }

  return res.json({
    suggestion,
    accountId,
  });
});

export default router;
