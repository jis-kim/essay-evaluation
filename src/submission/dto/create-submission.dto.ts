import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsString, Length } from 'class-validator';

export class CreateSubmissionDto {
  @ApiProperty({ description: '학생 ID', example: 1 })
  @IsNumber()
  @Type(() => Number)
  studentId!: number;

  @ApiProperty({ description: '학생 이름', example: '김민준' })
  @IsString()
  @Length(1, 100)
  studentName!: string;

  @ApiProperty({ description: '컴포넌트 타입', example: 'Essay Writing' })
  @IsString()
  @Length(1, 100)
  componentType!: string;

  @ApiProperty({ description: '제출 텍스트', example: 'Hello my name is ...' })
  @IsString()
  submitText!: string;
}
