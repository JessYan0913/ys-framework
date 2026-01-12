import { HttpException, HttpStatus } from '@nestjs/common';

export class EmailCaptchaTokenMissingException extends HttpException {
  constructor() {
    super('Email captcha token is missing', HttpStatus.BAD_REQUEST);
  }
}

export class EmailCaptchaTokenInvalidException extends HttpException {
  constructor(message?: string) {
    super(message || 'Email captcha token is invalid', HttpStatus.BAD_REQUEST);
  }
}

export class EmailCaptchaTokenExpiredException extends HttpException {
  constructor() {
    super('Email captcha token has expired', HttpStatus.BAD_REQUEST);
  }
}
