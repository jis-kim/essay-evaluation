import { z } from 'zod';

// 포트 번호 검증을 위한 커스텀 스키마
const portSchema = z.coerce.number().int().min(1024).max(65535);

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: portSchema.default(3000),

  // Database
  POSTGRES_USER: z.string(),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_DB: z.string(),
  POSTGRES_PORT: portSchema.default(5432),
  DATABASE_URL: z.string().url(),

  // Azure OpenAI
  AZURE_ENDPOINT_URL: z.string().url(),
  AZURE_ENDPOINT_KEY: z.string(),
  OPENAI_API_VERSION: z.string(),
  AZURE_OPENAI_DEPLOYMENT_NAME: z.string(),

  // Azure Blob Storage
  AZURE_ACCOUNT_NAME: z.string(),
  AZURE_ACCOUNT_KEY: z.string(),
  AZURE_CONNECTION_STRING: z.string(),
  AZURE_CONTAINER: z.string(),

  // JWT
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('30d'),
});

export type Env = z.infer<typeof envSchema>;
