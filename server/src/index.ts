import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { SessionManager } from './session/SessionManager';
import { ClientMessage } from './types';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const sessionManager = new SessionManager();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', sessions: sessionManager.count });
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
server.listen(PORT, () => {
  console.log(`AI Wingman server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  sessionManager.endAll();
  server.close();
});
