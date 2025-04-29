import { BaseResponse } from '../dto/common-response.dto';

// 성공 응답 타입
export type SuccessResponse<T> = T & BaseResponse;

// 에러 응답 타입
export type ErrorResponse = BaseResponse;

// 전체 응답 타입 (성공 또는 실패)
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
