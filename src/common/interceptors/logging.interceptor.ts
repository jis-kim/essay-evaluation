import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { CustomLogger } from '../../logger/custom-logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: CustomLogger) {}

  /* eslint-disable @typescript-eslint/no-explicit-any */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request: Request = context.switchToHttp().getRequest();
    const url: string = request.url;

    const method = request.method;
    const now = performance.now();
    const response: Response = context.switchToHttp().getResponse();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      tap({
        next: () => {
          const responseTime = Math.round(performance.now() - now);

          this.logger.log('', 'LoggingInterceptor', {
            method: method,
            path: url,
            status: statusCode,
            duration: `${responseTime}ms`,
          });
        },
      }),
    );
  }
}
