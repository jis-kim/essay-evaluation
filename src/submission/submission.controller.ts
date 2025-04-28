import { extname } from 'path';

import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { ulid } from 'ulid';

import { MEDIA_DIR } from '../common/constants/media.constants';

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
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        studentId: { type: 'number', example: 1 },
        studentName: { type: 'string', example: '김민준' },
        componentType: { type: 'string', example: 'Essay Writing' },
        submitText: { type: 'string', example: 'Hello my name is ...' },
        videoFile: {
          type: 'string',
          format: 'binary',
          description: 'MP4 비디오 파일 (최대 50MB)',
          nullable: true, // optional 설정
        },
      },
      required: ['studentId', 'studentName', 'componentType', 'submitText'],
    },
  })
  @ApiOkResponse({
    type: SubmissionResponseDto,
    description: '요청 처리 완료 (성공 응답 예시)',
  })
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('videoFile', {
      storage: diskStorage({
        destination: MEDIA_DIR,
        filename: (req, file, cb) => {
          const uniqueFilename = `${ulid()}${extname(file.originalname)}`;
          cb(null, uniqueFilename);
        },
      }),
      limits: {
        fileSize: 1024 * 1024 * 50, // 50MB 제한
      },
      fileFilter: (req, file, cb) => {
        // 비디오 파일만 허용
        if (!file.mimetype.startsWith('video/')) {
          return cb(new UnsupportedMediaTypeException('비디오 파일만 업로드 가능합니다.'), false);
        }
        cb(null, true);
      },
    }),
  )
  @Post()
  async createSubmission(
    @Body() createSubmissionDto: CreateSubmissionDto,
    @UploadedFile() videoFile?: Express.Multer.File,
  ): Promise<SubmissionResponseDto> {
    return this.submissionService.createSubmission({ createSubmissionDto, videoFile });
  }
}
