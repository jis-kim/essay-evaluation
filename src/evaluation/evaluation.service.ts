import { Injectable, Logger } from '@nestjs/common';
import { Submission, SubmissionStatus } from '@prisma/client';
import { ulid } from 'ulid';

import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
  ) {}

  async evaluate({
    submissionId,
    content,
    revisionId = null,
  }: {
    submissionId: string;
    content: string;
    revisionId?: string | null;
  }): Promise<Submission> {
    try {
      const startTime = Date.now();
      const aiResult = await this.aiService.evaluateEssay(content);
      const highlightedText = this.generateHighlightText(content, aiResult.highlights);

      const latency = Date.now() - startTime;
      return this.prisma.$transaction(async (tx) => {
        // 2. 로그 생성
        await tx.submissionLog.create({
          data: {
            submissionId,
            revisionId,
            result: aiResult, //json
            latency,
            traceId: ulid(), // OpenTelemetry 도입 시 context에서 가져올 예정
          },
        });

        // 3. Submission 업데이트
        return tx.submission.update({
          where: { id: submissionId },
          data: {
            score: aiResult.score,
            feedback: aiResult.feedback,
            highlights: aiResult.highlights,
            highlightSubmitText: highlightedText,
            status: SubmissionStatus.COMPLETED,
          },
        });
      });
    } catch (error) {
      this.logger.error('AI 평가 중 오류 발생:', error);
      // update submission status to failed
      await this.prisma.submission.update({
        where: { id: submissionId },
        data: { status: SubmissionStatus.FAILED },
      });
      throw error;
    }
  }

  /**
   * 하이라이트 텍스트 생성
   * @param text 원본 텍스트
   * @param highlights 하이라이트 문장 배열
   * @returns 하이라이트된 텍스트
   */
  private generateHighlightText(text: string, highlights: string[]): string {
    let result = text;

    // 각 하이라이트를 볼드체로 변환 (간단한 구현)
    highlights.forEach((highlight) => {
      if (result.includes(highlight)) {
        result = result.replace(highlight, `<b>${highlight}</b>`);
      }
    });

    return result;
  }
}
