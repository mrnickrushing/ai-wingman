import { Router, Request, Response } from 'express';
import { generateRoleplayTurn } from '../services/claude';
import { transcribeChunk } from '../services/deepgram';
import { verifyToken } from '../services/jwt';
import { findById, hasActivePremium } from '../db/accounts';
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

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const accountId = requireAccountId(req, res);
  if (!accountId) return;
  const account = await findById(accountId);
  if (!account || !hasActivePremium(account)) {
    return res.status(403).json({ error: 'An active membership is required.' });
  }

  const {
    mode,
    scenario,
    goal,
    context,
    memory,
    transcript,
    userMessage,
    turnCount,
  } = req.body as {
    mode?: string;
    scenario?: string;
    goal?: string;
    context?: string;
    memory?: {
      interests?: string[];
      personalDetails?: string[];
      callbackTopics?: string[];
    };
    transcript?: string;
    userMessage?: string;
    turnCount?: number;
  };

  if (!mode?.trim() || !scenario?.trim() || !userMessage?.trim()) {
    return res.status(400).json({ error: 'mode, scenario, and userMessage are required.' });
  }

  const turn = await generateRoleplayTurn({
    mode,
    scenario,
    goal: goal ?? '',
    context: context ?? '',
    memory: {
      interests: memory?.interests ?? [],
      personalDetails: memory?.personalDetails ?? [],
      callbackTopics: memory?.callbackTopics ?? [],
    },
    transcript: transcript ?? '',
    userMessage,
    turnCount: turnCount ?? 0,
  });

  if (!turn) {
    return res.status(502).json({ error: 'Could not generate a roleplay response right now.' });
  }

  return res.json({ turn, accountId });
}));

// POST /coach/roleplay/transcribe — one-shot STT for the roleplay practice screen
router.post('/transcribe', asyncHandler(async (req: Request, res: Response) => {
  const accountId = requireAccountId(req, res);
  if (!accountId) return;
  const account = await findById(accountId);
  if (!account || !hasActivePremium(account)) {
    return res.status(403).json({ error: 'An active membership is required.' });
  }

  const { audio } = req.body as { audio?: string };
  if (!audio) {
    return res.status(400).json({ error: 'audio (base64) is required.' });
  }

  try {
    const text = await transcribeChunk(Buffer.from(audio, 'base64'));
    return res.json({ text });
  } catch (err) {
    return res.status(502).json({
      error: err instanceof Error ? err.message : 'Transcription failed.',
    });
  }
}));

export default router;
