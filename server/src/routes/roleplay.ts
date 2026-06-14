import { Router, Request, Response } from 'express';
import { generateRoleplayTurn } from '../services/claude';
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

router.post('/', async (req: Request, res: Response) => {
  const accountId = requireAccountId(req, res);
  if (!accountId) return;

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
});

export default router;
