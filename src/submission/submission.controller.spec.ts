import { Test, TestingModule } from '@nestjs/testing';

import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionResponseDto } from './dto/submission-response.dto';
import { SubmissionController } from './submission.controller';
import { SubmissionService } from './submission.service';

describe('SubmissionController', () => {
  let controller: SubmissionController;
  let service: SubmissionService;

  const mockCreateSubmissionDto: CreateSubmissionDto = {
    studentId: 1,
    studentName: '김땡삼',
    componentType: 'ESSAY',
    submitText: '테스트 에세이 내용',
  };

  const mockSubmissionResponse = {
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

      const result = await controller.createSubmission(mockCreateSubmissionDto);

      expect(result).toBeDefined();
      expect(result).toEqual(mockSubmissionResponse);
      expect(service.createSubmission).toHaveBeenCalledWith(mockCreateSubmissionDto);
    });
  });
});
