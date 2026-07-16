import { WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import { Session } from './Session';
import { SessionConfig } from '../types';

export class SessionManager {
  private sessions = new Map<string, Session>();

  create(ws: WebSocket, config: SessionConfig, accountId: string): Session {
    const id = randomUUID();
    const session = new Session(id, ws, config, accountId);
    this.sessions.set(id, session);
    console.log(`[SessionManager] Created session ${id} (mode: ${config.mode})`);
    return session;
  }

  get(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  end(id: string): Session | null {
    const session = this.sessions.get(id);
    if (session) {
      session.end();
      this.sessions.delete(id);
      console.log(`[SessionManager] Ended session ${id}`);
      return session;
    }
    return null;
  }

  hasActiveSession(accountId: string): boolean {
    return [...this.sessions.values()].some((session) => session.accountId === accountId);
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
