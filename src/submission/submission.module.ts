import { Module } from '@nestjs/common';

import { BlobStorageModule } from '../blob-storage/blob-storage.module';
import { VideoProcessingModule } from '../video-processing/video-processing.module';

import { SubmissionController } from './submission.controller';
import { SubmissionService } from './submission.service';

@Module({
  imports: [VideoProcessingModule, BlobStorageModule],
  controllers: [SubmissionController],
  providers: [SubmissionService],
})
export class SubmissionModule {}
