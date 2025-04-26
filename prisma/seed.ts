import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const createStudents = async (students: { studentName: string }[]): Promise<void> => {
  await prisma.student.createMany({
    data: students,
  });
};

async function main(): Promise<void> {
  // check if the table is empty
  const studentCount = await prisma.student.count();
  if (studentCount > 0) {
    console.log('Student table is not empty, skipping seeding');
    return;
  }

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

  await createStudents(students);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
