import { Module, Logger } from '@nestjs/common';

import { BlobStorageService } from './blob-storage.service';

@Module({
  providers: [BlobStorageService, Logger],
  exports: [BlobStorageService],
})
export class BlobStorageModule {}
