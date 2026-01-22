import { Module } from '@nestjs/common';
import { DrizzleModule } from '@ys/database/nestjs';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRegisteredListener } from './listeners/user-registered.listener';

@Module({
  imports: [UserModule, DrizzleModule],
  controllers: [AuthController],
  providers: [
    {
      provide: 'LocalAuthService',
      useClass: AuthService,
    },
    UserRegisteredListener,
  ],
  exports: ['LocalAuthService'],
})
export class AuthModule {}
