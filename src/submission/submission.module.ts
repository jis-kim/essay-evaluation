import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { BlobStorageModule } from '../blob-storage/blob-storage.module';
import { EvaluationModule } from '../evaluation/evaluation.module';
import { PrismaModule } from '../prisma/prisma.module';
import { VideoProcessingModule } from '../video-processing/video-processing.module';

import { SubmissionController } from './submission.controller';
import { SubmissionService } from './submission.service';

@Module({
  imports: [PrismaModule, VideoProcessingModule, BlobStorageModule, AiModule, EvaluationModule],
  controllers: [SubmissionController],
  providers: [SubmissionService],
})
export class SubmissionModule {}
