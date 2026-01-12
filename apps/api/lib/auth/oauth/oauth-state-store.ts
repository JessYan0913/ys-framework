import { randomUUID } from 'crypto';
import { OAuthProvider } from '../interfaces/user.interface';

export const OAUTH_STATE_STORE = 'OAUTH_STATE_STORE';

export interface OAuthStateStore {
  create(provider: OAuthProvider, meta?: string): Promise<string>;
  consume(provider: OAuthProvider, state: string, meta?: string): Promise<boolean>;
}

export class MemoryOAuthStateStore implements OAuthStateStore {
  private readonly store = new Map<string, { provider: OAuthProvider; expiresAt: number; meta?: string }>();

  constructor(private readonly ttlMs: number = 5 * 60 * 1000) {}

  async create(provider: OAuthProvider, meta?: string): Promise<string> {
    this.cleanupExpired();
    const state = randomUUID();
    this.store.set(state, { provider, expiresAt: Date.now() + this.ttlMs, meta });
    return state;
  }

  async consume(provider: OAuthProvider, state: string, meta?: string): Promise<boolean> {
    this.cleanupExpired();
    const record = this.store.get(state);
    if (!record) return false;
    this.store.delete(state);

    if (record.expiresAt < Date.now()) return false;
    if (record.provider !== provider) return false;
    if (typeof record.meta !== 'undefined' && record.meta !== meta) return false;

    return true;
  }

  private cleanupExpired() {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (value.expiresAt < now) {
        this.store.delete(key);
      }
    }
  }
}
