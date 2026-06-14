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

export class WingmanClient {
  private ws: WebSocket | null = null;
  private handlers: EventHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnects = 3;
  private config: SessionConfig | null = null;
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

  connect(config: SessionConfig): void {
    this.config = config;
    this.intentionalClose = false;
    this.reconnectAttempts = 0;
    this.open();
  }

  private open(): void {
    if (!this.config) return;
    if (this.ws) {
      try { this.ws.close(); } catch { /* noop */ }
    }

    this.ws = new WebSocket(SERVER_URL);

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

  sendAudioChunk(base64Audio: string, mimeType?: string): void {
    this.send({ type: 'audio_chunk', data: base64Audio, mimeType });
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
