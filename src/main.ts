import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1');

  // ValidationPipe 글로벌 설정
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 정의되지 않은 속성은 자동으로 제거
      forbidNonWhitelisted: true, // DTO에 정의되지 않은 속성이 있으면 요청 거부
      transform: true, // 요청 데이터를 DTO 클래스의 인스턴스로 자동 변환
    }),
  );

  // Swagger 문서 설정
  const config = new DocumentBuilder()
    .setTitle('Essay Evaluation API')
    .setDescription('에세이 평가 시스템 API 문서')
    .setVersion('1.0')
    .addTag('submissions', '에세이 제출 관련 API')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
