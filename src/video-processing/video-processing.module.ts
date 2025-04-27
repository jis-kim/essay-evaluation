import { Logger, Module } from '@nestjs/common';

import { VideoProcessingService } from './video-processing.service';

@Module({
  providers: [VideoProcessingService, Logger],
  exports: [VideoProcessingService],
})
export class VideoProcessingModule {}
