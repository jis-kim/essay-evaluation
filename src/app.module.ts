import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/config.module';
import { LoggerModule } from './logger/logger.module';
import { PrismaModule } from './prisma/prisma.module';
import { RevisionModule } from './revision/revision.module';
import { SubmissionModule } from './submission/submission.module';

@Module({
  imports: [AppConfigModule, PrismaModule, SubmissionModule, RevisionModule, LoggerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
