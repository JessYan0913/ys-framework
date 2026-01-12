export interface EmailCaptchaConfig {
  secret: string;
  storage: {
    set(key: string, value: string, ttl: number): Promise<void>;
    get(key: string): Promise<string | null>;
    del(key: string): Promise<void>;
  };
  codeLength: number;
  ttl: number;
}

export interface SendEmailCaptchaPayload {
  email: string;
  purpose: string;
  text: string;
  action: string;
}

export interface SendEmailCaptchaResult {
  id: string;
}

export interface VerifyEmailCaptchaPayload {
  id: string;
  code: string;
  purpose: string;
}

export interface VerifyEmailCaptchaResult {
  id: string;
  token: string;
}

export interface EmailCaptchaServiceInterface {
  sendCaptcha(options: SendEmailCaptchaPayload): Promise<SendEmailCaptchaResult>;
  verifyCaptcha(options: VerifyEmailCaptchaPayload): Promise<VerifyEmailCaptchaResult>;
  verifyToken(id: string, token: string, purpose: string): Promise<boolean>;
}