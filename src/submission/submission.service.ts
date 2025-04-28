import { BadRequestException, ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Submission } from '@prisma/client';

import { BlobStorageService } from '../blob-storage/blob-storage.service';
import { StudentRepository, SubmissionRepository } from '../prisma/repository';
import { VideoProcessingService } from '../video-processing/video-processing.service';

import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionResponseDto } from './dto/submission-response.dto';

@Injectable()
export class SubmissionService {
  constructor(
    private readonly studentRepository: StudentRepository,
    private readonly submissionRepository: SubmissionRepository,
    //private readonly submissionMediaRepository: SubmissionMediaRepository,
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

    // 3. 비디오 업로드 프로세싱
    let processedVideoInfo = null;
    if (videoFile) {
      try {
        processedVideoInfo = await this.videoProcessingService.processVideo(videoFile.path);
      } catch (error) {
        // TODO: remove all saved files in this process
        // HOWTO: videoFile.path* 파일 제거
        throw new InternalServerErrorException((error as Error).message);
      }
    }

    // 4. create submission
    const submission: Submission = await this.submissionRepository.create({
      student: { connect: { id: studentId } },
      componentType,
      submitText,
    });

    // 5. 비디오/오디오 파일이 있으면 Azure Blob Storage에 업로드하고 SAS URL 생성
    let videoUrl: string | undefined;
    let audioUrl: string | undefined;

    if (processedVideoInfo) {
      try {
        // 비디오 파일 업로드
        const videoFileName = processedVideoInfo.noAudioVideoPath;
        videoUrl = await this.blobStorageService.uploadFileAndGetSasUrl(
          processedVideoInfo.noAudioVideoPath,
          videoFileName,
          'video/mp4',
        );

        // 오디오 파일 업로드
        const audioFileName = `submission/${submission.id}/audio_${Date.now()}.mp3`;
        audioUrl = await this.blobStorageService.uploadFileAndGetSasUrl(
          processedVideoInfo.audioPath,
          audioFileName,
          'audio/mpeg',
        );

        //// 업로드된 URL을 DB에 저장
        //await this.submissionMediaRepository.create({
        //  submission: { connect: { id: submission.id } },
        //  videoUrl,
        //  audioUrl,
        //});
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
        throw new InternalServerErrorException(`Blob 저장 실패: ${errorMessage}`);
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
      videoUrl || audioUrl
        ? {
            video: videoUrl,
            audio: audioUrl,
          }
        : undefined,
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
