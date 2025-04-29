import { Module } from '@nestjs/common';

import { EvaluationModule } from '../evaluation/evaluation.module';
import { PrismaModule } from '../prisma/prisma.module';

import { RevisionController } from './revision.controller';
import { RevisionService } from './revision.service';

@Module({
  imports: [PrismaModule, EvaluationModule],
  providers: [RevisionService],
  controllers: [RevisionController],
})
export class RevisionModule {}
