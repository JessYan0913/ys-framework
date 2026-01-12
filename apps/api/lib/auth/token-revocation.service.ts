import { Inject, Injectable, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';

export type TokenRevocationOptions = {
  enabled: boolean;
  keyPrefix?: string;
};

@Injectable()
export class TokenRevocationService {
  private readonly keyPrefix: string;

  constructor(
    private readonly jwtService: JwtService,
    @Optional()
    @Inject('Cache')
    private readonly cache?: {
      set(key: string, value: any, ttl?: number): Promise<void>;
      exists(key: string): Promise<boolean>;
    },
    @Optional()
    @Inject('AUTH_TOKEN_REVOCATION_OPTIONS')
    options?: TokenRevocationOptions,
  ) {
    this.keyPrefix = options?.keyPrefix || 'auth:blacklist';
  }

  async blacklistAccessToken(token: string): Promise<void> {
    await this.blacklistToken('access', token);
  }

  async blacklistRefreshToken(token: string): Promise<void> {
    await this.blacklistToken('refresh', token);
  }

  async isAccessTokenRevoked(token: string): Promise<boolean> {
    return await this.isTokenRevoked('access', token);
  }

  async isRefreshTokenRevoked(token: string): Promise<boolean> {
    return await this.isTokenRevoked('refresh', token);
  }

  private async blacklistToken(type: 'access' | 'refresh', token: string): Promise<void> {
    if (!token) {
      return;
    }

    if (!this.cache) {
      throw new Error("Cache provider 'Cache' is required for token revocation");
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const decoded = this.jwtService.decode(token) as any;
    const exp = typeof decoded?.exp === 'number' ? decoded.exp : undefined;
    const ttl = exp ? Math.max(exp - nowSeconds, 0) : 0;

    if (ttl <= 0) {
      return;
    }

    await this.cache.set(this.getKey(type, token), true, ttl);
  }

  private async isTokenRevoked(type: 'access' | 'refresh', token: string): Promise<boolean> {
    if (!token || !this.cache) {
      return false;
    }
    return await this.cache.exists(this.getKey(type, token));
  }

  private getKey(type: 'access' | 'refresh', token: string): string {
    return `${this.keyPrefix}:${type}:${this.hashToken(token)}`;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
