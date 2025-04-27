import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, InternalServerErrorException, Logger } from '@nestjs/common';
import { Submission, SubmissionStatus } from '@prisma/client';

import { StudentRepository, SubmissionRepository } from '../prisma/repository';
import { SubmissionService } from './submission.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { VideoProcessingService } from '../video-processing/video-processing.service';
import { SubmissionResponseDto } from './dto/submission-response.dto';

describe('SubmissionService', () => {
  let service: SubmissionService;
  let studentRepository: StudentRepository;
  let submissionRepository: SubmissionRepository;
  let videoProcessingService: VideoProcessingService;

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
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCreateSubmissionDto: CreateSubmissionDto = {
    studentId: 1,
    studentName: '김땡삼',
    componentType: 'ESSAY',
    submitText: '테스트 에세이 내용',
  };

  const mockVideoFile = {
    fieldname: 'video',
    originalname: 'test-video.mp4',
    encoding: '7bit',
    mimetype: 'video/mp4',
    buffer: Buffer.from('test'),
    size: 1024,
    path: '/tmp/test-video.mp4',
  } as Express.Multer.File;

  const mockProcessedVideo = {
    audioPath: '/tmp/test-video_audio.mp3',
    noAudioVideoPath: '/tmp/test-video_no_audio.mp4',
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
        {
          provide: VideoProcessingService,
          useValue: {
            processVideo: jest.fn(),
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SubmissionService>(SubmissionService);
    studentRepository = module.get<StudentRepository>(StudentRepository);
    submissionRepository = module.get<SubmissionRepository>(SubmissionRepository);
    videoProcessingService = module.get<VideoProcessingService>(VideoProcessingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSubmission', () => {
    it('성공적으로 제출을 생성해야 합니다', async () => {
      // Mock 설정
      jest.spyOn(studentRepository, 'findById').mockResolvedValue(mockStudent);
      jest.spyOn(submissionRepository, 'findByStudentAndComponent').mockResolvedValue(null);
      jest.spyOn(submissionRepository, 'create').mockResolvedValue(mockSubmission as Submission);
      jest.spyOn(videoProcessingService, 'processVideo').mockResolvedValue(mockProcessedVideo);

      // 테스트 실행
      const result = await service.createSubmission({
        videoFile: mockVideoFile,
        createSubmissionDto: mockCreateSubmissionDto,
      });

      // 검증
      expect(studentRepository.findById).toHaveBeenCalledWith(mockCreateSubmissionDto.studentId);
      expect(submissionRepository.findByStudentAndComponent).toHaveBeenCalledWith(
        mockCreateSubmissionDto.studentId,
        mockCreateSubmissionDto.componentType,
      );
      expect(submissionRepository.create).toHaveBeenCalledWith({
        student: { connect: { id: mockCreateSubmissionDto.studentId } },
        componentType: mockCreateSubmissionDto.componentType,
        submitText: mockCreateSubmissionDto.submitText,
      });
      expect(videoProcessingService.processVideo).toHaveBeenCalledWith(mockVideoFile.path);

      // 응답 검증
      expect(result).toBeInstanceOf(SubmissionResponseDto);
      expect(result.studentName).toBe(mockStudent.studentName);
      expect(result.score).toBe(mockSubmission.score);
    });

    it('학생 정보가 일치하지 않으면 BadRequestException을 던져야 합니다', async () => {
      const wrongStudent = { ...mockStudent, studentName: '다른이름' };
      jest.spyOn(studentRepository, 'findById').mockResolvedValue(wrongStudent);

      await expect(
        service.createSubmission({
          videoFile: mockVideoFile,
          createSubmissionDto: mockCreateSubmissionDto,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(studentRepository.findById).toHaveBeenCalledTimes(1);
      expect(submissionRepository.create).not.toHaveBeenCalled();
      expect(videoProcessingService.processVideo).not.toHaveBeenCalled();
    });

    it('이미 제출한 경우 ConflictException을 던져야 합니다', async () => {
      jest.spyOn(studentRepository, 'findById').mockResolvedValue(mockStudent);
      jest.spyOn(submissionRepository, 'findByStudentAndComponent').mockResolvedValue(mockSubmission as Submission);

      await expect(
        service.createSubmission({
          videoFile: mockVideoFile,
          createSubmissionDto: mockCreateSubmissionDto,
        }),
      ).rejects.toThrow(ConflictException);
      expect(studentRepository.findById).toHaveBeenCalledTimes(1);
      expect(submissionRepository.findByStudentAndComponent).toHaveBeenCalledTimes(1);
      expect(submissionRepository.create).not.toHaveBeenCalled();
      expect(videoProcessingService.processVideo).not.toHaveBeenCalled();
    });

    it('비디오 및 ai 처리 전 submission정보를 저장해야 합니다.', async () => {
      jest.spyOn(studentRepository, 'findById').mockResolvedValue(mockStudent);
      jest.spyOn(submissionRepository, 'findByStudentAndComponent').mockResolvedValue(null);
      jest.spyOn(submissionRepository, 'create').mockResolvedValue(mockSubmission as Submission);
    });

    it('비디오 처리 중 오류가 발생하면 InternalServerErrorException을 던져야 합니다', async () => {
      jest.spyOn(studentRepository, 'findById').mockResolvedValue(mockStudent);
      jest.spyOn(submissionRepository, 'findByStudentAndComponent').mockResolvedValue(null);
      jest.spyOn(submissionRepository, 'create').mockResolvedValue(mockSubmission as Submission);
      jest.spyOn(videoProcessingService, 'processVideo').mockRejectedValue(new Error('비디오 처리 오류'));

      await expect(
        service.createSubmission({
          videoFile: mockVideoFile,
          createSubmissionDto: mockCreateSubmissionDto,
        }),
      ).rejects.toThrow(InternalServerErrorException);
      expect(studentRepository.findById).toHaveBeenCalledTimes(1);
      expect(submissionRepository.findByStudentAndComponent).toHaveBeenCalledTimes(1);
      expect(submissionRepository.create).toHaveBeenCalledTimes(1);
      expect(videoProcessingService.processVideo).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateHighlightText', () => {
    it('하이라이트 텍스트를 올바르게 생성해야 합니다', () => {
      const text = 'This is a test sentence. It needs highlights.';
      const highlights = ['test sentence', 'highlights'];

      const result = service['generateHighlightText'](text, highlights);

      expect(result).toBe('This is a <b>test sentence</b>. It needs <b>highlights</b>.');
    });

    it('하이라이트가 없으면 원본 텍스트를 반환해야 합니다', () => {
      const text = 'This is a test sentence.';
      const highlights: string[] = [];

      const result = service['generateHighlightText'](text, highlights);

      expect(result).toBe(text);
    });
  });
});
