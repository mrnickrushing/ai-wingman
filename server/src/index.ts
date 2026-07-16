import 'dotenv/config';
import './instrumentation';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import * as Sentry from '@sentry/node';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { SessionManager } from './session/SessionManager';
import { ClientMessage } from './types';
import { initDb, pool } from './db/index';
import { findById, hasActivePremium } from './db/accounts';
import { assertJwtConfigured, verifyToken } from './services/jwt';
import { getMonthlyUsageSeconds, recordCoachingUsage } from './db/sessions';
import authRouter from './routes/auth';
import sessionsRouter from './routes/sessions';
import textCoachRouter from './routes/textCoach';
import memoryRouter from './routes/memory';
import roleplayRouter from './routes/roleplay';
import adminRouter from './routes/admin';
import revenueCatWebhookRouter from './routes/revenuecatWebhook';

const app = express();
app.set('trust proxy', 1);
app.use(
  '/webhooks/revenuecat',
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  }),
  express.raw({ type: 'application/json', limit: '256kb' }),
  revenueCatWebhookRouter
);

const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);
app.use(cors({
  origin(origin, callback) {
    // Native mobile requests do not send Origin. Browser origins must be
    // explicitly allowlisted through CORS_ORIGINS.
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
}));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
}));
app.use(express.json());
app.use('/auth', authRouter);
app.use('/sessions', sessionsRouter);
app.use('/coach', textCoachRouter);
app.use('/memory', memoryRouter);
app.use('/coach/roleplay', roleplayRouter);
app.use('/admin', adminRouter);

const server = http.createServer(app);
// Manage the upgrade ourselves (noServer) so we can log handshake attempts and
// reject non-/ws upgrades with an explicit HTTP response instead of silently
// dropping the socket. Railway's edge negotiates HTTP/2 by default; the native
// React Native WebSocket client connects over HTTP/1.1, so the handshake lands
// here as a standard Upgrade request.
const wss = new WebSocketServer({
  noServer: true,
  // Audio arrives in small base64 chunks. Reject oversized frames before they
  // can consume excessive memory or be forwarded to paid transcription APIs.
  maxPayload: 2 * 1024 * 1024,
});
const sessionManager = new SessionManager();
const accountsStartingSession = new Set<string>();
type UsageRecord = Parameters<typeof recordCoachingUsage>[0];
const pendingUsageRecords = new Map<string, UsageRecord>();

function monthlyCapMinutes(): number {
  const cap = Number(process.env.MONTHLY_MINUTES_CAP);
  if (!Number.isFinite(cap) || cap <= 0) {
    throw new Error('MONTHLY_MINUTES_CAP must be configured as a positive number.');
  }
  return cap;
}

async function persistUsage(record: UsageRecord): Promise<void> {
  try {
    await recordCoachingUsage(record);
    pendingUsageRecords.delete(record.sessionId);
  } catch (error) {
    pendingUsageRecords.set(record.sessionId, record);
    throw error;
  }
}

async function flushPendingUsage(accountId: string): Promise<void> {
  const pending = [...pendingUsageRecords.values()].filter((record) => record.accountId === accountId);
  for (const record of pending) await persistUsage(record);
}

server.on('upgrade', async (req, socket, head) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  if (url.pathname !== '/ws') {
    console.warn('[WS] Rejecting upgrade for path "%s"', url.pathname);
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }

  // WebSocket clients cannot reliably set Authorization across every target,
  // so current builds send the JWT as a secondary subprotocol. Keep the query
  // fallback temporarily for already-released clients during rollout.
  const offeredProtocols = (req.headers['sec-websocket-protocol'] ?? '')
    .split(',')
    .map((protocol) => protocol.trim());
  const tokenProtocol = offeredProtocols.find((protocol) => protocol.startsWith('jwt.'));
  const token = tokenProtocol?.slice(4) || url.searchParams.get('token');
  const accountId = token ? verifyToken(token)?.sub ?? null : null;

  if (!accountId) {
    console.warn('[WS] Rejecting unauthenticated upgrade');
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  try {
    const account = await findById(accountId);
    if (!account || !hasActivePremium(account)) {
      console.warn('[WS] Rejecting non-premium upgrade for account %s', accountId);
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
  } catch (error) {
    console.error('[WS] Account authorization failed:', (error as Error).message);
    socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
    socket.destroy();
    return;
  }

  console.log('[WS] Upgrade accepted for /ws (account %s)', accountId);
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req, accountId);
  });
});

app.get('/health', async (_req, res) => {
  const keys = {
    deepgram: Boolean(process.env.DEEPGRAM_API_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY),
  };
  let database = false;
  try {
    await pool.query('SELECT 1');
    database = true;
  } catch (error) {
    console.error('[health] Database check failed:', (error as Error).message);
  }
  const healthy = database && Object.values(keys).every(Boolean);
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'unhealthy',
    sessions: sessionManager.count,
    database,
    keys,
  });
});

if (process.env.SENTRY_DSN) Sentry.setupExpressErrorHandler(app);
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[http] Request failed:', error instanceof Error ? error.message : error);
  if (!res.headersSent) res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

wss.on('connection', (ws: WebSocket, _req: http.IncomingMessage, accountId: string | null) => {
  console.log('[WS] Client connected');
  let sessionId: string | null = null;
  let usageLimitTimer: ReturnType<typeof setTimeout> | null = null;
  let startingSession = false;
  let closed = false;

  const clearUsageTimer = () => {
    if (usageLimitTimer) clearTimeout(usageLimitTimer);
    usageLimitTimer = null;
  };

  const endCurrentSession = async (): Promise<string | null> => {
    if (!sessionId) return null;
    const endedId = sessionId;
    const session = sessionManager.end(endedId);
    sessionId = null;
    clearUsageTimer();
    if (session) {
      await persistUsage({
        sessionId: session.id,
        accountId: session.accountId,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        durationSeconds: session.durationSeconds,
      }).catch((error) => {
        console.error('[WS] Failed to persist usage for %s: %s', session.id, (error as Error).message);
      });
    }
    return endedId;
  };

  ws.on('message', async (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      return;
    }

    if (msg.type === 'start_session') {
      if (!accountId) {
        ws.close(1008, 'Authentication required');
        return;
      }
      if (startingSession) {
        ws.send(JSON.stringify({ type: 'error', message: 'A session is already starting.' }));
        return;
      }
      startingSession = true;
      let reservedAccountStart = false;
      // Guard against a client sending start_session twice on one socket —
      // end the previous session first so it doesn't leak.
      try {
        await endCurrentSession();
        if (accountsStartingSession.has(accountId) || sessionManager.hasActiveSession(accountId)) {
          ws.send(JSON.stringify({ type: 'error', message: 'This account already has an active coaching session.' }));
          return;
        }
        // Reserve synchronously before the first database await so two sockets
        // cannot both pass the active-session check in the same event-loop turn.
        accountsStartingSession.add(accountId);
        reservedAccountStart = true;

        const capMinutes = monthlyCapMinutes();
        await flushPendingUsage(accountId);
        const usedSeconds = await getMonthlyUsageSeconds(accountId);
        const remainingSeconds = Math.max(0, capMinutes * 60 - usedSeconds);
        if (remainingSeconds <= 0) {
          ws.send(JSON.stringify({
            type: 'error',
            message: `You've reached your ${capMinutes}-minute monthly limit. It resets at the start of next month.`,
          }));
          return;
        }
        if (closed) return;

        const session = sessionManager.create(ws, msg.config, accountId);
        sessionId = session.id;
        ws.send(JSON.stringify({ type: 'session_started', sessionId }));
        usageLimitTimer = setTimeout(() => {
          const endedSessionId = sessionId;
          void endCurrentSession().finally(() => {
            if (closed || !endedSessionId || ws.readyState !== WebSocket.OPEN) return;
            ws.send(JSON.stringify({
              type: 'error',
              sessionId: endedSessionId,
              message: `You've reached your ${capMinutes}-minute monthly limit.`,
            }));
            ws.send(JSON.stringify({ type: 'session_ended', sessionId: endedSessionId }));
          });
        }, Math.ceil(remainingSeconds * 1000));
      } catch (error) {
        console.error('[WS] Usage authorization failed:', (error as Error).message);
        if (!closed) ws.send(JSON.stringify({ type: 'error', message: 'Unable to verify usage right now. Please try again.' }));
      } finally {
        if (reservedAccountStart) accountsStartingSession.delete(accountId);
        startingSession = false;
      }
      return;
    }

    if (!sessionId) {
      ws.send(JSON.stringify({ type: 'error', message: 'No active session. Send start_session first.' }));
      return;
    }

    const session = sessionManager.get(sessionId);
    if (!session) {
      ws.send(JSON.stringify({ type: 'error', message: 'Session not found' }));
      return;
    }

    if (msg.type === 'audio_chunk') {
      session.receiveAudio(msg.data, msg.mimeType, msg.sampleRate, msg.channels);
    } else if (msg.type === 'end_session') {
      const endedSessionId = await endCurrentSession();
      if (endedSessionId) ws.send(JSON.stringify({ type: 'session_ended', sessionId: endedSessionId }));
    }
  });

  ws.on('close', () => {
    closed = true;
    void endCurrentSession();
    console.log('[WS] Client disconnected');
  });

  ws.on('error', (err) => {
    console.error('[WS] Error:', err.message);
  });
});

const PORT = parseInt(process.env.PORT ?? '3001', 10);

let shuttingDown = false;
function terminateAfterFatal(error: unknown): void {
  if (shuttingDown) return;
  shuttingDown = true;
  Sentry.captureException(error);
  console.error('[server] Fatal error:', error);
  sessionManager.endAll();
  server.close();
  void Promise.allSettled([pool.end(), Sentry.flush(2_000)]).finally(() => process.exit(1));
}

process.on('unhandledRejection', (reason) => {
  terminateAfterFatal(reason);
});
process.on('uncaughtException', (err) => {
  terminateAfterFatal(err);
});

async function main() {
  assertJwtConfigured();
  monthlyCapMinutes();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  await initDb();
  console.log('[DB] Schema ready');
  server.listen(PORT, () => {
    console.log('AI Wingman server running on port %d', PORT);
  });
}

main().catch(terminateAfterFatal);

process.on('SIGTERM', () => {
  if (shuttingDown) return;
  shuttingDown = true;
  sessionManager.endAll();
  server.close(() => {
    void pool.end().finally(() => process.exit(0));
  });
});
