import { Test, TestingModule } from '@nestjs/testing';
import { RevisionController } from './revision.controller';
import { RevisionService } from './revision.service';
import { SubmissionResponseDto } from '../submission/dto/submission-response.dto';

describe('RevisionController', () => {
  let controller: RevisionController;
  let mockRevisionService: any;

  beforeEach(async () => {
    mockRevisionService = {
      createRevision: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RevisionController],
      providers: [{ provide: RevisionService, useValue: mockRevisionService }],
    }).compile();

    controller = module.get<RevisionController>(RevisionController);
  });

  it('재평가 요청 API가 정상 동작한다', async () => {
    const submissionId = 'test-id';
    const responseDto = { studentName: '홍길동', mediaUrl: {} } as SubmissionResponseDto;
    mockRevisionService.createRevision.mockResolvedValue(responseDto);

    const result = await controller.createRevision({ submissionId });

    expect(mockRevisionService.createRevision).toHaveBeenCalledWith(submissionId);
    expect(result).toBe(responseDto);
  });
});
