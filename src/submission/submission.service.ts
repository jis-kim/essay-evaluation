import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { MediaType, Submission } from '@prisma/client';

import { BlobStorageService } from '../blob-storage/blob-storage.service';
import { SubmissionMediaCreateInput } from '../common/types/media.types';
import { EvaluationService } from '../evaluation/evaluation.service';
import { StudentRepository, SubmissionRepository } from '../prisma/repository';
import { VideoProcessingService } from '../video-processing/video-processing.service';

import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionResponseDto } from './dto/submission-response.dto';

@Injectable()
export class SubmissionService {
  private readonly logger = new Logger(SubmissionService.name);

  constructor(
    private readonly studentRepository: StudentRepository,
    private readonly submissionRepository: SubmissionRepository,
    private readonly videoProcessingService: VideoProcessingService,
    private readonly blobStorageService: BlobStorageService,
    private readonly evaluationService: EvaluationService,
  ) {}

  async createSubmission({
    videoFile,
    createSubmissionDto,
  }: {
    createSubmissionDto: CreateSubmissionDto;
    videoFile?: Express.Multer.File;
  }): Promise<SubmissionResponseDto> {
    const startTime = Date.now();
    const { studentId, studentName, componentType, submitText } = createSubmissionDto;

    // 1. 학생 조회
    const student = await this.studentRepository.findById(studentId);
    if (!student || student.studentName !== studentName) {
      throw new BadRequestException('제출자 정보가 다릅니다.');
    }

    // 2. 컴포넌트 타입 + 학생으로 unique 조회 (중복 제출 방지)
    const existingSubmission = await this.submissionRepository.findByStudentAndComponent(studentId, componentType);
    if (existingSubmission) {
      throw new ConflictException('이미 제출한 과제입니다.');
    }

    let submission: Submission;
    let mediaCreateInput: SubmissionMediaCreateInput[] = [];

    try {
      // 2. 미디어 정보 생성 (비디오 처리 + 업로드)
      if (videoFile) {
        mediaCreateInput = await this.processAndUploadMedia(videoFile.path);
      }

      // 3. Submission 생성 (media가 있으면 중첩 create)
      submission = await this.submissionRepository.create({
        student: { connect: { id: studentId } },
        componentType,
        submitText,
        ...(mediaCreateInput.length > 0 && { media: { create: mediaCreateInput } }),
      });

      // 4. AI 평가 요청
      submission = await this.evaluationService.evaluate({
        submissionId: submission.id,
        content: submitText,
      });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('제출 처리 중 오류가 발생했습니다.');
    } finally {
      // 미디어 정보 삭제
      if (videoFile) {
        void this.videoProcessingService.deleteMedia(videoFile.filename);
      }
    }

    // FIXME: API 지연시간 계산
    const apiLatency = Date.now() - startTime;

    // DTO 클래스의 정적 메소드를 사용하여 응답 변환
    return SubmissionResponseDto.fromSubmission({
      submission,
      studentName,
      apiLatency,
      mediaUrls:
        mediaCreateInput.length > 0
          ? {
              video: mediaCreateInput.find((m) => m.type === MediaType.VIDEO)?.url,
              audio: mediaCreateInput.find((m) => m.type === MediaType.AUDIO)?.url,
            }
          : undefined,
    });
  }

  // 미디어 처리 + 업로드
  private async processAndUploadMedia(videoPath: string): Promise<SubmissionMediaCreateInput[]> {
    const processedMediaInfo = await this.videoProcessingService.processVideo(videoPath);
    return await Promise.all(
      processedMediaInfo.map(async (mediaInfo) => {
        const url = await this.blobStorageService.uploadFileAndGetSasUrl(mediaInfo.path, mediaInfo.filename);
        return {
          type: mediaInfo.type,
          filename: mediaInfo.filename,
          url,
          size: mediaInfo.size,
          format: mediaInfo.format,
        };
      }),
    );
  }
}
