import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Populates the database with initial test student records.
 *
 * Inserts a predefined list of students into the database for seeding or testing purposes.
 */
async function main(): Promise<void> {
  // 학생 테스트 데이터 생성
  const students = [
    {
      studentName: '김민준',
    },
    {
      studentName: '이서연',
    },
    {
      studentName: '박지우',
    },
    {
      studentName: '최현우',
    },
    {
      studentName: '정수아',
    },
  ];

  for (const student of students) {
    await prisma.student.create({
      data: student,
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
