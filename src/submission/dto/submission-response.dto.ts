import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Submission } from '@prisma/client';

export class MediaUrlDto {
  @ApiPropertyOptional({ description: '비디오 URL', example: 'https://...sas.mp4' })
  video?: string;

  @ApiPropertyOptional({ description: '오디오 URL', example: 'https://...sas.mp3' })
  audio?: string;
}

export class SubmissionResponseDto {
  @ApiProperty({ description: '학생 ID', example: 123 })
  studentId!: number;

  @ApiProperty({ description: '학생 이름', example: '홍길동' })
  studentName!: string;

  @ApiPropertyOptional({ description: '점수', example: 8 })
  score?: number;

  @ApiPropertyOptional({ description: '피드백', example: 'Great organization, minor grammar issues.' })
  feedback?: string;

  @ApiPropertyOptional({ description: '하이라이트 문장 배열', example: ['I like school.', 'pizza'] })
  highlights?: string[];

  @ApiPropertyOptional({ description: '제출 텍스트', example: 'Hello my name is ...' })
  submitText?: string;

  @ApiPropertyOptional({
    description: '하이라이트 포함 제출 텍스트',
    example: 'Hello my name is ... <b>I like school.</b> I love <b>pizza</b>.',
  })
  highlightSubmitText?: string;

  @ApiPropertyOptional({ type: MediaUrlDto, description: '미디어 URL' })
  mediaUrl?: MediaUrlDto;

  @ApiProperty({ description: 'API 지연(ms)', example: 1432 })
  apiLatency!: number;

  /**
   * Submission 엔티티를 SubmissionResponseDto로 변환
   */
  static fromSubmission(
    submission: Submission,
    studentName: string,
    apiLatency: number,
    mediaUrls?: { video?: string; audio?: string },
  ): SubmissionResponseDto {
    const responseDto = new SubmissionResponseDto();

    //responseDto.result = 'ok'; -> 공통 response
    //responseDto.message = null;
    responseDto.studentId = submission.studentId;
    responseDto.studentName = studentName;
    responseDto.score = submission.score || undefined;
    responseDto.feedback = submission.feedback || undefined;
    responseDto.highlights = submission.highlights || [];
    responseDto.submitText = submission.submitText;
    responseDto.highlightSubmitText = submission.highlightSubmitText || undefined;
    responseDto.apiLatency = apiLatency;

    // 미디어 URL이 있으면 설정
    if (mediaUrls) {
      responseDto.mediaUrl = new MediaUrlDto();
      responseDto.mediaUrl.video = mediaUrls.video;
      responseDto.mediaUrl.audio = mediaUrls.audio;
    }

    return responseDto;
  }
}
