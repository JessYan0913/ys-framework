import { AuthService, SkipAuth } from '@lib/auth';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { OidcService } from './oidc.service';

@Controller('oidc')
export class OidcController {
  constructor(
    private readonly oidcService: OidcService,
    private readonly authService: AuthService,
  ) {}

  // OIDC Discovery Document
  @Get('.well-known/openid-configuration')
  @SkipAuth()
  getDiscovery(@Req() req: Request) {
    const issuer = `${req.protocol}://${req.get('host')}`;
    return this.oidcService.getDiscoveryDocument(issuer);
  }

  // Authorization Endpoint
  @Get('authorize')
  async authorize(
    @Query('client_id') clientId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('response_type') responseType: string,
    @Query('scope') scope: string,
    @Query('state') state: string,
    @Query('nonce') nonce: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Validate client
    const client = this.oidcService.getClient(clientId);
    if (!client) {
      throw new BadRequestException('Invalid client_id');
    }

    // Validate redirect URI
    if (!this.oidcService.validateRedirectUri(client, redirectUri)) {
      throw new BadRequestException('Invalid redirect_uri');
    }

    // Validate response type
    if (responseType !== 'code') {
      throw new BadRequestException('Unsupported response_type');
    }

    // Check if user is logged in (via session/cookie)
    const user = (req as any).user;
    if (!user) {
      // Redirect to login page with return URL
      const loginUrl = `/login?redirect=${encodeURIComponent(req.originalUrl)}`;
      return res.redirect(loginUrl);
    }

    // Generate authorization code
    const code = await this.oidcService.createAuthorizationCode(
      clientId,
      user.id,
      redirectUri,
      scope || 'openid',
      nonce,
    );

    // Redirect back to client with code
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('code', code);
    if (state) {
      redirectUrl.searchParams.set('state', state);
    }

    return res.redirect(redirectUrl.toString());
  }

  // Token Endpoint
  @Post('token')
  @SkipAuth()
  async token(
    @Body('grant_type') grantType: string,
    @Body('code') code: string,
    @Body('redirect_uri') redirectUri: string,
    @Body('client_id') clientIdBody: string,
    @Body('client_secret') clientSecretBody: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (grantType !== 'authorization_code') {
      throw new BadRequestException('Unsupported grant_type');
    }

    // Extract client credentials from header or body
    let clientId = clientIdBody;
    let clientSecret = clientSecretBody;

    if (authHeader && authHeader.startsWith('Basic ')) {
      const base64Credentials = authHeader.slice(6);
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
      const [id, secret] = credentials.split(':');
      clientId = id;
      clientSecret = secret;
    }

    if (!clientId || !clientSecret) {
      throw new UnauthorizedException('Missing client credentials');
    }

    try {
      return await this.oidcService.exchangeCodeForTokens(code, clientId, clientSecret, redirectUri);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // UserInfo Endpoint
  @Get('userinfo')
  async userinfo(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const accessToken = authHeader.slice(7);

    try {
      const user = await this.oidcService.getUserInfo(accessToken);
      return {
        sub: user.id,
        name: user.name,
        email: user.email,
        email_verified: true,
      };
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }
}
