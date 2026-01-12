import { DynamicModule, Module, Provider, Type } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { JWTAuthGuard } from './guards/jwt-auth.guard';
import { ResourceAuthGuard } from './guards/resource-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { OAuthStrategy } from './strategies/oauth.strategy';
import { OAuthService, OAuthProvidersConfig } from './oauth/oauth.service';
import { UserService } from './interfaces/user.interface';
import { MemoryOAuthStateStore, OAUTH_STATE_STORE, OAuthStateStore } from './oauth/oauth-state-store';
import { TokenRevocationOptions, TokenRevocationService } from './token-revocation.service';

export interface ForRootOptions {
  jwt: {
    secret: string;
    signOptions: JwtSignOptions;
  };
  enableJwtGuard: boolean;
  enableResourceGuard: boolean;
  userService: Type;
  oauth?: OAuthProvidersConfig;
  oauthStateStoreProvider?: Provider<OAuthStateStore>;
  tokenRevocation?: TokenRevocationOptions;
}

@Module({})
export class AuthModule {
  static forRoot({
    userService,
    enableJwtGuard,
    enableResourceGuard,
    jwt,
    oauth,
    oauthStateStoreProvider,
    tokenRevocation,
  }: ForRootOptions): DynamicModule {
    const providers: Provider[] = [
      AuthService,
      LocalStrategy,
      {
        provide: JwtStrategy,
        useFactory: () => new JwtStrategy(jwt.secret || 'default-jwt-secret'),
      },
      { provide: 'UserService', useClass: userService },
    ];

    if (tokenRevocation?.enabled) {
      providers.push(
        {
          provide: 'AUTH_TOKEN_REVOCATION_OPTIONS',
          useValue: tokenRevocation,
        },
        TokenRevocationService,
      );
    }

    // 如果配置了 OAuth，添加相关服务
    if (oauth) {
      const stateStoreProvider: Provider<OAuthStateStore> =
        oauthStateStoreProvider || ({ provide: OAUTH_STATE_STORE, useFactory: () => new MemoryOAuthStateStore() } as any);

      providers.push(
        stateStoreProvider as any,
        {
          provide: OAuthService,
          useFactory: (store: OAuthStateStore) => new (OAuthService as any)(oauth, store),
          inject: [OAUTH_STATE_STORE],
        } as any,
        {
          provide: OAuthStrategy,
          useFactory: (oauthService: OAuthService, userService: UserService, store: OAuthStateStore) =>
            new (OAuthStrategy as any)(oauthService, userService, store),
          inject: [OAuthService, 'UserService', OAUTH_STATE_STORE],
        } as any,
      );
    }

    const guards = [
      ...(enableJwtGuard ? [{ provide: APP_GUARD, useClass: JWTAuthGuard }] : []),
      ...(enableResourceGuard ? [{ provide: APP_GUARD, useClass: ResourceAuthGuard }] : []),
    ];

    return {
      global: true,
      module: AuthModule,
      imports: [
        PassportModule,
        JwtModule.register({
          global: true,
          secret: jwt.secret,
          signOptions: jwt.signOptions,
        }),
      ],
      providers: [...providers, ...guards],
      exports: [AuthService, ...(oauth ? [OAuthService] : []), ...(tokenRevocation?.enabled ? [TokenRevocationService] : [])],
    };
  }
}
