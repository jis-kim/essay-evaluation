import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { SubmissionModule } from './submission/submission.module';

@Module({
  imports: [AppConfigModule, PrismaModule, SubmissionModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
