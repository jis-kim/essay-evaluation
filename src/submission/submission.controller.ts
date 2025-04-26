import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiOkResponse } from '@nestjs/swagger';

import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionResponseDto } from './dto/submission-response.dto';
import { SubmissionService } from './submission.service';

@ApiTags('submissions')
@Controller('submissions')
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  @ApiOperation({
    summary: '새로운 에세이 제출 생성',
    description: '학생이 에세이를 제출하면 평가 결과를 반환합니다.',
  })
  @ApiOkResponse({
    type: SubmissionResponseDto,
    description: '요청 처리 완료 (성공 응답 예시)',
  })
  @HttpCode(HttpStatus.OK)
  @Post()
  async createSubmission(@Body() createSubmissionDto: CreateSubmissionDto): Promise<SubmissionResponseDto> {
    return this.submissionService.createSubmission(createSubmissionDto);
  }
}
