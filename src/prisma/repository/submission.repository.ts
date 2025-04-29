import { Injectable } from '@nestjs/common';
import { Prisma, Submission } from '@prisma/client';

import { PrismaService } from '../prisma.service';

@Injectable()
export class SubmissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.SubmissionCreateInput): Promise<Submission> {
    return this.prisma.submission.create({ data });
  }

  async findById(parameters: Prisma.SubmissionFindUniqueArgs): Promise<Submission | null> {
    return this.prisma.submission.findUnique(parameters);
  }

  async findAll(parameters: Prisma.SubmissionFindManyArgs): Promise<Submission[]> {
    return this.prisma.submission.findMany(parameters);
  }

  async update(parameters: Prisma.SubmissionUpdateArgs): Promise<Submission> {
    return this.prisma.submission.update(parameters);
  }

  // 학생 ID와 컴포넌트 타입으로 제출 정보 찾기
  async findByStudentAndComponent(studentId: number, componentType: string): Promise<Submission | null> {
    return this.prisma.submission.findUnique({
      where: {
        studentId_componentType: {
          studentId,
          componentType,
        },
      },
    });
  }
}
