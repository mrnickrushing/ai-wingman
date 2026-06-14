import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { SessionManager } from './session/SessionManager';
import { ClientMessage } from './types';
import { initDb } from './db/index';
import authRouter from './routes/auth';
import sessionsRouter from './routes/sessions';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/auth', authRouter);
app.use('/sessions', sessionsRouter);

const server = http.createServer(app);
// Manage the upgrade ourselves (noServer) so we can log handshake attempts and
// reject non-/ws upgrades with an explicit HTTP response instead of silently
// dropping the socket. Railway's edge negotiates HTTP/2 by default; the native
// React Native WebSocket client connects over HTTP/1.1, so the handshake lands
// here as a standard Upgrade request.
const wss = new WebSocketServer({ noServer: true });
const sessionManager = new SessionManager();

server.on('upgrade', (req, socket, head) => {
  const { pathname } = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  if (pathname !== '/ws') {
    console.warn(`[WS] Rejecting upgrade for path "${pathname}"`);
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }
  console.log('[WS] Upgrade request accepted for /ws');
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

app.get('/health', (_req, res) => {
  const keys = {
    deepgram: Boolean(process.env.DEEPGRAM_API_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY),
  };
  const allPresent = Object.values(keys).every(Boolean);
  res.status(allPresent ? 200 : 503).json({
    status: allPresent ? 'ok' : 'misconfigured',
    sessions: sessionManager.count,
    keys,
  });
});

wss.on('connection', (ws: WebSocket) => {
  console.log('[WS] Client connected');
  let sessionId: string | null = null;

  ws.on('message', (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      return;
    }

    if (msg.type === 'start_session') {
      // Guard against a client sending start_session twice on one socket —
      // end the previous session first so it doesn't leak.
      if (sessionId) {
        sessionManager.end(sessionId);
        sessionId = null;
      }
      const session = sessionManager.create(ws, msg.config);
      sessionId = session.id;
      ws.send(JSON.stringify({ type: 'session_started', sessionId }));
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
      session.receiveAudio(msg.data);
    } else if (msg.type === 'end_session') {
      sessionManager.end(sessionId);
      sessionId = null;
      ws.send(JSON.stringify({ type: 'session_ended' }));
    }
  });

  ws.on('close', () => {
    if (sessionId) {
      sessionManager.end(sessionId);
    }
    console.log('[WS] Client disconnected');
  });

  ws.on('error', (err) => {
    console.error('[WS] Error:', err.message);
  });
});

const PORT = parseInt(process.env.PORT ?? '3001', 10);

// Safety net: an unhandled rejection or exception in a route or async task must
// never terminate the process and take the whole server down for every user
// (Node's default is to crash on unhandled rejections). Log and keep serving.
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception:', err);
});

async function main() {
  if (process.env.DATABASE_URL) {
    try {
      await initDb();
      console.log('[DB] Schema ready');
    } catch (err) {
      console.error('[DB] Failed to initialize schema:', (err as Error).message);
    }
  } else {
    console.warn('[DB] DATABASE_URL not set — auth endpoints disabled');
  }
  server.listen(PORT, () => {
    console.log(`AI Wingman server running on port ${PORT}`);
  });
}

main().catch(console.error);

process.on('SIGTERM', () => {
  sessionManager.endAll();
  server.close();
});
