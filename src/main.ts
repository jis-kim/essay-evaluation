import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AppConfigService } from './config/config.service';
import { CustomLogger } from './logger/custom-logger.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // 글로벌 로거 프로바이더 설정
  app.useLogger(app.get(CustomLogger));
  app.setGlobalPrefix('v1');

  const appConfigService = app.get(AppConfigService);

  const allowedOrigins = appConfigService.isProduction
    ? [process.env.CLIENT_URL]
    : [
        'http://localhost:3000', // 로컬 개발 환경
        /^http:\/\/localhost:[0-9]+$/, // 또는 모든 로컬 포트 허용
      ];

  app.enableCors({
    origin: allowedOrigins,
    allowedHeaders: 'Content-Type, Authorization', // accept: 기본 cors 허용 헤더
    credentials: true,
    maxAge: appConfigService.isProduction ? 3600 : 5, // 1시간
  });

  // ValidationPipe 글로벌 설정
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 정의되지 않은 속성은 자동으로 제거
      forbidNonWhitelisted: true, // DTO에 정의되지 않은 속성이 있으면 요청 거부
      transform: true, // 요청 데이터를 DTO 클래스의 인스턴스로 자동 변환
    }),
  );
  app.useGlobalInterceptors(new LoggingInterceptor(app.get(CustomLogger)));

  app.useGlobalFilters(new AllExceptionsFilter(app.get(Logger)));

  // Swagger 문서 설정
  const config = new DocumentBuilder()
    .setTitle('Essay Evaluation API')
    .setDescription('에세이 평가 시스템 API 문서')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(appConfigService.port ?? 3000);
}
void bootstrap();
