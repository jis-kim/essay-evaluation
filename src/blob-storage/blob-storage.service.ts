import * as fs from 'fs';
import * as path from 'path';

import {
  BlobServiceClient,
  ContainerClient,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
  SASProtocol,
  BlockBlobClient,
} from '@azure/storage-blob';
import { Injectable, Logger } from '@nestjs/common';

import { AppConfigService } from '../config/config.service';

@Injectable()
export class BlobStorageService {
  private blobServiceClient!: BlobServiceClient;
  private containerClient!: ContainerClient;
  private sharedKeyCredential!: StorageSharedKeyCredential;

  constructor(
    private readonly configService: AppConfigService,
    private readonly logger: Logger,
  ) {
    try {
      const { accountName, accountKey, container } = this.configService.azureBlobConfig;

      this.sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
      this.blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        this.sharedKeyCredential,
      );
      this.containerClient = this.blobServiceClient.getContainerClient(container);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      this.logger.error(`Azure Blob Storage 연결 실패: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 로컬 파일을 Azure Blob Storage에 업로드하고 SAS URL을 생성합니다
   * @param filePath 로컬 파일 경로
   * @param blobName Blob 이름 (경로 포함 가능, 예: videos/user123/video.mp4)
   * @param contentType 컨텐츠 타입 (기본값: application/octet-stream)
   * @returns SAS URL
   */
  async uploadFileAndGetSasUrl(filePath: string, blobName: string): Promise<string> {
    try {
      let contentType = 'application/octet-stream';

      // 파일이 존재하는지 확인
      try {
        await fs.promises.access(filePath);
      } catch {
        throw new Error(`파일이 존재하지 않습니다: ${filePath}`);
      }

      // 파일 상태 확인
      const fileStats = await fs.promises.stat(filePath);
      if (!fileStats.isFile()) {
        throw new Error(`유효한 파일이 아닙니다: ${filePath}`);
      }
      const fileSize = fileStats.size;
      if (fileSize === 0) {
        throw new Error(`파일이 비어있습니다: ${filePath} (0 bytes)`);
      }

      // 파일 확장자에 따라 contentType 결정
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.mp4') {
        contentType = 'video/mp4';
      } else if (ext === '.mp3') {
        contentType = 'audio/mpeg';
      }

      const fileData = await fs.promises.readFile(filePath);

      // Blob 클라이언트 생성
      const blobClient = this.containerClient.getBlockBlobClient(blobName);

      // 파일 업로드
      const uploadResponse = await blobClient.upload(fileData, fileData.length, {
        blobHTTPHeaders: {
          blobContentType: contentType,
        },
      });
      this.logger.log(
        `Blob에 파일 업로드 완료: ${blobName} (${fileSize} bytes), requestId: ${uploadResponse.requestId}`,
      );

      // SAS URL 생성
      const sasUrl = this.generateSasUrl(blobClient);
      return sasUrl;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      this.logger.error(`Blob 업로드 실패: ${errorMessage}`);
      this.logger.error(`파일 경로: ${filePath}, Blob 이름: ${blobName}`);
      throw error;
    }
  }

  /**
   * Blob에 대한 SAS(Shared Access Signature) URL을 생성합니다
   * @param blobName Blob 이름
   * @param expiryHours URL 만료 시간 (시간, 기본값: 24시간)
   * @returns SAS URL
   */
  private generateSasUrl(blobClient: BlockBlobClient, expiryHours = 24): string {
    try {
      const { container } = this.configService.azureBlobConfig;

      // SAS 토큰 생성 옵션
      const sasOptions = {
        containerName: container,
        blobName: blobClient.name,
        permissions: BlobSASPermissions.parse('r'), // 읽기 권한만 부여
        startsOn: new Date(),
        expiresOn: new Date(new Date().valueOf() + expiryHours * 60 * 60 * 1000), // 24시간 후 만료
        protocol: SASProtocol.Https,
      };

      const sasToken = generateBlobSASQueryParameters(sasOptions, this.sharedKeyCredential).toString();

      // SAS URL 생성
      const sasUrl = `${blobClient.url}?${sasToken}`;
      return sasUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      this.logger.error(`SAS URL 생성 실패: ${errorMessage}`);
      throw error;
    }
  }
}
