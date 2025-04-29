import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { LoggerModule } from '../logger/logger.module';
import { PrismaModule } from '../prisma/prisma.module';

import { EvaluationService } from './evaluation.service';

@Module({
  imports: [AiModule, PrismaModule, LoggerModule],
  providers: [EvaluationService],
  exports: [EvaluationService],
})
export class EvaluationModule {}
