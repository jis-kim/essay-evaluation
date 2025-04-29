import { Injectable, NotFoundException } from '@nestjs/common';
import { MediaType, Student, Submission, SubmissionMedia, SubmissionStatus } from '@prisma/client';

import { EvaluationService } from '../evaluation/evaluation.service';
import { SubmissionRepository, RevisionRepository } from '../prisma/repository';
import { SubmissionResponseDto } from '../submission/dto/submission-response.dto';

@Injectable()
export class RevisionService {
  constructor(
    private readonly revisionRepository: RevisionRepository,
    private readonly submissionRepository: SubmissionRepository,
    private readonly evaluationService: EvaluationService,
  ) {}
  async createRevision(submissionId: string): Promise<SubmissionResponseDto> {
    let submission = await this.submissionRepository.findById({
      where: { id: submissionId },
    });
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }
    const startTime = Date.now();

    // pending
    const revision = await this.revisionRepository.create({
      data: {
        submission: {
          connect: {
            id: submissionId,
          },
        },
      },
    });

    submission = await this.evaluationService.evaluate({
      submissionId,
      revisionId: revision.id,
      content: submission.submitText,
    });

    // update revision
    await this.revisionRepository.update({
      where: { id: revision.id },
      data: {
        status: SubmissionStatus.COMPLETED,
      },
    });

    const submissionWithRelations = (await this.submissionRepository.findById({
      where: { id: submissionId },
      include: {
        media: true,
        student: true,
      },
    })) as Submission & { student: Student; media: SubmissionMedia[] };

    if (!submissionWithRelations) {
      throw new NotFoundException('Submission not found');
    }

    const apiLatency = Date.now() - startTime;

    return SubmissionResponseDto.fromSubmission({
      submission: submissionWithRelations,
      studentName: submissionWithRelations.student.studentName,
      apiLatency,
      mediaUrls:
        submissionWithRelations.media?.length > 0
          ? {
              video: submissionWithRelations.media.find((m) => m.type === MediaType.VIDEO)?.url,
              audio: submissionWithRelations.media.find((m) => m.type === MediaType.AUDIO)?.url,
            }
          : undefined,
    });
  }
}
