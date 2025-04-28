import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, InternalServerErrorException, Logger } from '@nestjs/common';
import { Submission, SubmissionStatus } from '@prisma/client';

import { StudentRepository, SubmissionRepository } from '../prisma/repository';
import { SubmissionService } from './submission.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { VideoProcessingService } from '../video-processing/video-processing.service';
import { SubmissionResponseDto } from './dto/submission-response.dto';
import { BlobStorageService } from '../blob-storage/blob-storage.service';
import { SubmissionMediaInfo } from '../common/types/media.types';

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
    submitText: "It's good expression, Grammar issues",
    highlightSubmitText: "It's <b>good expression</b>, <b>Grammar issues</b>",
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
    submitText: "It's good expression, Grammar issues",
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

  const mockProcessedMediaInfo: SubmissionMediaInfo[] = [
    {
      type: 'VIDEO',
      filename: 'test-video_no_audio.mp4',
      path: '/tmp/test-video_no_audio.mp4',
      size: 123456,
      format: 'mp4',
    },
    {
      type: 'AUDIO',
      filename: 'test-video_audio.mp3',
      path: '/tmp/test-video_audio.mp3',
      size: 654321,
      format: 'mp3',
    },
  ];
  const mockVideoUrl = 'https://mockstorage.com/test-video_no_audio.mp4';
  const mockAudioUrl = 'https://mockstorage.com/test-video_audio.mp3';

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
          provide: BlobStorageService,
          useValue: {
            uploadFileAndGetSasUrl: jest.fn(),
          },
        },
        {
          provide: VideoProcessingService,
          useValue: {
            processVideo: jest.fn(),
            deleteMedia: jest.fn(),
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
    it('성공적으로 submission을 생성해야 합니다', async () => {
      // Mock 설정
      jest.spyOn(studentRepository, 'findById').mockResolvedValue(mockStudent);
      jest.spyOn(submissionRepository, 'findByStudentAndComponent').mockResolvedValue(null);
      jest.spyOn(submissionRepository, 'create').mockResolvedValue(mockSubmission as Submission);
      jest.spyOn(videoProcessingService, 'processVideo').mockResolvedValue(mockProcessedMediaInfo);
      const uploadSpy = jest
        .spyOn(service['blobStorageService'], 'uploadFileAndGetSasUrl')
        .mockImplementation((filePath: string, filename: string) => {
          if (filename.endsWith('.mp4')) return Promise.resolve(mockVideoUrl);
          if (filename.endsWith('.mp3')) return Promise.resolve(mockAudioUrl);
          return Promise.resolve('unknown');
        });
      jest.spyOn(videoProcessingService, 'deleteMedia').mockResolvedValue();

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
      expect(videoProcessingService.processVideo).toHaveBeenCalledWith(mockVideoFile.path);
      expect(uploadSpy).toHaveBeenCalledTimes(2);
      expect(submissionRepository.create).toHaveBeenCalledWith({
        student: { connect: { id: mockCreateSubmissionDto.studentId } },
        componentType: mockCreateSubmissionDto.componentType,
        submitText: mockCreateSubmissionDto.submitText,
        media: {
          create: [
            {
              type: 'VIDEO',
              filename: 'test-video_no_audio.mp4',
              url: mockVideoUrl,
              size: 123456,
              format: 'mp4',
            },
            {
              type: 'AUDIO',
              filename: 'test-video_audio.mp3',
              url: mockAudioUrl,
              size: 654321,
              format: 'mp3',
            },
          ],
        },
      });

      // 응답 검증
      expect(result).toBeInstanceOf(SubmissionResponseDto);
      expect(result.studentName).toBe(mockStudent.studentName);
      expect(result.score).toBe(mockSubmission.score);
      expect(result.mediaUrl?.video).toBe(mockVideoUrl);
      expect(result.mediaUrl?.audio).toBe(mockAudioUrl);
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
      expect(videoProcessingService.processVideo).not.toHaveBeenCalled();
      expect(submissionRepository.create).not.toHaveBeenCalled();
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
      expect(videoProcessingService.processVideo).not.toHaveBeenCalled();
      expect(submissionRepository.create).not.toHaveBeenCalled();
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
      expect(videoProcessingService.processVideo).toHaveBeenCalledTimes(1);
      expect(submissionRepository.create).not.toHaveBeenCalled();
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
