import { Test, TestingModule } from '@nestjs/testing';

import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionResponseDto } from './dto/submission-response.dto';
import { SubmissionController } from './submission.controller';
import { SubmissionService } from './submission.service';

// 컨트롤러 메서드를 모킹하기 위한 타입 정의
type MockSubmissionController = {
  createSubmission: (
    videoFile: Express.Multer.File | undefined,
    createSubmissionDto: CreateSubmissionDto,
  ) => Promise<SubmissionResponseDto>;
};

describe('SubmissionController', () => {
  let controller: SubmissionController;
  let service: SubmissionService;

  const mockCreateSubmissionDto: CreateSubmissionDto = {
    studentId: 1,
    studentName: '김땡삼',
    componentType: 'ESSAY',
    submitText: '테스트 에세이 내용',
  };

  const mockVideoFile = {
    fieldname: 'videoFile',
    originalname: 'test-video.mp4',
    encoding: '7bit',
    mimetype: 'video/mp4',
    buffer: Buffer.from('test'),
    size: 1024,
    path: '/uploads/temp/01HQX7A8DGST7S3N2J4D0KKQN8.mp4',
    destination: './uploads/temp',
    filename: '01HQX7A8DGST7S3N2J4D0KKQN8.mp4',
  } as Express.Multer.File;

  const mockInvalidVideoFile = {
    ...mockVideoFile,
    mimetype: 'video/avi',
    originalname: 'invalid-video.avi',
  } as Express.Multer.File;

  const mockLargeVideoFile = {
    ...mockVideoFile,
    size: 100 * 1024 * 1024, // 100MB (넘 큰 파일)
    originalname: 'large-video.mp4',
  } as Express.Multer.File;

  const mockSubmissionResponse = {
    result: 'ok',
    message: null,
    studentId: 1,
    studentName: '김땡삼',
    submitText: '테스트 에세이 내용',
    highlightSubmitText: '테스트 에세이 내용',
    score: 8,
    feedback: 'Good essay.',
    highlights: ['Good expression', 'Grammar issues'],
    mediaUrl: {
      video: 'https://example.com/video.mp4',
      audio: 'https://example.com/audio.mp3',
    },
    apiLatency: 1000,
  } as SubmissionResponseDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubmissionController],
      providers: [
        {
          provide: SubmissionService,
          useValue: {
            createSubmission: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SubmissionController>(SubmissionController);
    service = module.get<SubmissionService>(SubmissionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createSubmission', () => {
    it('성공적으로 제출을 생성해야 합니다', async () => {
      jest.spyOn(service, 'createSubmission').mockResolvedValue(mockSubmissionResponse);

      const result = await controller.createSubmission(mockCreateSubmissionDto, mockVideoFile);

      expect(service.createSubmission).toHaveBeenCalledWith({
        videoFile: mockVideoFile,
        createSubmissionDto: mockCreateSubmissionDto,
      });
      expect(result).toStrictEqual(mockSubmissionResponse);
    });
  });
});
