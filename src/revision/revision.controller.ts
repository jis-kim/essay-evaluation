import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiCommonResponse } from '../common/decorators/api-response.decorator';
import { CommonResponseDto, SuccessResponse } from '../common/dto/common-response.dto';
import { SubmissionResponseDto } from '../submission/dto/submission-response.dto';

import { CreateRevisionDto } from './dto/create-revision.dto';
import { RevisionService } from './revision.service';

@ApiTags('Revision')
@Controller('revision')
export class RevisionController {
  constructor(private readonly revisionService: RevisionService) {}

  @ApiOperation({
    summary: '재평가 요청 API',
    description: '재평가 요청하는 submissionId를 받아 재평가 결과를 반환합니다.',
  })
  @ApiCommonResponse(SubmissionResponseDto)
  @HttpCode(HttpStatus.OK)
  @Post()
  async createRevision(@Body() createRevisionDto: CreateRevisionDto): Promise<SuccessResponse<SubmissionResponseDto>> {
    const result = await this.revisionService.createRevision(createRevisionDto.submissionId);
    return CommonResponseDto.success(result);
  }
}
