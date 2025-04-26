import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

export class CreateSubmissionDto {
  @ApiProperty({ description: '학생 ID', example: 123 })
  @IsNumber()
  @Type(() => Number)
  studentId!: number;

  @ApiProperty({ description: '학생 이름', example: '홍길동' })
  @IsString()
  studentName!: string;

  @ApiProperty({ description: '컴포넌트 타입', example: 'Essay Writing' })
  @IsString()
  componentType!: string;

  @ApiProperty({ description: '제출 텍스트', example: 'Hello my name is ...' })
  @IsString()
  submitText!: string;
}
