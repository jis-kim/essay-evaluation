import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Submission, SubmissionStatus } from '@prisma/client';

import { StudentRepository, SubmissionRepository } from '../prisma/repository';
import { SubmissionService } from './submission.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';

describe('SubmissionService', () => {
  let service: SubmissionService;
  let studentRepository: StudentRepository;
  let submissionRepository: SubmissionRepository;

  const mockStudent = {
    id: 1,
    studentName: '김땡삼',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSubmission: Partial<Submission> = {
    id: 'uuid-type',
    studentId: 1,
    componentType: 'ESSAY',
    submitText: '테스트 에세이 내용',
    highlightSubmitText: '테스트 에세이 내용',
    score: 8,
    feedback: 'Good essay.',
    highlights: ['Good expression', 'Grammar issues'],
    status: SubmissionStatus.COMPLETED,
    result: {
      score: 8,
      feedback: 'Good essay.',
      highlights: ['Good expression', 'Grammar issues'],
    },
  };

  const mockCreateSubmissionDto: CreateSubmissionDto = {
    studentId: 1,
    studentName: '김땡삼',
    componentType: 'ESSAY',
    submitText: '테스트 에세이 내용',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionService,
        {
          provide: StudentRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: SubmissionRepository,
          useValue: {
            findByStudentAndComponent: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SubmissionService>(SubmissionService);
    studentRepository = module.get<StudentRepository>(StudentRepository);
    submissionRepository = module.get<SubmissionRepository>(SubmissionRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSubmission', () => {
    it('성공적으로 제출을 생성해야 합니다', async () => {
      jest.spyOn(studentRepository, 'findById').mockResolvedValue(mockStudent);
      jest.spyOn(submissionRepository, 'findByStudentAndComponent').mockResolvedValue(null);

      const result = await service.createSubmission(mockCreateSubmissionDto);

      expect(result).toBeDefined();
      expect(result.studentName).toBe(mockStudent.studentName);
      expect(result.score).toBe(mockSubmission.score);
    });

    it('학생 정보가 일치하지 않으면 BadRequestException을 던져야 합니다', async () => {
      const wrongStudent = { ...mockStudent, studentName: '다른이름' };
      jest.spyOn(studentRepository, 'findById').mockResolvedValue(wrongStudent);

      await expect(service.createSubmission(mockCreateSubmissionDto)).rejects.toThrow(BadRequestException);
    });

    it('이미 제출한 경우 ConflictException을 던져야 합니다', async () => {
      jest.spyOn(studentRepository, 'findById').mockResolvedValue(mockStudent);
      jest.spyOn(submissionRepository, 'findByStudentAndComponent').mockResolvedValue(mockSubmission as Submission);

      await expect(service.createSubmission(mockCreateSubmissionDto)).rejects.toThrow(ConflictException);
    });
  });
});
