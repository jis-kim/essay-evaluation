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

      if (revisionId) {
        await this.prisma.revision.update({
          where: { id: revisionId },
          data: { status: SubmissionStatus.FAILED },
        });
      }
      throw error;
    }
  }

  /**
   * HTML 특수 문자를 이스케이프 처리
   * @param text 이스케이프할 텍스트
   * @returns 이스케이프된 텍스트
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * 하이라이트 텍스트 생성 (중복/겹침 안전)
   * @param text 원본 텍스트
   * @param highlights 하이라이트 문장 배열
   * @returns 하이라이트된 텍스트
   */
  private generateHighlightText(text: string, highlights: string[]): string {
    if (!highlights.length) return this.escapeHtml(text); // no highlights

    // 하이라이트 위치 정보 수집
    const segments: { start: number; end: number; text: string }[] = [];
    highlights.forEach((highlight) => {
      let startIndex = 0;
      while ((startIndex = text.indexOf(highlight, startIndex)) !== -1) {
        segments.push({
          start: startIndex,
          end: startIndex + highlight.length,
          text: highlight,
        });
        startIndex += 1;
      }
    });

    // 시작 위치 기준 정렬
    segments.sort((a, b) => a.start - b.start || b.end - a.end);

    // 겹치는 구간 병합: 이미 감싼 구간과 겹치면 건너뜀 (중복방지)
    const merged: { start: number; end: number; text: string }[] = [];
    let lastEnd = 0;
    for (const seg of segments) {
      if (seg.start >= lastEnd) {
        merged.push(seg);
        lastEnd = seg.end;
      }
    }

    // 결과 문자열 조립
    let result = '';
    let lastIndex = 0;
    for (const seg of merged) {
      result += this.escapeHtml(text.substring(lastIndex, seg.start));
      result += `<b>${this.escapeHtml(seg.text)}</b>`;
      lastIndex = seg.end;
    }
    result += this.escapeHtml(text.substring(lastIndex));
    return result;
  }
}
