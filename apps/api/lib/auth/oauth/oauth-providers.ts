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
