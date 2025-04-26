import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppConfigService } from './config.service';
import { databaseConfig, azureOpenAIConfig, azureBlobConfig } from './configuration';
import { envSchema } from './env.validation';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      validate: (config: Record<string, unknown>) => {
        const result = envSchema.safeParse(config);
        if (!result.success) {
          console.error('❌ Invalid environment variables:', result.error.format());
          throw new Error('Invalid environment variables');
        }
        return result.data;
      },
      //isGlobal: true,
      cache: true,
      load: [databaseConfig, azureOpenAIConfig, azureBlobConfig],
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
