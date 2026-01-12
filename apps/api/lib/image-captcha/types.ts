export interface CaptchaConfig {
  storage: Storage;
  imageLoader: ImageLoader;
  defaultSize: { width: number; height: number };
  trailMinLength: number;
  durationMin: number;
  durationMax: number;
  sliderOffsetMin: number;
  trailTolerance: number;
  ttl: number;
  secret: string;
}

export interface Storage {
  set(key: string, value: string, ttl?: number): Promise<void>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<void>;
}

export interface ImageLoader {
  pickRandomImagePath(): Promise<string>;
}

export interface CaptchaServiceInterface {
  createCaptcha(options: CreateCaptchaPayload): Promise<CreateCaptchaResult>;

  verifyCaptcha(body: VerifyTrailPayload): Promise<VerifyCaptchaResult>;

  verifyToken(id: string, token: string, purpose: string): Promise<boolean>;
}

export type CreateCaptchaPayload = {
  bgWidth?: number;
  bgHeight?: number;
  width?: number;
  height?: number;
  purpose: string; // 验证码用途
};

export type CreateCaptchaResult = {
  id: string;
  bgUrl: string;
  puzzleUrl: string;
};

export type VerifyTrailPayload = {
  x: number; // reported final x in pixels (from client)
  y?: number; // reported final y (optional)
  sliderOffsetX: number; // slider element's offset width moved in pixels (from client)
  duration: number; // total drag duration in ms
  trail: number[][]; // [[x,y], [x,y], ...] samples captured during drag (screen or element coords)
  id: string; // Required captcha ID for validation
};

export type VerifyCaptchaResult = {
  id: string;
  token: string;
};

export type CaptchaData = {
  x: number;
  purpose: string;
};