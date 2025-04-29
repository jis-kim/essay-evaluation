import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationService } from './evaluation.service';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubmissionStatus } from '@prisma/client';

describe('EvaluationService', () => {
  let service: EvaluationService;
  let aiService: AiService;
  let prisma: PrismaService;

  const mockSubmission = {
    id: 'sub-1',
    score: null,
    feedback: null,
    highlights: null,
    highlightSubmitText: null,
    status: SubmissionStatus.PENDING,
  };

  const mockAiResult = {
    score: 8,
    feedback: 'Good essay.',
    highlights: ['test sentence', 'highlights'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluationService,
        {
          provide: AiService,
          useValue: {
            evaluateEssay: jest.fn().mockResolvedValue(mockAiResult),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(),
            submission: {
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<EvaluationService>(EvaluationService);
    aiService = module.get<AiService>(AiService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('evaluate', () => {
    it('AI 평가 결과로 submission과 log를 정상적으로 업데이트해야 한다', async () => {
      // given
      (aiService.evaluateEssay as jest.Mock).mockResolvedValue(mockAiResult);

      // Prisma 트랜잭션 mock
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
        // 트랜잭션 콜백에 Prisma mock 객체 전달
        return cb({
          submissionLog: {
            create: jest.fn().mockResolvedValue({}),
          },
          submission: {
            update: jest.fn().mockResolvedValue({
              ...mockSubmission,
              ...mockAiResult,
              highlightSubmitText: 'This is a <b>test sentence</b>. It needs <b>highlights</b>.',
              status: SubmissionStatus.COMPLETED,
            }),
          },
        });
      });

      // when
      const result = await service.evaluate({
        submissionId: mockSubmission.id,
        content: 'This is a test sentence. It needs highlights.',
      });

      // then
      expect(aiService.evaluateEssay).toHaveBeenCalledWith('This is a test sentence. It needs highlights.');
      expect(result.score).toBe(8);
      expect(result.feedback).toBe('Good essay.');
      expect(result.status).toBe(SubmissionStatus.COMPLETED);
      expect(result.highlightSubmitText).toContain('<b>test sentence</b>');
    });

    it('AI 평가 중 에러 발생 시 submission 상태가 FAILED로 업데이트되어야 한다', async () => {
      // given
      (aiService.evaluateEssay as jest.Mock).mockRejectedValue(new Error('AI 오류'));
      (prisma.submission.update as jest.Mock).mockResolvedValue({
        ...mockSubmission,
        status: SubmissionStatus.FAILED,
      });

      // when & then
      await expect(
        service.evaluate({
          submissionId: mockSubmission.id,
          content: 'test',
        }),
      ).rejects.toThrow('AI 오류');
      expect(prisma.submission.update).toHaveBeenCalledWith({
        where: { id: mockSubmission.id },
        data: { status: SubmissionStatus.FAILED },
      });
    });

    it('트랜잭션 중 에러 발생 시 예외를 던진다', async () => {
      (aiService.evaluateEssay as jest.Mock).mockResolvedValue(mockAiResult);
      (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('트랜잭션 오류'));

      await expect(
        service.evaluate({
          submissionId: mockSubmission.id,
          content: 'test',
        }),
      ).rejects.toThrow('트랜잭션 오류');
    });
  });

  describe('generateHighlightText', () => {
    it('하이라이트 텍스트를 올바르게 생성해야 한다', () => {
      const text = 'This is a test sentence. It needs highlights.';
      const highlights = ['test sentence', 'highlights'];
      const result = (service as any).generateHighlightText(text, highlights);
      expect(result).toBe('This is a <b>test sentence</b>. It needs <b>highlights</b>.');
    });

    it('하이라이트가 없으면 원본 텍스트를 반환해야 한다', () => {
      const text = 'This is a test sentence.';
      const highlights: string[] = [];
      const result = (service as any).generateHighlightText(text, highlights);
      expect(result).toBe(text);
    });

    it('하이라이트가 텍스트에 없는 경우', () => {
      const text = 'no highlight here';
      const highlights = ['notfound'];
      const result = (service as any).generateHighlightText(text, highlights);
      expect(result).toBe(text);
    });

    it('겹치는 하이라이트가 있을 때 가장 앞에 오는 것만 감싸야 한다', () => {
      const text = 'abcdefg';
      const highlights = ['abc', 'bc', 'cde'];
      const result = (service as any).generateHighlightText(text, highlights);
      expect(result).toBe('<b>abc</b>defg');
    });

    it('HTML 특수문자가 포함된 하이라이트가 올바르게 이스케이프되어야 한다', () => {
      const text = 'a <b> & b';
      const highlights = ['<b>'];
      const result = (service as any).generateHighlightText(text, highlights);
      expect(result).toBe('a <b>&lt;b&gt;</b> &amp; b');
    });

    it('여러 번 등장하는 하이라이트를 모두 포함해야 한다', () => {
      const text = 'foo bar foo bar';
      const highlights = ['foo'];
      const result = (service as any).generateHighlightText(text, highlights);
      expect(result).toBe('<b>foo</b> bar <b>foo</b> bar');
    });
  });
});
