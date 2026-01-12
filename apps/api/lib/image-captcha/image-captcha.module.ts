import { Module, DynamicModule, Global } from '@nestjs/common';
import { ImageCaptchaService } from './image-captcha.service';
import { CaptchaConfig, Storage, ImageLoader } from './types';

export interface CaptchaModuleOptions {
  storage: Storage;
  imageLoader: ImageLoader;
  defaultSize?: { width: number; height: number };
  trailMinLength?: number;
  durationMin?: number;
  durationMax?: number;
  sliderOffsetMin?: number;
  trailTolerance?: number;
  ttl?: number;
  secret?: string;
}

@Global()
@Module({})
export class ImageCaptchaModule {
  static forRoot(options: CaptchaModuleOptions): DynamicModule {
    const captchaConfig: CaptchaConfig = {
      storage: options.storage,
      imageLoader: options.imageLoader,
      defaultSize: options.defaultSize || { width: 300, height: 200 },
      trailMinLength: options.trailMinLength || 10,
      durationMin: options.durationMin || 100,
      durationMax: options.durationMax || 10000,
      sliderOffsetMin: options.sliderOffsetMin || 5,
      trailTolerance: options.trailTolerance || 10,
      ttl: options.ttl || 300,
      secret: options.secret || 'default-secret-change-in-production',
    };

    return {
      global: true,
      module: ImageCaptchaModule,
      providers: [
        {
          provide: ImageCaptchaService,
          useFactory: () => new ImageCaptchaService(captchaConfig),
        },
      ],
      exports: [ImageCaptchaService],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<CaptchaModuleOptions> | CaptchaModuleOptions;
    inject?: any[];
  }): DynamicModule {
    return {
      global: true,
      module: ImageCaptchaModule,
      providers: [
        {
          provide: ImageCaptchaService,
          useFactory: async (...args: any[]) => {
            const captchaOptions = await options.useFactory(...args);
            return new ImageCaptchaService({
              storage: captchaOptions.storage,
              imageLoader: captchaOptions.imageLoader,
              defaultSize: captchaOptions.defaultSize || { width: 300, height: 200 },
              trailMinLength: captchaOptions.trailMinLength || 10,
              durationMin: captchaOptions.durationMin || 100,
              durationMax: captchaOptions.durationMax || 10000,
              sliderOffsetMin: captchaOptions.sliderOffsetMin || 5,
              trailTolerance: captchaOptions.trailTolerance || 10,
              ttl: captchaOptions.ttl || 300,
              secret: captchaOptions.secret || 'default-secret-change-in-production',
            });
          },
          inject: options.inject || [],
        },
      ],
      exports: [ImageCaptchaService],
    };
  }
}
