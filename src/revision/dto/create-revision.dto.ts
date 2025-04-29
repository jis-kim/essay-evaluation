import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateRevisionDto {
  @ApiProperty({ description: '제출 ID', example: 'uuid-type' })
  @IsString()
  @IsNotEmpty()
  submissionId!: string;
}
