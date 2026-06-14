import Constants from 'expo-constants';
import { SessionConfig } from '../types';

export type WingmanEvent =
  | { type: 'connected' }
  | { type: 'disconnected' }
  | { type: 'reconnecting'; attempt: number }
  | { type: 'session_started'; sessionId: string }
  | { type: 'transcript'; text: string; isFinal: boolean }
  | { type: 'coaching'; text: string }
  | { type: 'coaching_audio'; audio: string; mimeType: string }
  | { type: 'error'; message: string }
  | { type: 'session_ended' };

type EventHandler = (event: WingmanEvent) => void;

const DEFAULT_SERVER_URL = 'wss://wingman-server-production-5146.up.railway.app/ws';

// Resolve the server URL defensively. `app.config.js` can produce an `extra`
// whose `serverUrl` is `undefined` (or, after JSON round-trips, the literal
// string "undefined") when the build env var is unset, so we treat any value
// that isn't a usable wss:// URL as absent and fall back to the known default.
const resolveServerUrl = (): string => {
  const candidates = [
    Constants.expoConfig?.extra?.serverUrl as string | undefined,
    process.env.EXPO_PUBLIC_SERVER_URL,
  ];
  for (const candidate of candidates) {
    if (
      typeof candidate === 'string' &&
      candidate.length > 0 &&
      candidate !== 'undefined' &&
      candidate !== 'null' &&
      /^wss?:\/\//.test(candidate)
    ) {
      return candidate;
    }
  }
  return DEFAULT_SERVER_URL;
};

const SERVER_URL = resolveServerUrl();

export const getWingmanServerUrl = (): string => SERVER_URL;

// The health endpoint is plain HTTP(S), so convert the WebSocket scheme
// (wss:// → https://, ws:// → http://) as well as the /ws path → /health.
// Without the scheme swap, fetch() hits a wss:// URL and Railway returns 502.
const getHealthUrl = (): string =>
  SERVER_URL
    .replace(/^wss:\/\//, 'https://')
    .replace(/^ws:\/\//, 'http://')
    .replace(/\/ws$/, '/health');

const HEALTH_RETRY_STATUSES = new Set([502, 503, 504]);
const HEALTH_RETRY_DELAYS_MS = [350, 900, 1600];

export type WingmanServerHealth = {
  ok: boolean;
  status: number;
  message: string;
  sessions?: number;
  attempts?: number;
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function fetchWingmanServerHealth(timeoutMs: number): Promise<WingmanServerHealth> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const res = await fetch(getHealthUrl(), controller ? { signal: controller.signal } : undefined);
    let message = `Server responded ${res.status}`;
    let sessions: number | undefined;
    try {
      const json = await res.json() as Record<string, unknown>;
      if (typeof json.status === 'string') message = json.status;
      if (typeof json.sessions === 'number') sessions = json.sessions;
      if (typeof json.message === 'string' && json.message) message = json.message;
    } catch {
      // non-JSON health response
    }
    return {
      ok: res.ok,
      status: res.status,
      message,
      sessions,
      attempts: 1,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message: error instanceof Error && error.name === 'AbortError'
        ? 'Health check timed out'
        : (error instanceof Error ? error.message : 'Health check failed'),
      attempts: 1,
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function checkWingmanServerHealth(timeoutMs = 4000): Promise<WingmanServerHealth> {
  let last = await fetchWingmanServerHealth(timeoutMs);
  for (let i = 0; i < HEALTH_RETRY_DELAYS_MS.length; i += 1) {
    const shouldRetry = !last.ok && (last.status === 0 || HEALTH_RETRY_STATUSES.has(last.status));
    if (!shouldRetry) break;
    await wait(HEALTH_RETRY_DELAYS_MS[i]);
    const next = await fetchWingmanServerHealth(timeoutMs);
    last = { ...next, attempts: (last.attempts ?? 1) + 1 };
    if (last.ok) {
      return {
        ...last,
        message: last.attempts && last.attempts > 1 ? 'ok after retry' : last.message,
      };
    }
  }

  if (!last.ok && (last.status === 0 || HEALTH_RETRY_STATUSES.has(last.status))) {
    return {
      ...last,
      message: `Wingman server is waking up or temporarily unavailable (${last.message}). Try again in a few seconds.`,
    };
  }
  return last;
}

export class WingmanClient {
  private ws: WebSocket | null = null;
  private handlers: EventHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnects = 3;
  private config: SessionConfig | null = null;
  private token: string | null = null;
  private intentionalClose = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  on(handler: EventHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  private emit(event: WingmanEvent): void {
    this.handlers.forEach((h) => h(event));
  }

  connect(config: SessionConfig, token?: string | null): void {
    this.config = config;
    this.token = token ?? null;
    this.intentionalClose = false;
    this.reconnectAttempts = 0;
    this.open();
  }

  private open(): void {
    if (!this.config) return;
    if (this.ws) {
      try { this.ws.close(); } catch { /* noop */ }
    }

    // The server reads the JWT from the query string (RN WebSocket can't set
    // headers). Reconnects reuse the same stored token.
    const url = this.token
      ? `${SERVER_URL}?token=${encodeURIComponent(this.token)}`
      : SERVER_URL;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.emit({ type: 'connected' });
      this.send({ type: 'start_session', config: this.config });
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as WingmanEvent;
        this.emit(msg);
      } catch {
        // malformed message
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.emit({ type: 'disconnected' });

      // Auto-reconnect on unexpected drops (network blips mid-call).
      if (!this.intentionalClose && this.reconnectAttempts < this.maxReconnects) {
        this.reconnectAttempts += 1;
        const delay = Math.min(8000, 1000 * 2 ** (this.reconnectAttempts - 1));
        this.emit({ type: 'reconnecting', attempt: this.reconnectAttempts });
        this.reconnectTimer = setTimeout(() => this.open(), delay);
      } else if (!this.intentionalClose) {
        this.emit({ type: 'error', message: 'Lost connection. Please restart the call.' });
      }
    };

    this.ws.onerror = () => {
      this.emit({ type: 'error', message: 'Connection error' });
    };
  }

  sendAudioChunk(base64Audio: string, mimeType?: string, sampleRate?: number, channels?: number): void {
    this.send({ type: 'audio_chunk', data: base64Audio, mimeType, sampleRate, channels });
  }

  endSession(): void {
    this.send({ type: 'end_session' });
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.config = null;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private send(message: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}

export const wingmanClient = new WingmanClient();
