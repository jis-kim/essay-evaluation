import { Logger, Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { SubmissionModule } from './submission/submission.module';
import { VideoProcessingModule } from './video-processing/video-processing.module';

@Module({
  imports: [AppConfigModule, PrismaModule, SubmissionModule, VideoProcessingModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: Logger,
      useValue: new Logger(),
    },
  ],
})
export class AppModule {}
