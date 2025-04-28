jest.mock('fluent-ffmpeg');
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    unlink: jest.fn(),
  },
  existsSync: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import { VideoProcessingService } from './video-processing.service';
import { MEDIA_DIR } from '../common/constants/media.constants';

const mockedFfmpeg = ffmpeg as jest.MockedFunction<typeof ffmpeg>;

describe('VideoProcessingService', () => {
  let service: VideoProcessingService;
  let logger: Logger;

  const mockVideoPath = '/test/path/test-video.mp4';
  const mockLeftRemovedPath = '/test/path/test-video_left_removed.mp4';
  const mockAudioPath = '/test/path/test-video_left_removed_audio.mp3';
  const mockNoAudioPath = '/test/path/test-video_left_removed_no_audio.mp4';

  // ffmpeg 체인 메소드를 위한 모킹 헬퍼 함수
  const mockFfmpegChain = () => {
    const mockChain = {
      videoFilters: jest.fn().mockReturnThis(),
      outputOptions: jest.fn().mockReturnThis(),
      noAudio: jest.fn().mockReturnThis(),
      output: jest.fn().mockReturnThis(),
      on: jest.fn().mockImplementation(function (this: any, event: string, callback: Function) {
        if (event === 'end') {
          setTimeout(() => callback(), 10);
        }
        return this;
      }),
      run: jest.fn(),
    };

    mockedFfmpeg.mockReturnValue(mockChain as any);
    return mockChain;
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoProcessingService,
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VideoProcessingService>(VideoProcessingService);
    logger = module.get<Logger>(Logger);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processVideo', () => {
    it('비디오를 성공적으로 처리해야 합니다', async () => {
      // removeLeftSide와 separateAudioAndVideo 메소드 스파이
      jest.spyOn(service as any, 'removeLeftSide').mockResolvedValue(mockLeftRemovedPath);
      jest.spyOn(service as any, 'separateAudioAndVideo').mockResolvedValue({
        audioPath: mockAudioPath,
        noAudioVideoPath: mockNoAudioPath,
      });
      // flattenMetadata mock
      const mockVideoMeta = {
        type: 'VIDEO',
        filename: 'test-video_left_removed_no_audio.mp4',
        path: mockNoAudioPath,
        size: 123456,
        format: 'mp4',
      };
      const mockAudioMeta = {
        type: 'AUDIO',
        filename: 'test-video_left_removed_audio.mp3',
        path: mockAudioPath,
        size: 654321,
        format: 'mp3',
      };
      const flattenSpy = jest
        .spyOn(service as any, 'flattenMetadata')
        .mockImplementationOnce(() => Promise.resolve(mockVideoMeta))
        .mockImplementationOnce(() => Promise.resolve(mockAudioMeta));

      const result = await service.processVideo(mockVideoPath);

      expect(service['removeLeftSide']).toHaveBeenCalledWith(mockVideoPath);
      expect(service['separateAudioAndVideo']).toHaveBeenCalledWith(mockLeftRemovedPath);
      expect(flattenSpy).toHaveBeenCalledTimes(2);
      expect(flattenSpy).toHaveBeenNthCalledWith(1, mockNoAudioPath, 'VIDEO');
      expect(flattenSpy).toHaveBeenNthCalledWith(2, mockAudioPath, 'AUDIO');
      expect(result).toEqual([mockVideoMeta, mockAudioMeta]);
    });

    it('removeLeftSide에서 에러가 발생하면 에러를 Throw 해야합니다', async () => {
      // removeLeftSide 실패 시뮬레이션
      const testError = new Error('왼쪽 프레임 제거 오류 테스트');
      jest.spyOn(service as any, 'removeLeftSide').mockRejectedValue(testError);

      await expect(service.processVideo(mockVideoPath)).rejects.toThrow(testError);
    });

    it('separateAudioAndVideo에서 에러가 발생하면 에러를 Throw 해야합니다', async () => {
      // removeLeftSide 성공, separateAudioAndVideo 실패 시뮬레이션
      jest.spyOn(service as any, 'removeLeftSide').mockResolvedValue(mockLeftRemovedPath);
      const testError = new Error('오디오 추출 실패 테스트');
      jest.spyOn(service as any, 'separateAudioAndVideo').mockRejectedValue(testError);

      await expect(service.processVideo(mockVideoPath)).rejects.toThrow(testError);
    });
  });

  describe('removeLeftSide', () => {
    it('비디오의 왼쪽 부분을 제거해야 합니다', async () => {
      const mockChain = mockFfmpegChain();

      const result = await service['removeLeftSide'](mockVideoPath);

      expect(mockedFfmpeg).toHaveBeenCalledWith(mockVideoPath);
      expect(mockChain.videoFilters).toHaveBeenCalledWith([
        {
          filter: 'crop',
          options: {
            w: 'iw/2',
            h: 'ih',
            x: 'iw/2',
            y: '0',
          },
        },
      ]);
      expect(mockChain.output).toHaveBeenCalled();
      expect(mockChain.on).toHaveBeenCalledWith('end', expect.any(Function));
      expect(mockChain.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockChain.run).toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Removing left side of video'));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Left side removed video saved'));
    });

    it('에러 발생시 reject 해야 합니다', async () => {
      const mockChain = {
        videoFilters: jest.fn().mockReturnThis(),
        output: jest.fn().mockReturnThis(),
        on: jest.fn().mockImplementation(function (this: any, event: string, callback: Function) {
          if (event === 'error') {
            setTimeout(() => callback(new Error('테스트 에러')), 10);
          }
          return this;
        }),
        run: jest.fn(),
      };

      mockedFfmpeg.mockReturnValue(mockChain as any);

      await expect(service['removeLeftSide'](mockVideoPath)).rejects.toThrow('왼쪽 프레임 제거 오류: 테스트 에러');
    });
  });

  describe('separateAudioAndVideo', () => {
    it('오디오 추출과 무음 비디오 생성을 병렬로 처리해야 합니다', async () => {
      jest.spyOn(service as any, 'extractAudio').mockResolvedValue(mockAudioPath);
      jest.spyOn(service as any, 'removeAudioFromVideo').mockResolvedValue(mockNoAudioPath);

      const result = await service['separateAudioAndVideo'](mockLeftRemovedPath);

      expect(service['extractAudio']).toHaveBeenCalled();
      expect(service['removeAudioFromVideo']).toHaveBeenCalled();
      expect(result).toEqual({
        audioPath: mockAudioPath,
        noAudioVideoPath: mockNoAudioPath,
      });
    });

    it('extractAudio에서 에러가 발생하면 에러를 Throw 해야합니다', async () => {
      const testError = new Error('오디오 추출 에러 테스트');
      jest.spyOn(service as any, 'extractAudio').mockRejectedValue(testError);
      jest.spyOn(service as any, 'removeAudioFromVideo').mockResolvedValue(mockNoAudioPath);

      await expect(service['separateAudioAndVideo'](mockLeftRemovedPath)).rejects.toThrow(testError);
    });

    it('removeAudioFromVideo에서 에러가 발생하면 에러를 Throw 해야합니다', async () => {
      jest.spyOn(service as any, 'extractAudio').mockResolvedValue(mockAudioPath);
      const testError = new Error('무음 비디오 생성 에러 테스트');
      jest.spyOn(service as any, 'removeAudioFromVideo').mockRejectedValue(testError);

      await expect(service['separateAudioAndVideo'](mockLeftRemovedPath)).rejects.toThrow(testError);
    });
  });

  describe('extractAudio', () => {
    it('비디오에서 오디오만 추출해야 합니다', async () => {
      const mockChain = mockFfmpegChain();

      await service['extractAudio'](mockVideoPath, mockAudioPath);

      expect(mockedFfmpeg).toHaveBeenCalledWith(mockVideoPath);
      expect(mockChain.outputOptions).toHaveBeenCalledWith('-vn');
      expect(mockChain.output).toHaveBeenCalledWith(mockAudioPath);
      expect(mockChain.run).toHaveBeenCalled();
    });

    it('에러 발생시 reject 해야 합니다', async () => {
      const mockChain = {
        outputOptions: jest.fn().mockReturnThis(),
        output: jest.fn().mockReturnThis(),
        on: jest.fn().mockImplementation(function (this: any, event: string, callback: Function) {
          if (event === 'error') {
            setTimeout(() => callback(new Error('오디오 추출 에러')), 10);
          }
          return this;
        }),
        run: jest.fn(),
      };

      mockedFfmpeg.mockReturnValue(mockChain as any);

      await expect(service['extractAudio'](mockVideoPath, mockAudioPath)).rejects.toThrow(
        '오디오 추출 오류: 오디오 추출 에러',
      );
    });
  });

  describe('removeAudioFromVideo', () => {
    it('오디오가 없는 비디오를 생성해야 합니다', async () => {
      const mockChain = mockFfmpegChain();

      await service['removeAudioFromVideo'](mockVideoPath, mockNoAudioPath);

      expect(mockedFfmpeg).toHaveBeenCalledWith(mockVideoPath);
      expect(mockChain.noAudio).toHaveBeenCalled();
      expect(mockChain.output).toHaveBeenCalledWith(mockNoAudioPath);
      expect(mockChain.run).toHaveBeenCalled();
    });

    it('에러 발생시 reject 해야 합니다', async () => {
      const mockChain = {
        noAudio: jest.fn().mockReturnThis(),
        output: jest.fn().mockReturnThis(),
        on: jest.fn().mockImplementation(function (this: any, event: string, callback: Function) {
          if (event === 'error') {
            setTimeout(() => callback(new Error('무음 비디오 생성 에러')), 10);
          }
          return this;
        }),
        run: jest.fn(),
      };

      mockedFfmpeg.mockReturnValue(mockChain as any);

      await expect(service['removeAudioFromVideo'](mockVideoPath, mockNoAudioPath)).rejects.toThrow(
        '무음 비디오 생성 오류: 무음 비디오 생성 에러',
      );
    });
  });

  describe('deleteMedia', () => {
    const mockFilename = 'test-video.mp4';
    const mockFiles = [
      'test-video.mp4',
      'test-video_left_removed.mp4',
      'test-video_left_removed_audio.mp3',
      'test-video_left_removed_no_audio.mp4',
    ];

    beforeEach(() => {
      jest.spyOn(fs.promises, 'readdir').mockResolvedValue(mockFiles as unknown as fs.Dirent[]);
      jest.spyOn(fs.promises, 'unlink').mockResolvedValue(undefined);
    });

    it('파일명으로 시작하는 모든 파일을 삭제해야 합니다', async () => {
      await service.deleteMedia(mockFilename);

      mockFiles.forEach((file) => {
        const fullPath = path.join(MEDIA_DIR, file);
        expect(fs.promises.unlink).toHaveBeenCalledWith(fullPath);
      });
      expect(fs.promises.unlink).toHaveBeenCalledTimes(mockFiles.length);
    });

    it('파일이 없는 경우 아무 동작도 하지 않습니다', async () => {
      jest.spyOn(fs.promises, 'readdir').mockResolvedValue([]);

      await service.deleteMedia(mockFilename);

      expect(fs.promises.unlink).not.toHaveBeenCalled();
    });
  });
});
