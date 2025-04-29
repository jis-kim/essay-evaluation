import { Injectable } from '@nestjs/common';
import { AzureOpenAI } from 'openai';
import { z } from 'zod';

import { AppConfigService } from '../config/config.service';

import type { ChatCompletionMessageParam } from 'openai/resources';

// AI 응답 검증을 위한 Zod 스키마
const aiResponseSchema = z.object({
  score: z.number().int().min(0).max(10),
  feedback: z.string(),
  highlights: z.array(z.string()),
});

export type AiResponse = z.infer<typeof aiResponseSchema>;

@Injectable()
export class AiService {
  private readonly client: AzureOpenAI;
  private readonly deploymentName: string;

  constructor(private readonly appConfigService: AppConfigService) {
    const apiKey = this.appConfigService.azureOpenAIConfig.apiKey;
    const endpoint = this.appConfigService.azureOpenAIConfig.endpointUrl;
    const apiVersion = this.appConfigService.azureOpenAIConfig.apiVersion;
    this.deploymentName = this.appConfigService.azureOpenAIConfig.deploymentName;

    this.client = new AzureOpenAI({
      apiKey,
      endpoint,
      apiVersion,
      deployment: this.deploymentName,
      maxRetries: 3,
    });
  }

  async evaluateEssay(content: string): Promise<AiResponse> {
    try {
      const messages: ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `당신은 영어 에세이를 평가하는 평가자입니다. 다음 기준으로 평가해주세요:
          1. 문법적 정확성
          2. 논리적 구성
          3. 어휘 사용

          응답은 반드시 다음 JSON 형식이어야 합니다:
          {
            "score": 0~10 사이의 정수,
            "feedback": "문단별/항목별 간단한 코멘트 형식의 상세 피드백",
            "highlights": ["감점 사유가 된 문장이나 단어"]
          }
          feedback은 영어로 생성해주세요.
          highlights는 감점 사유가 된 문장이나 단어를 배열로 반환해주세요.
          - 배열의 요소는 문장이나 단어 자체여야 합니다.
          - 문법과 논리의 문제일 경우 문장 전체를 반환하고, 어휘의 문제일 경우 단어 자체를 반환해주세요.
          - 겹치는 문장이나 단어는 중복해서 반환하지 말아주세요.
          `,
        },
        {
          role: 'user',
          content,
        },
      ];

      const response = await this.client.chat.completions.create({
        messages,
        model: this.deploymentName,
        temperature: 0.5,
        max_tokens: 500,
        response_format: {
          type: 'json_object',
        },
      });

      if (!response.choices[0]?.message?.content) {
        throw new Error('AI가 응답을 생성하지 못했습니다.');
      }

      // AI 응답을 파싱
      const aiResponse = JSON.parse(response.choices[0].message.content) as unknown;

      // 스키마 검증
      const validatedResponse = aiResponseSchema.parse(aiResponse);

      return validatedResponse;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error('AI 응답이 올바른 형식이 아닙니다.');
      }
      throw new Error('AI 평가 처리 중 오류가 발생했습니다.');
    }
  }
}
