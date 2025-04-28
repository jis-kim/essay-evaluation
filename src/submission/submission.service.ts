import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Submission } from '@prisma/client';

import { BlobStorageService } from '../blob-storage/blob-storage.service';
import { SubmissionMediaCreateInput } from '../common/types/media.types';
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
    // private readonly aiService: AiService,
  ) {}

  async createSubmission({
    videoFile,
    createSubmissionDto,
  }: {
    createSubmissionDto: CreateSubmissionDto;
    videoFile?: Express.Multer.File;
  }): Promise<SubmissionResponseDto> {
    const startTime = Date.now(); // FIXME: API 지연시간 측정 시작
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
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('비디오 처리');
    } finally {
      // 미디어 정보 삭제
      if (videoFile) {
        void this.videoProcessingService.deleteMedia(videoFile.filename);
      }
    }

    // 6. ai 부르기 - 나중에 실제 AI 서비스 호출로 대체
    //const aiResult: AiResult = {
    //  score: 8, // 0 ~ 10
    //  feedback: 'Good essay.',
    //  highlights: ['Good expression', 'Grammar issues'],
    //};
    /*
    try {
      aiResult = await this.aiService.evaluate(blobId);
    } catch {
      throw new BadRequestException('AI 평가 실패');
    }
    */

    // 하이라이트가 포함된 텍스트 생성 (예시)
    //const highlightSubmitText = this.generateHighlightText(submitText, aiResult.highlights || []);

    // FIXME: API 지연시간 계산
    const apiLatency = Date.now() - startTime;

    // DTO 클래스의 정적 메소드를 사용하여 응답 변환
    return SubmissionResponseDto.fromSubmission(
      submission,
      studentName,
      apiLatency,
      mediaCreateInput.length > 0
        ? {
            video: mediaCreateInput.find((m) => m.type === 'VIDEO')?.url,
            audio: mediaCreateInput.find((m) => m.type === 'AUDIO')?.url,
          }
        : undefined,
    );
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

  // 하이라이트 텍스트 생성 (간단한 구현 예시)
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
