import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';

import { EvaluationService } from './evaluation.service';

@Module({
  imports: [AiModule, PrismaModule],
  providers: [EvaluationService],
  exports: [EvaluationService],
})
export class EvaluationModule {}
