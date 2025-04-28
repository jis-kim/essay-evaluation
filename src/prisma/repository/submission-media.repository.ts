import { Injectable } from '@nestjs/common';
import { Prisma, SubmissionMedia } from '@prisma/client';

import { PrismaService } from '../prisma.service';

@Injectable()
export class SubmissionMediaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.SubmissionMediaCreateInput): Promise<SubmissionMedia> {
    return this.prisma.submissionMedia.create({ data });
  }

  async findBySubmissionId(submissionId: string): Promise<SubmissionMedia[]> {
    return this.prisma.submissionMedia.findMany({
      where: { submissionId },
    });
  }

  async update(id: string, data: Prisma.SubmissionMediaUpdateInput): Promise<SubmissionMedia> {
    return this.prisma.submissionMedia.update({
      where: { id },
      data,
    });
  }
}
