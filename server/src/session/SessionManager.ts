import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { Session } from './Session';
import { SessionConfig } from '../types';

export class SessionManager {
  private sessions = new Map<string, Session>();

  create(ws: WebSocket, config: SessionConfig): Session {
    const id = uuidv4();
    const session = new Session(id, ws, config);
    this.sessions.set(id, session);
    console.log(`[SessionManager] Created session ${id} (mode: ${config.mode})`);
    return session;
  }

  get(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  end(id: string): void {
    const session = this.sessions.get(id);
    if (session) {
      session.end();
      this.sessions.delete(id);
      console.log(`[SessionManager] Ended session ${id}`);
    }
  }

  endAll(): void {
    for (const [id] of this.sessions) {
      this.end(id);
    }
  }

  get count(): number {
    return this.sessions.size;
  }
}
