import { Injectable } from '@nestjs/common';
import { OAuthProvider, OAuthUserProfile } from '../interfaces/user.interface';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  appId?: string;
  appSecret?: string;
  redirectUri?: string;
  scope?: string;
  authorizationEndpoint?: string;
  accessTokenEndpoint?: string;
  refreshTokenEndpoint?: string;
  userInfoEndpoint?: string;
  [key: string]: any;
}

export interface OAuthAccessToken {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  [key: string]: any;
}

export abstract class BaseOAuthProvider {
  constructor(protected readonly config: OAuthConfig) {}

  abstract getProviderName(): OAuthProvider;
  
  abstract getAuthorizationUrl(state?: string): string;
  
  abstract exchangeCodeForToken(code: string): Promise<OAuthAccessToken>;
  
  abstract getUserInfo(accessToken: string, extra?: string): Promise<OAuthUserProfile>;
  
  abstract refreshToken(refreshToken: string): Promise<OAuthAccessToken>;
}

@Injectable()
export class FeishuOAuthProvider extends BaseOAuthProvider {
  private getAppId(): string {
    return this.config.appId || this.config.clientId;
  }

  private getAppSecret(): string {
    return this.config.appSecret || this.config.clientSecret;
  }

  private getRedirectUri(): string {
    if (!this.config.redirectUri) {
      throw new Error('Feishu OAuth redirectUri is required');
    }
    return this.config.redirectUri;
  }

  getProviderName(): OAuthProvider {
    return 'feishu';
  }

  getAuthorizationUrl(state?: string): string {
    const baseUrl = this.config.authorizationEndpoint || 'https://open.feishu.cn/open-apis/authen/v1/index';
    const params = new URLSearchParams({
      app_id: this.getAppId(),
      redirect_uri: this.getRedirectUri(),
      response_type: 'code',
      state: state || '',
    });

    const scope = this.config.scope;
    if (scope) {
      params.set('scope', scope);
    }

    return `${baseUrl}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<OAuthAccessToken> {
    const response = await fetch(this.config.accessTokenEndpoint || 'https://open.feishu.cn/open-apis/authen/v1/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        app_id: this.getAppId(),
        app_secret: this.getAppSecret(),
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code: code,
        redirect_uri: this.getRedirectUri(),
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Feishu OAuth HTTP error: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`);
    }

    const data = await response.json().catch(() => null);
    if (!data) {
      throw new Error('Feishu OAuth error: invalid JSON response');
    }
    if (data.code !== 0) {
      throw new Error(`Feishu OAuth error: ${data.msg}`);
    }

    return {
      access_token: data.data.access_token,
      refresh_token: data.data.refresh_token,
      expires_in: data.data.expires_in,
      scope: data.data.scope,
    };
  }

  async getUserInfo(accessToken: string, _extra?: string): Promise<OAuthUserProfile> {
    const response = await fetch(this.config.userInfoEndpoint || 'https://open.feishu.cn/open-apis/authen/v1/user_info', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Feishu user info HTTP error: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`);
    }

    const data = await response.json().catch(() => null);
    if (!data) {
      throw new Error('Feishu user info error: invalid JSON response');
    }
    if (data.code !== 0) {
      throw new Error(`Feishu user info error: ${data.msg}`);
    }

    const user = data.data;
    return {
      provider: 'feishu',
      providerUserId: user.user_id,
      unionId: user.union_id,
      openId: user.open_id,
      name: user.name,
      avatarUrl: user.avatar_url,
      email: user.email,
      phone: user.mobile,
      raw: user,
    };
  }

  async refreshToken(refreshToken: string): Promise<OAuthAccessToken> {
    const response = await fetch(this.config.refreshTokenEndpoint || 'https://open.feishu.cn/open-apis/authen/v1/refresh_access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        app_id: this.getAppId(),
        app_secret: this.getAppSecret(),
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Feishu refresh token HTTP error: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`);
    }

    const data = await response.json().catch(() => null);
    if (!data) {
      throw new Error('Feishu refresh token error: invalid JSON response');
    }
    if (data.code !== 0) {
      throw new Error(`Feishu refresh token error: ${data.msg}`);
    }

    return {
      access_token: data.data.access_token,
      refresh_token: data.data.refresh_token,
      expires_in: data.data.expires_in,
    };
  }
}
