import { Injectable } from '@nestjs/common';
import { OAuthProvider, OAuthUserProfile } from '../../interfaces/user.interface';
import { BaseOAuthProvider, OAuthAccessToken } from '../oauth-providers';

@Injectable()
export class GithubOAuthProvider extends BaseOAuthProvider {
  getProviderName(): OAuthProvider {
    return 'github';
  }

  getAuthorizationUrl(state?: string): string {
    const baseUrl = this.config.authorizationEndpoint || 'https://github.com/login/oauth/authorize';
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri || '',
      state: state || '',
      scope: this.config.scope || 'user:email', // Default scope to get email
    });

    return `${baseUrl}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<OAuthAccessToken> {
    const response = await fetch(
      this.config.accessTokenEndpoint || 'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code: code,
          redirect_uri: this.config.redirectUri,
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`GitHub OAuth HTTP error: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`);
    }

    const data = await response.json().catch(() => null);
    if (!data) {
      throw new Error('GitHub OAuth error: invalid JSON response');
    }
    if (data.error) {
      throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      scope: data.scope,
      token_type: data.token_type,
    };
  }

  async getUserInfo(accessToken: string, _extra?: string): Promise<OAuthUserProfile> {
    const response = await fetch(this.config.userInfoEndpoint || 'https://api.github.com/user', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `GitHub user info HTTP error: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`,
      );
    }

    const user = await response.json().catch(() => null);
    if (!user) {
      throw new Error('GitHub user info error: invalid JSON response');
    }

    // If email is missing (private), fetch it separately
    let email = user.email;
    if (!email) {
      email = await this.fetchUserEmail(accessToken);
    }

    return {
      provider: 'github',
      providerUserId: String(user.id),
      name: user.name || user.login,
      avatarUrl: user.avatar_url,
      email: email,
      raw: user,
    };
  }

  private async fetchUserEmail(accessToken: string): Promise<string | undefined> {
    try {
      const response = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const emails: any[] = await response.json();
        // Find primary email, or verified email, or just first one
        const primary = emails.find((e) => e.primary && e.verified);
        const verified = emails.find((e) => e.verified);
        return (primary || verified || emails[0])?.email;
      }
    } catch (error) {
      console.warn('Failed to fetch GitHub emails:', error);
    }
    return undefined;
  }

  async refreshToken(refreshToken: string): Promise<OAuthAccessToken> {
    // GitHub apps typically use "refresh_token" grant type if enabled
    // Note: Standard OAuth web flow usually returns non-expiring tokens unless configured otherwise.
    // If we have a refresh token, we try to use it.
    
    if (!refreshToken) {
        throw new Error('No refresh token provided');
    }

    const response = await fetch(
      this.config.accessTokenEndpoint || 'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
       throw new Error(
        `GitHub refresh token HTTP error: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`,
      );
    }
    
    const data = await response.json().catch(() => null);
     if (!data) {
      throw new Error('GitHub refresh token error: invalid JSON response');
    }
    if (data.error) {
       throw new Error(`GitHub refresh token error: ${data.error_description || data.error}`);
    }

    return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        scope: data.scope,
        token_type: data.token_type,
    };
  }
}
