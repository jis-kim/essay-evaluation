import { ArgumentsHost, ExceptionFilter, Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';

import { CommonResponseDto } from '../dto/common-response.dto';

import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  private maskSensitiveFields(data: Record<string, unknown>): Record<string, unknown> {
    const sensitiveFields = ['password', 'token', 'authorization'];
    if (typeof data !== 'object') return data;
    return Object.entries(data).reduce((acc: Record<string, unknown>, [key, value]) => {
      acc[key] = sensitiveFields.includes(key.toLowerCase()) ? '***' : value;
      return acc;
    }, {});
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let errorMessage = '서버 내부 오류가 발생했습니다.';

    // HttpException인 경우 메시지 처리
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      // ValidationPipe 에러 처리
      if (typeof exceptionResponse === 'object' && 'message' in exceptionResponse) {
        const messages = Array.isArray(exceptionResponse.message)
          ? exceptionResponse.message
          : [exceptionResponse.message];
        errorMessage = messages[0] as string;
      } else {
        errorMessage = exception.message;
      }
    } else if (exception instanceof Error) {
      errorMessage = exception.message;
    }

    // 로깅을 위한 요청 정보 수집
    const requestInfo = {
      error: {
        message: errorMessage,
        name: exception instanceof Error ? exception.name : 'UnknownError',
      },
      status,
      headers: this.maskSensitiveFields(request.headers as Record<string, unknown>),
      query: request.query,
      params: request.params,
      body: this.maskSensitiveFields(request.body as Record<string, unknown>),
      ip: request.headers['x-real-ip'] ?? request.ip,
      userAgent: request.get('user-agent'),
    };

    // 에러 레벨에 따른 로깅
    if (status >= 500) {
      this.logger.error('서버 에러 발생', exception instanceof Error ? exception.stack : '', 'AllExceptionsFilter', {
        method: request.method,
        path: request.url,
        status,
        contents: requestInfo,
      });
    } else if (status >= 400) {
      this.logger.warn('클라이언트 에러 발생', 'AllExceptionsFilter', {
        method: request.method,
        path: request.url,
        status,
        contents: requestInfo,
      });
    }

    // CommonResponseDto를 사용한 에러 응답
    response
      .status(200)
      .json(CommonResponseDto.error(exception instanceof Error ? exception.name : 'UnknownError', errorMessage));
  }
}
