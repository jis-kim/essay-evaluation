import { Body, Controller, Post } from '@nestjs/common';

import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionResponseDto } from './dto/submission-response.dto';
import { SubmissionService } from './submission.service';

@Controller('submissions')
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Post()
  async createSubmission(@Body() createSubmissionDto: CreateSubmissionDto): Promise<SubmissionResponseDto> {
    // studentId, studentName, componentType, submitText
    return this.submissionService.createSubmission(createSubmissionDto);
  }
}
