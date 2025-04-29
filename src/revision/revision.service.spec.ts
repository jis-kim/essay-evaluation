import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SubmissionStatus, MediaType } from '@prisma/client';

import { EvaluationService } from '../evaluation/evaluation.service';
import { SubmissionRepository, RevisionRepository } from '../prisma/repository';
import { RevisionService } from './revision.service';

describe('RevisionService', () => {
  let service: RevisionService;
  let mockRevisionRepository: any;
  let mockSubmissionRepository: any;
  let mockEvaluationService: any;

  beforeEach(async () => {
    mockRevisionRepository = {
      create: jest.fn(),
      update: jest.fn(),
    };
    mockSubmissionRepository = {
      findById: jest.fn(),
    };
    mockEvaluationService = {
      evaluate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RevisionService,
        { provide: RevisionRepository, useValue: mockRevisionRepository },
        { provide: SubmissionRepository, useValue: mockSubmissionRepository },
        { provide: EvaluationService, useValue: mockEvaluationService },
      ],
    }).compile();

    service = module.get<RevisionService>(RevisionService);
  });

  it('정상적으로 재평가를 생성한다', async () => {
    const submissionId = 'test-id';
    const revisionId = 'revision-id';
    const submission = {
      id: submissionId,
      submitText: 'test',
    };
    const revision = { id: revisionId };
    const evaluatedSubmission = { ...submission };
    const submissionWithRelations = {
      ...submission,
      student: { studentName: '홍길동' },
      media: [
        { type: MediaType.VIDEO, url: 'video-url' },
        { type: MediaType.AUDIO, url: 'audio-url' },
      ],
    };

    mockSubmissionRepository.findById
      .mockResolvedValueOnce(submission) // 처음엔 submission 찾기
      .mockResolvedValueOnce(submissionWithRelations); // 마지막에 relations 포함된 submission
    mockRevisionRepository.create.mockResolvedValue(revision);
    mockEvaluationService.evaluate.mockResolvedValue(evaluatedSubmission);
    mockRevisionRepository.update.mockResolvedValue({});

    const result = await service.createRevision(submissionId);

    expect(mockSubmissionRepository.findById).toHaveBeenCalled();
    expect(mockRevisionRepository.create).toHaveBeenCalled();
    expect(mockEvaluationService.evaluate).toHaveBeenCalled();
    expect(mockRevisionRepository.update).toHaveBeenCalledWith({
      where: { id: revisionId },
      data: { status: SubmissionStatus.COMPLETED },
    });
    expect(result.studentName).toBe('홍길동');
    expect(result.mediaUrl?.video).toBe('video-url');
    expect(result.mediaUrl?.audio).toBe('audio-url');
  });

  it('미디어가 없어도 재평가 결과가 정상적으로 반환된다', async () => {
    const submissionId = 'test-id';
    const revisionId = 'revision-id';
    const submission = { id: submissionId, submitText: 'test' };
    const revision = { id: revisionId };
    const evaluatedSubmission = { ...submission };
    const submissionWithRelations = {
      ...submission,
      student: { studentName: '홍길동' },
    };

    mockSubmissionRepository.findById
      .mockResolvedValueOnce(submission) // 처음엔 submission 찾기
      .mockResolvedValueOnce(submissionWithRelations); // 마지막에 relations 포함된 submission
    mockRevisionRepository.create.mockResolvedValue(revision);
    mockEvaluationService.evaluate.mockResolvedValue(evaluatedSubmission);
    mockRevisionRepository.update.mockResolvedValue({});

    const result = await service.createRevision(submissionId);

    expect(mockSubmissionRepository.findById).toHaveBeenCalled();
    expect(mockRevisionRepository.create).toHaveBeenCalled();
    expect(mockEvaluationService.evaluate).toHaveBeenCalled();
    expect(mockRevisionRepository.update).toHaveBeenCalledWith({
      where: { id: revisionId },
      data: { status: SubmissionStatus.COMPLETED },
    });
    expect(result.mediaUrl).toBeUndefined();
  });

  it('submission이 없으면 예외를 던진다', async () => {
    mockSubmissionRepository.findById.mockResolvedValue(null);

    await expect(service.createRevision('no-id')).rejects.toThrow(NotFoundException);
  });
});
