import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SubmissionResponseDto } from '../submission/dto/submission-response.dto';

import { CreateRevisionDto } from './dto/create-revision.dto';
import { RevisionService } from './revision.service';

@ApiTags('Revision')
@Controller('revision')
export class RevisionController {
  constructor(private readonly revisionService: RevisionService) {}

  /**
   * 재평가 요청 API
   * @param createRevisionDto 재평가 요청하는 submissionId
   * @returns 재평가 요청 결과
   */
  @Post()
  @ApiOperation({
    summary: '재평가 요청 API',
    description: '재평가 요청하는 submissionId를 받아 재평가 결과를 반환합니다.',
  })
  @ApiOkResponse({
    type: SubmissionResponseDto,
    description: '재평가 요청 결과',
  })
  async createRevision(@Body() createRevisionDto: CreateRevisionDto): Promise<SubmissionResponseDto> {
    return this.revisionService.createRevision(createRevisionDto.submissionId);
  }
}
