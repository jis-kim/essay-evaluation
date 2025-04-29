import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';

// 기본 응답 인터페이스
export interface BaseResponse {
  result: 'ok' | 'error';
  message: string | null;
}

// 성공 응답을 위한 타입
export type SuccessResponse<T> = T & BaseResponse;
export type ErrorResponse = BaseResponse & {
  cause: string;
};

@ApiExtraModels()
export class CommonResponseDto {
  @ApiProperty({
    description: '응답 결과 상태',
    example: 'ok',
    enum: ['ok', 'error'],
  })
  result!: 'ok' | 'error';

  @ApiProperty({
    description: '응답 메시지, 성공 시 null, 실패 시 에러 메시지',
    example: null,
  })
  message!: string | null;

  static success<T extends object>(data: T, message = null): SuccessResponse<T> {
    return {
      result: 'ok',
      message,
      ...data,
    };
  }

  static error(name: string, message: string): ErrorResponse {
    return {
      result: 'error',
      message: name,
      cause: message,
    };
  }
}
