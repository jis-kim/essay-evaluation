import { registerAs } from '@nestjs/config';

// 데이터베이스 설정
export const databaseConfig = registerAs('database', () => ({
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  dbName: process.env.POSTGRES_DB,
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  url: process.env.DATABASE_URL,
}));

// JWT 설정
export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '30d',
}));

// Azure OpenAI 설정
export const azureOpenAIConfig = registerAs('azureOpenAI', () => ({
  endpointUrl: process.env.AZURE_ENDPOINT_URL,
  apiKey: process.env.AZURE_ENDPOINT_KEY,
  apiVersion: process.env.OPENAI_API_VERSION,
  deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
}));

// Azure Blob Storage 설정
export const azureBlobConfig = registerAs('azureBlob', () => ({
  accountName: process.env.AZURE_ACCOUNT_NAME,
  accountKey: process.env.AZURE_ACCOUNT_KEY,
  connectionString: process.env.AZURE_CONNECTION_STRING,
  container: process.env.AZURE_CONTAINER,
}));

// 애플리케이션 설정
export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV,
  port: parseInt(process.env.PORT || '3000', 10),
  name: 'essay-evaluation-service',
}));
