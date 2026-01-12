export class CaptchaError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'CaptchaError';
  }
}

export class CaptchaNotFoundError extends CaptchaError {
  constructor() {
    super('验证码不存在或已过期', 'CAPTCHA_NOT_FOUND');
  }
}

export class ValidationError extends CaptchaError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

export class StorageError extends CaptchaError {
  constructor(message: string) {
    super(message, 'STORAGE_ERROR');
  }
}