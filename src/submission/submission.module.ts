import { Module } from '@nestjs/common';

import { VideoProcessingModule } from '../video-processing/video-processing.module';

import { SubmissionController } from './submission.controller';
import { SubmissionService } from './submission.service';

@Module({
  imports: [VideoProcessingModule],
  controllers: [SubmissionController],
  providers: [SubmissionService],
})
export class SubmissionModule {}
