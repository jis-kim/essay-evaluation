import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface DatabaseConfig {
  user: string;
  password: string;
  dbName: string;
  port: number;
  url: string;
}

export interface AzureOpenAIConfig {
  endpointUrl: string;
  apiKey: string;
  apiVersion: string;
  deploymentName: string;
}

export interface AzureBlobConfig {
  accountName: string;
  accountKey: string;
  connectionString: string;
  container: string;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
}

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get nodeEnv(): string {
    return this.configService.get<string>('app.nodeEnv') ?? 'development';
  }

  get port(): number {
    return this.configService.get<number>('app.port') ?? 3000;
  }

  // 데이터베이스 설정
  get databaseConfig(): DatabaseConfig {
    return {
      user: this.configService.getOrThrow<string>('database.user'),
      password: this.configService.getOrThrow<string>('database.password'),
      dbName: this.configService.getOrThrow<string>('database.dbName'),
      port: this.configService.get<number>('database.port') ?? 5432,
      url: this.configService.getOrThrow<string>('database.url'),
    };
  }

  // Azure OpenAI 설정
  get azureOpenAIConfig(): AzureOpenAIConfig {
    return {
      endpointUrl: this.configService.getOrThrow<string>('azureOpenAI.endpointUrl'),
      apiKey: this.configService.getOrThrow<string>('azureOpenAI.apiKey'),
      apiVersion: this.configService.getOrThrow<string>('azureOpenAI.apiVersion'),
      deploymentName: this.configService.getOrThrow<string>('azureOpenAI.deploymentName'),
    };
  }

  // Azure Blob Storage 설정
  get azureBlobConfig(): AzureBlobConfig {
    return {
      accountName: this.configService.getOrThrow<string>('azureBlob.accountName'),
      accountKey: this.configService.getOrThrow<string>('azureBlob.accountKey'),
      connectionString: this.configService.getOrThrow<string>('azureBlob.connectionString'),
      container: this.configService.getOrThrow<string>('azureBlob.container'),
    };
  }

  // JWT 설정
  get jwtConfig(): JwtConfig {
    return {
      secret: this.configService.getOrThrow<string>('jwt.secret'),
      expiresIn: this.configService.getOrThrow<string>('jwt.expiresIn'),
    };
  }

  // 환경 체크 헬퍼 메서드
  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }
}
