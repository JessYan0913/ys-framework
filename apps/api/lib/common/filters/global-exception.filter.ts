import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';

    // 处理 NestJS HTTP 异常
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || responseObj.error || exception.message;
        // 如果已经有 code 字段，使用它；否则使用默认的
        code = responseObj.code || this.getErrorCodeFromStatus(status);
      } else {
        message = exception.message;
      }
      code = this.getErrorCodeFromStatus(status);
    }
    // 处理普通 Error
    else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception.message;
      code = 'UNKNOWN_ERROR';
      
      // 根据错误消息推断更具体的错误码
      if (exception.message.includes('not found') || exception.message.includes('不存在')) {
        code = 'NOT_FOUND';
        status = HttpStatus.NOT_FOUND;
      } else if (exception.message.includes('invalid') || exception.message.includes('错误') || exception.message.includes('mismatch')) {
        code = 'INVALID_REQUEST';
        status = HttpStatus.BAD_REQUEST;
      } else if (exception.message.includes('unauthorized') || exception.message.includes('未授权')) {
        code = 'UNAUTHORIZED';
        status = HttpStatus.UNAUTHORIZED;
      } else if (exception.message.includes('forbidden') || exception.message.includes('禁止')) {
        code = 'FORBIDDEN';
        status = HttpStatus.FORBIDDEN;
      }
      
      // 处理验证码相关异常（通过错误消息识别）
      if (exception.message.includes('captcha') || exception.message.includes('验证码')) {
        if (exception.message.includes('not found') || exception.message.includes('不存在')) {
          code = 'CAPTCHA_NOT_FOUND';
          status = HttpStatus.NOT_FOUND;
        } else if (exception.message.includes('invalid') || exception.message.includes('验证失败')) {
          code = 'CAPTCHA_INVALID';
          status = HttpStatus.BAD_REQUEST;
        } else if (exception.message.includes('storage') || exception.message.includes('存储')) {
          code = 'CAPTCHA_STORAGE_ERROR';
          status = HttpStatus.INTERNAL_SERVER_ERROR;
        } else {
          code = 'CAPTCHA_ERROR';
          status = HttpStatus.BAD_REQUEST;
        }
      }
    }
    // 处理未知异常
    else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Unknown error occurred';
      code = 'UNKNOWN_ERROR';
    }

    // 记录错误日志
    this.logger.error(
      `${request.method} ${request.url} - Status: ${status} - Code: ${code} - Message: ${message}`,
      exception instanceof Error ? exception.stack : exception,
    );

    const errorResponse = {
      statusCode: status,
      code,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    response.status(status).json(errorResponse);
  }

  private getErrorCodeFromStatus(status: number): string {
    switch (status) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'UNPROCESSABLE_ENTITY';
      case 500:
        return 'INTERNAL_SERVER_ERROR';
      case 503:
        return 'SERVICE_UNAVAILABLE';
      default:
        return 'UNKNOWN_ERROR';
    }
  }
}
