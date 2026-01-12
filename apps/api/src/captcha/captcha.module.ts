import { Module } from '@nestjs/common';
import { DrizzleModule } from '@ys/database/nestjs';
import { UserModule } from '../user/user.module';
import { CaptchaController } from './captcha.controller';

@Module({
  imports: [UserModule, DrizzleModule],
  controllers: [CaptchaController],
  providers: [],
  exports: [],
})
export class CaptchaModule {}
