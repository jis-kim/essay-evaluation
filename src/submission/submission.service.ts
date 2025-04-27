import { BadRequestException, ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Submission } from '@prisma/client';

// 필요한 서비스 모듈들은 나중에 구현 후 주석 해제
// import { AiService } from '../ai/ai.service';
// import { BlobService } from '../blob/blob.service';
// import { VideoService } from '../video/video.service';

import { StudentRepository, SubmissionRepository } from '../prisma/repository';
import { VideoProcessingService } from '../video-processing/video-processing.service';

import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionResponseDto } from './dto/submission-response.dto';

@Injectable()
export class SubmissionService {
  constructor(
    private readonly studentRepository: StudentRepository,
    private readonly submissionRepository: SubmissionRepository,
    private readonly videoProcessingService: VideoProcessingService,
    // private readonly blobService: BlobService,
    // private readonly aiService: AiService,
  ) {}

  async createSubmission({
    videoFile,
    createSubmissionDto,
  }: {
    videoFile: Express.Multer.File;
    createSubmissionDto: CreateSubmissionDto;
  }): Promise<SubmissionResponseDto> {
    const startTime = Date.now(); // API 지연시간 측정 시작
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

    // create submission
    const submission: Submission = await this.submissionRepository.create({
      student: { connect: { id: studentId } },
      componentType,
      submitText,
    });

    // 3-6. 비디오 업로드부터 AI 호출까지 서비스 구현 필요
    // 현재는 서비스가 없으므로 주석 처리하고 더미 데이터 사용

    // 4. 비디오 업로드 프로세싱
    let processedVideoInfo;
    try {
      processedVideoInfo = await this.videoProcessingService.processVideo(videoFile.path);
    } catch (error) {
      throw new InternalServerErrorException((error as Error).message);
    }

    console.log(processedVideoInfo);

    // 5. blob 저장 - 나중에 구현
    /*
    try {
      blobId = await this.blobService.save(processedVideoInfo);
    } catch {
      throw new BadRequestException('blob 저장 실패');
    }
    */

    //5-1. save to submission_media(DB)
    /*await this.submissionMediaRepository.create({
      submission: { connect: { id: submission.id } },
      videoUrl: videoUrl,
    });*/

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

    // 7. 제출 정보 DB 저장 - Prisma 스키마에 맞게 필드 조정
    // 8. submission log 저장

    // 8. 미디어 정보는 SubmissionMedia 테이블에 별도로 저장 필요
    // 따로 미디어 저장소가 구현된 후 사용
    /*
    await this.submissionMediaRepository.create({
      submission: { connect: { id: submission.id } },
      videoUrl: videoUrl,
    });
    */

    // API 지연시간 계산
    const apiLatency = Date.now() - startTime;

    // DTO 클래스의 정적 메소드를 사용하여 응답 변환
    return SubmissionResponseDto.fromSubmission(
      submission,
      studentName,
      apiLatency,
      { video: processedVideoInfo.noAudioVideoPath, audio: processedVideoInfo.audioPath }, // 실제 구현 시 DB에서 가져오거나 서비스에서 반환된 값 사용
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
