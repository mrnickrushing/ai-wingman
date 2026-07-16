import { Router, Request, Response } from 'express';
import { verifyToken } from '../services/jwt';
import { getAccountMemory } from '../db/accountMemory';
import { listSessionsByAccount } from '../db/sessions';
import { asyncHandler } from '../middleware/asyncHandler';

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

router.get('/brief', asyncHandler(async (req: Request, res: Response) => {
  const accountId = requireAccountId(req, res);
  if (!accountId) return;

  const memory = await getAccountMemory(accountId);
  const sessions = await listSessionsByAccount(accountId, 5);
  const latest = sessions[0] ?? null;

  const followUps = memory.followUps.slice(0, 6);
  const latestSummary = (() => {
    if (memory.lastSummary) return memory.lastSummary;
    if (!latest?.analysis_json) return '';
    try {
      const parsed = JSON.parse(latest.analysis_json) as { summary?: string };
      return parsed.summary ?? '';
    } catch {
      return '';
    }
  })();
  const brief = {
    title: latest?.title || 'Prep brief',
    summary: latestSummary || 'No stored memory yet.',
    nextMove: followUps[0]?.text
      ?? memory.callbackTopics[0]
      ?? memory.interests[0]
      ?? latest?.title
      ?? 'Start a new session to build memory.',
  };

  return res.json({
    memory,
    recentSessions: sessions.map((session) => ({
      id: session.id,
      title: session.title,
      mode: session.mode,
      score: session.score,
      createdAt: session.created_at,
      summary: (() => {
        if (!session.analysis_json) return '';
        try {
          const parsed = JSON.parse(session.analysis_json) as { summary?: string };
          return parsed.summary ?? '';
        } catch {
          return '';
        }
      })(),
    })),
    followUps,
    brief,
  });
}));

export default router;
