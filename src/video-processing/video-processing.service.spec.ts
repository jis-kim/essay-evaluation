import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import { VideoProcessingService } from './video-processing.service';

// ffmpeg 모듈을 모킹
jest.mock('fluent-ffmpeg');
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

      const result = await service.processVideo(mockVideoPath);

      expect(service['removeLeftSide']).toHaveBeenCalledWith(mockVideoPath);
      expect(service['separateAudioAndVideo']).toHaveBeenCalledWith(mockLeftRemovedPath);
      expect(result).toEqual({
        audioPath: mockAudioPath,
        noAudioVideoPath: mockNoAudioPath,
      });
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
      expect(result).toMatch(/_left_removed/);
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
});
