import { UserPayload } from '@lib/auth';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { UserService } from '../user/user.service';

export interface OidcClient {
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
  name: string;
}

export interface AuthorizationCode {
  code: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  scope: string;
  expiresAt: Date;
  nonce?: string;
}

@Injectable()
export class OidcService {
  // In production, use Redis or database
  private authorizationCodes: Map<string, AuthorizationCode> = new Map();
  private clients: Map<string, OidcClient> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    // Register default OIDC clients (NocoDB, etc.)
    this.registerDefaultClients();
  }

  private registerDefaultClients() {
    const nocodbClientId = this.configService.get('NOCODB_CLIENT_ID');
    const nocodbClientSecret = this.configService.get('NOCODB_CLIENT_SECRET');
    const nocodbRedirectUri = this.configService.get('NOCODB_REDIRECT_URI');

    if (nocodbClientId && nocodbClientSecret) {
      this.clients.set(nocodbClientId, {
        clientId: nocodbClientId,
        clientSecret: nocodbClientSecret,
        redirectUris: nocodbRedirectUri ? [nocodbRedirectUri] : [],
        name: 'NocoDB',
      });
    }
  }

  getClient(clientId: string): OidcClient | undefined {
    return this.clients.get(clientId);
  }

  validateRedirectUri(client: OidcClient, redirectUri: string): boolean {
    return client.redirectUris.length === 0 || client.redirectUris.includes(redirectUri);
  }

  async createAuthorizationCode(
    clientId: string,
    userId: string,
    redirectUri: string,
    scope: string,
    nonce?: string,
  ): Promise<string> {
    const code = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    this.authorizationCodes.set(code, {
      code,
      clientId,
      userId,
      redirectUri,
      scope,
      expiresAt,
      nonce,
    });

    return code;
  }

  async exchangeCodeForTokens(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
  ): Promise<{ access_token: string; id_token: string; token_type: string; expires_in: number }> {
    const authCode = this.authorizationCodes.get(code);

    if (!authCode) {
      throw new Error('Invalid authorization code');
    }

    if (authCode.expiresAt < new Date()) {
      this.authorizationCodes.delete(code);
      throw new Error('Authorization code expired');
    }

    if (authCode.clientId !== clientId) {
      throw new Error('Client ID mismatch');
    }

    if (authCode.redirectUri !== redirectUri) {
      throw new Error('Redirect URI mismatch');
    }

    const client = this.getClient(clientId);
    if (!client || client.clientSecret !== clientSecret) {
      throw new Error('Invalid client credentials');
    }

    // Delete used code
    this.authorizationCodes.delete(code);

    // Get user info
    const user = await this.userService.findById(authCode.userId);
    if (!user) {
      throw new Error('User not found');
    }

    const expiresIn = 3600; // 1 hour

    // Generate access token
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        scope: authCode.scope,
        client_id: clientId,
      },
      { expiresIn },
    );

    // Generate ID token (OIDC specific)
    const idToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        aud: clientId,
        iat: Math.floor(Date.now() / 1000),
        nonce: authCode.nonce,
      },
      { expiresIn },
    );

    return {
      access_token: accessToken,
      id_token: idToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
    };
  }

  async getUserInfo(accessToken: string): Promise<UserPayload> {
    try {
      const payload = this.jwtService.verify(accessToken);
      const user = await this.userService.findById(payload.sub);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch {
      throw new Error('Invalid access token');
    }
  }

  getDiscoveryDocument(issuer: string) {
    return {
      issuer,
      authorization_endpoint: `${issuer}/oidc/authorize`,
      token_endpoint: `${issuer}/oidc/token`,
      userinfo_endpoint: `${issuer}/oidc/userinfo`,
      jwks_uri: `${issuer}/.well-known/jwks.json`,
      response_types_supported: ['code'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['HS256'],
      scopes_supported: ['openid', 'profile', 'email'],
      token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
      claims_supported: ['sub', 'name', 'email', 'email_verified'],
    };
  }
}
