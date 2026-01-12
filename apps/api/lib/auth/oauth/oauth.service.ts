import { Injectable, Optional } from '@nestjs/common';
import { BaseOAuthProvider, OAuthConfig } from './oauth-providers';
import { FeishuOAuthProvider } from './oauth-providers';
import { OAuthProvider } from '../interfaces/user.interface';
import { OAuthStateStore } from './oauth-state-store';

export interface OAuthProvidersConfig {
  feishu?: OAuthConfig;
  [key: string]: OAuthConfig | undefined;
}

@Injectable()
export class OAuthService {
  private readonly providers: Map<OAuthProvider, BaseOAuthProvider> = new Map();

  constructor(
    @Optional() private readonly config?: OAuthProvidersConfig,
    @Optional() private readonly stateStore?: OAuthStateStore,
  ) {
    this.initializeProviders();
  }

  private initializeProviders() {
    if (!this.config) return;
    
    if (this.config.feishu) {
      this.providers.set('feishu', new FeishuOAuthProvider(this.config.feishu));
    }
  }

  getProvider(provider: OAuthProvider): BaseOAuthProvider {
    const oauthProvider = this.providers.get(provider);
    if (!oauthProvider) {
      throw new Error(`OAuth provider '${provider}' is not configured`);
    }
    return oauthProvider;
  }

  getAuthorizationUrl(provider: OAuthProvider, state?: string): string {
    return this.getProvider(provider).getAuthorizationUrl(state);
  }

  async createState(provider: OAuthProvider, meta?: string): Promise<string> {
    if (!this.stateStore) {
      throw new Error('OAuth state store is not configured');
    }
    return this.stateStore.create(provider, meta);
  }

  async getAuthorizationUrlWithState(provider: OAuthProvider, meta?: string): Promise<{ url: string; state: string }> {
    const state = await this.createState(provider, meta);
    const url = this.getAuthorizationUrl(provider, state);
    return { url, state };
  }

  async exchangeCodeForToken(provider: OAuthProvider, code: string) {
    return this.getProvider(provider).exchangeCodeForToken(code);
  }

  async getUserInfo(provider: OAuthProvider, accessToken: string, extra?: string) {
    return this.getProvider(provider).getUserInfo(accessToken, extra);
  }

  async refreshToken(provider: OAuthProvider, refreshToken: string) {
    return this.getProvider(provider).refreshToken(refreshToken);
  }

  getAvailableProviders(): OAuthProvider[] {
    return Array.from(this.providers.keys());
  }
}
