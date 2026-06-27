import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createSession, listSessionsByAccount, getSessionById, getSessionStats, DbSession } from '../db/sessions';
import { upsertAccountMemory } from '../db/accountMemory';
import { verifyToken } from '../services/jwt';
import { analyzeSession, SessionAnalysis } from '../services/claude';

const router = Router();

function authHeader(req: Request): string | null {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  return h.slice(7);
}

function optionalAccountId(req: Request): string | null {
  const token = authHeader(req);
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.sub ?? null;
}

function requireAccountId(req: Request, res: Response): string | null {
  const accountId = optionalAccountId(req);
  if (!accountId) { res.status(401).json({ error: 'Authentication required.' }); return null; }
  return accountId;
}

function toClientSession(s: DbSession) {
  return {
    id: s.id,
    mode: s.mode,
    title: s.title,
    durationSeconds: s.duration_seconds,
    wordsSpoken: s.words_spoken,
    coachingCount: s.coaching_count,
    score: s.score,
    rating: s.rating,
    analysis: s.analysis_json ? (JSON.parse(s.analysis_json) as SessionAnalysis) : null,
    transcriptText: s.transcript_text,
    createdAt: s.created_at,
  };
}

// ── POST /sessions ──────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
  const accountId = optionalAccountId(req);

  const {
    mode, title, durationSeconds, wordsSpoken, coachingCount,
    score, rating, transcriptText, coachingItems, context,
  } = req.body as {
    mode?: string;
    title?: string;
    durationSeconds?: number;
    wordsSpoken?: number;
    coachingCount?: number;
    score?: number;
    rating?: number;
    transcriptText?: string;
    coachingItems?: string[];
    context?: Record<string, string>;
  };

  if (!mode) return res.status(400).json({ error: 'mode is required.' });

  const analysis = await analyzeSession({
    mode,
    transcriptText: transcriptText ?? '',
    coachingItems: coachingItems ?? [],
    context: context ?? {},
  });

  const session = await createSession({
    id: uuidv4(),
    accountId: accountId ?? null,
    mode,
    title: title ?? '',
    durationSeconds: durationSeconds ?? 0,
    wordsSpoken: wordsSpoken ?? 0,
    coachingCount: coachingCount ?? 0,
    score: score ?? 0,
    rating: rating ?? 0,
    transcriptText: transcriptText ?? '',
    coachingJson: JSON.stringify(coachingItems ?? []),
    analysisJson: analysis ? JSON.stringify(analysis) : null,
  });

  if (accountId && analysis) {
    await upsertAccountMemory({
      accountId,
      mode,
      sessionId: session.id,
      title: title ?? '',
      summary: analysis.summary,
      interests: analysis.memory?.interests ?? [],
      personalDetails: analysis.memory?.personalDetails ?? [],
      callbackTopics: analysis.memory?.callbackTopics ?? [],
      followUps: analysis.followUps ?? [],
    }).catch((err) => {
      console.warn('[sessions] memory upsert failed:', (err as Error).message);
    });
  }

  return res.json({ session: toClientSession(session) });
});

// ── GET /sessions/stats ─────────────────────────────────────────────────────

router.get('/stats', async (req: Request, res: Response) => {
  const accountId = requireAccountId(req, res);
  if (!accountId) return;
  const stats = await getSessionStats(accountId);
  return res.json(stats);
});

// ── GET /sessions ───────────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  const accountId = requireAccountId(req, res);
  if (!accountId) return;
  const sessions = await listSessionsByAccount(accountId);
  return res.json({ sessions: sessions.map(toClientSession) });
});

// ── GET /sessions/:id ───────────────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  const accountId = requireAccountId(req, res);
  if (!accountId) return;
  const session = await getSessionById(String(req.params.id));
  if (!session) return res.status(404).json({ error: 'Session not found.' });
  if (session.account_id && session.account_id !== accountId) {
    return res.status(403).json({ error: 'Forbidden.' });
  }
  return res.json({ session: toClientSession(session) });
});

export default router;
