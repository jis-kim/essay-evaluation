import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';
import { RevisionRepository, StudentRepository, SubmissionRepository } from './repository';

@Global()
@Module({
  providers: [PrismaService, StudentRepository, SubmissionRepository, RevisionRepository],
  exports: [PrismaService, StudentRepository, SubmissionRepository, RevisionRepository],
})
export class PrismaModule {}
