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
import { ApiBody, ApiConsumes, ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { ulid } from 'ulid';

import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionResponseDto } from './dto/submission-response.dto';
import { SubmissionService } from './submission.service';

// Swagger 문서화를 위한 확장 DTO
class CreateSubmissionWithFileDto extends CreateSubmissionDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'MP4 비디오 파일 (최대 50MB)',
    required: true,
  })
  videoFile!: Express.Multer.File;
}

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
    type: CreateSubmissionWithFileDto,
  })
  @ApiOkResponse({
    type: SubmissionResponseDto,
    description: '요청 처리 완료 (성공 응답 예시)',
  })
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('videoFile', {
      storage: diskStorage({
        destination: './uploads/temp',
        filename: (req, file, cb) => {
          const uniqueFilename = `${ulid()}${extname(file.originalname)}`;
          cb(null, uniqueFilename);
        },
      }),
      limits: {
        fileSize: 1024 * 1024 * 50, // 50MB 제한
      },
      fileFilter: (req, file, cb) => {
        // mp4 파일만 허용
        if (file.mimetype !== 'video/mp4') {
          return cb(new UnsupportedMediaTypeException('mp4 파일만 업로드 가능합니다.'), false);
        }
        cb(null, true);
      },
    }),
  )
  @Post()
  async createSubmission(
    @UploadedFile() videoFile: Express.Multer.File,
    @Body() createSubmissionDto: CreateSubmissionDto,
  ): Promise<SubmissionResponseDto> {
    return this.submissionService.createSubmission({ videoFile, createSubmissionDto });
  }
}
