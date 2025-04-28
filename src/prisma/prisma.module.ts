import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';
import { StudentRepository, SubmissionMediaRepository, SubmissionRepository } from './repository';

@Global()
@Module({
  providers: [PrismaService, StudentRepository, SubmissionRepository, SubmissionMediaRepository],
  exports: [PrismaService, StudentRepository, SubmissionRepository, SubmissionMediaRepository],
})
export class PrismaModule {}
