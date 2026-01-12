import { HttpException, HttpStatus } from '@nestjs/common';

export class CaptchaTokenMissingException extends HttpException {
  constructor() {
    super('Captcha token is missing', HttpStatus.BAD_REQUEST);
  }
}

export class CaptchaTokenInvalidException extends HttpException {
  constructor(message?: string) {
    super(message || 'Captcha token is invalid', HttpStatus.BAD_REQUEST);
  }
}

export class CaptchaTokenExpiredException extends HttpException {
  constructor() {
    super('Captcha token has expired', HttpStatus.BAD_REQUEST);
  }
}
