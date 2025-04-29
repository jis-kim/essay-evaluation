import { Injectable } from '@nestjs/common';
import { Prisma, Revision } from '@prisma/client';

import { PrismaService } from '../prisma.service';

@Injectable()
export class RevisionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(parameters: Prisma.RevisionCreateArgs): Promise<Revision> {
    return this.prisma.revision.create(parameters);
  }

  async findById(parameters: Prisma.RevisionFindUniqueArgs): Promise<Revision | null> {
    return this.prisma.revision.findUnique(parameters);
  }
  async findAll(parameters: Prisma.RevisionFindManyArgs): Promise<Revision[]> {
    return this.prisma.revision.findMany(parameters);
  }

  async update(parameters: Prisma.RevisionUpdateArgs): Promise<Revision> {
    return this.prisma.revision.update(parameters);
  }
}
