import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';
import { StudentRepository, SubmissionRepository } from './repository';

@Global()
@Module({
  providers: [PrismaService, StudentRepository, SubmissionRepository],
  exports: [PrismaService, StudentRepository, SubmissionRepository],
})
export class PrismaModule {}
