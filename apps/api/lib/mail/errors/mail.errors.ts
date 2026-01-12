import { HttpException, HttpStatus } from '@nestjs/common';

export class MailError extends HttpException {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
    public readonly provider?: string,
    httpStatus: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR
  ) {
    super({
      statusCode: httpStatus,
      message,
      error: code,
      provider,
      retryable,
    }, httpStatus);
  }
}

export class MailConnectionError extends MailError {
  constructor(message: string, provider?: string) {
    super(message, 'MAIL_CONNECTION_ERROR', true, provider, HttpStatus.SERVICE_UNAVAILABLE);
  }
}

export class MailAuthenticationError extends MailError {
  constructor(message: string, provider?: string) {
    super(message, 'MAIL_AUTH_ERROR', false, provider, HttpStatus.UNAUTHORIZED);
  }
}

export class MailRateLimitError extends MailError {
  constructor(message: string, provider?: string) {
    super(message, 'MAIL_RATE_LIMIT_ERROR', true, provider, HttpStatus.TOO_MANY_REQUESTS);
  }
}

export class MailValidationError extends MailError {
  constructor(message: string) {
    super(message, 'MAIL_VALIDATION_ERROR', false, undefined, HttpStatus.BAD_REQUEST);
  }
}

export class MailTimeoutError extends MailError {
  constructor(message: string, provider?: string) {
    super(message, 'MAIL_TIMEOUT_ERROR', true, provider, HttpStatus.REQUEST_TIMEOUT);
  }
}
