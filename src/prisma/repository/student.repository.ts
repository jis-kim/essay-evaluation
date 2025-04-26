import { Injectable } from '@nestjs/common';
import { Prisma, Student } from '@prisma/client';

import { PrismaService } from '../prisma.service';

@Injectable()
export class StudentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.StudentCreateInput): Promise<Student> {
    return this.prisma.student.create({ data });
  }

  async findById(id: number): Promise<Student | null> {
    return this.prisma.student.findUnique({ where: { id } });
  }

  async findAll(): Promise<Student[]> {
    return this.prisma.student.findMany();
  }

  async update(id: string, data: Partial<Student>): Promise<Student> {
    return this.prisma.student.update({ where: { id: Number(id) }, data });
  }

  async delete(id: string): Promise<Student> {
    return this.prisma.student.delete({ where: { id: Number(id) } });
  }
}
