// src/common/decorators/api-response.decorator.ts 파일 생성
import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

import { CommonResponseDto } from '../dto/common-response.dto';

export const ApiCommonResponse = <TModel extends Type<object>>(model: TModel) =>
  applyDecorators(
    ApiExtraModels(CommonResponseDto, model),
    ApiOkResponse({
      schema: {
        allOf: [{ $ref: getSchemaPath(CommonResponseDto) }, { $ref: getSchemaPath(model) }],
      },
    }),
  );
