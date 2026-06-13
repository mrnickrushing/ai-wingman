import { SessionConfig } from '../types';

export type WingmanEvent =
  | { type: 'connected' }
  | { type: 'disconnected' }
  | { type: 'session_started'; sessionId: string }
  | { type: 'transcript'; text: string; isFinal: boolean }
  | { type: 'coaching'; text: string }
  | { type: 'coaching_audio'; audio: string; mimeType: string }
  | { type: 'error'; message: string }
  | { type: 'session_ended' };

type EventHandler = (event: WingmanEvent) => void;

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? 'ws://localhost:3001/ws';

export class WingmanClient {
  private ws: WebSocket | null = null;
  private handlers: EventHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnects = 3;

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
    if (this.ws) this.disconnect();

    this.ws = new WebSocket(SERVER_URL);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.emit({ type: 'connected' });
      this.send({ type: 'start_session', config });
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
      this.emit({ type: 'disconnected' });
      this.ws = null;
    };

    this.ws.onerror = () => {
      this.emit({ type: 'error', message: 'Connection error' });
    };
  }

  sendAudioChunk(base64Audio: string): void {
    this.send({ type: 'audio_chunk', data: base64Audio });
  }

  endSession(): void {
    this.send({ type: 'end_session' });
  }

  disconnect(): void {
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
