import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateRevisionDto {
  @ApiProperty({ description: '제출 ID', example: 'uuid-type' })
  @IsUUID()
  submissionId!: string;
}
