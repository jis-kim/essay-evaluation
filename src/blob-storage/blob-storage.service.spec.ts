import { Test, TestingModule } from '@nestjs/testing';
import { BlobStorageService } from './blob-storage.service';
import { Logger } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';

const mockConfigService = {
  azureBlobConfig: {
    accountName: 'testaccount',
    accountKey: 'testkey',
    container: 'testcontainer',
  },
};

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
};

jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
  },
}));

jest.mock('@azure/storage-blob', () => ({
  BlobServiceClient: jest.fn().mockImplementation(() => ({
    getContainerClient: jest.fn().mockReturnValue({
      getBlockBlobClient: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ requestId: 'mock-request-id' }),
        url: 'https://mock.blob.core.windows.net/testcontainer/blob.mp4',
        name: 'blob.mp4',
      }),
    }),
  })),
  StorageSharedKeyCredential: jest.fn(),
  generateBlobSASQueryParameters: jest.fn().mockReturnValue({
    toString: () => 'mock-sas-token',
  }),
  BlobSASPermissions: { parse: jest.fn() },
  SASProtocol: { Https: 'https' },
}));

describe('BlobStorageService', () => {
  let service: BlobStorageService;
  let fs: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlobStorageService,
        { provide: Logger, useValue: mockLogger },
        { provide: AppConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<BlobStorageService>(BlobStorageService);
    fs = require('fs');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('서비스가 정의되어 있어야 한다', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFileAndGetSasUrl', () => {
    it('정상적으로 파일 업로드 및 SAS URL 반환', async () => {
      fs.promises.access.mockResolvedValue(undefined);
      fs.promises.stat.mockResolvedValue({ isFile: () => true, size: 100 });
      fs.promises.readFile.mockResolvedValue(Buffer.from('test'));

      const sasUrl = await service.uploadFileAndGetSasUrl('/tmp/test.mp4', 'videos/test.mp4');

      expect(sasUrl).toContain('mock-sas-token');
      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('Azure Blob Storage 연결 실패 시 에러를 throw해야 한다', () => {
      // StorageSharedKeyCredential 생성에서 에러 발생하도록 mock
      const storageBlob = require('@azure/storage-blob');
      const originalCredential = storageBlob.StorageSharedKeyCredential;
      storageBlob.StorageSharedKeyCredential = jest.fn(() => {
        throw new Error('연결 실패');
      });

      expect(() => {
        new BlobStorageService(mockConfigService as any, mockLogger as any);
      }).toThrow('연결 실패');

      // 원복
      storageBlob.StorageSharedKeyCredential = originalCredential;
    });

    it('파일이 없으면 에러 발생', async () => {
      fs.promises.access.mockRejectedValue(new Error('파일 없음'));

      await expect(service.uploadFileAndGetSasUrl('/tmp/notfound.mp4', 'videos/notfound.mp4')).rejects.toThrow(
        '파일이 존재하지 않습니다',
      );
    });

    it('파일이 비어있으면 에러 발생', async () => {
      fs.promises.access.mockResolvedValue(undefined);
      fs.promises.stat.mockResolvedValue({ isFile: () => true, size: 0 });

      await expect(service.uploadFileAndGetSasUrl('/tmp/empty.mp4', 'videos/empty.mp4')).rejects.toThrow(
        '파일이 비어있습니다',
      );
    });

    it('Blob 업로드 중 에러 발생 시', async () => {
      fs.promises.access.mockResolvedValue(undefined);
      fs.promises.stat.mockResolvedValue({ isFile: () => true, size: 100 });
      fs.promises.readFile.mockResolvedValue(Buffer.from('test'));
      // Blob 클라이언트의 upload 메서드가 에러를 throw하도록 mock
      const mockUpload = jest.fn().mockRejectedValue(new Error('업로드 실패'));
      service['containerClient'].getBlockBlobClient = jest.fn().mockReturnValue({
        upload: mockUpload,
        url: 'https://mock.blob.core.windows.net/testcontainer/blob.mp4',
        name: 'blob.mp4',
      });

      await expect(service.uploadFileAndGetSasUrl('/tmp/test.mp4', 'videos/test.mp4')).rejects.toThrow();
    });

    it('SAS URL 생성 중 에러 발생 시', async () => {
      fs.promises.access.mockResolvedValue(undefined);
      fs.promises.stat.mockResolvedValue({ isFile: () => true, size: 100 });
      fs.promises.readFile.mockResolvedValue(Buffer.from('test'));
      // 정상 업로드 후 generateSasUrl에서 에러 발생하도록 mock
      const mockUpload = jest.fn().mockResolvedValue({ requestId: 'mock-request-id' });
      service['containerClient'].getBlockBlobClient = jest.fn().mockReturnValue({
        upload: mockUpload,
        url: 'https://mock.blob.core.windows.net/testcontainer/blob.mp4',
        name: 'blob.mp4',
      });
      jest.spyOn<any, any>(service, 'generateSasUrl').mockImplementation(() => {
        throw new Error('SAS 생성 실패');
      });

      await expect(service.uploadFileAndGetSasUrl('/tmp/test.mp4', 'videos/test.mp4')).rejects.toThrow('SAS 생성 실패');
    });
  });
});
