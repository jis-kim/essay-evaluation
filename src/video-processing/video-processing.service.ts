import * as path from 'path';

import { Injectable, Logger } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';

@Injectable()
export class VideoProcessingService {
  constructor(private readonly logger: Logger) {}

  async processVideo(videoPath: string): Promise<{
    audioPath: string;
    noAudioVideoPath: string;
  }> {
    // 비디오 처리 로직 구현
    // 예: 비디오 프레임 추출, 오디오 추출, 텍스트 추출 등
    const leftRemovedVideoPath = await this.removeLeftSide(videoPath);

    // 오디오 추출 및 오디오 제거된 비디오 생성
    return this.separateAudioAndVideo(leftRemovedVideoPath);
  }

  /**
   * 왼쪽 프레임 제거
   * @param videoPath 원본 비디오 경로
   * @returns 왼쪽 프레임 제거된 비디오 경로
   */
  private removeLeftSide(videoPath: string): Promise<string> {
    // 왼쪽 사이드 제거 로직 구현
    const { dir, name, ext } = path.parse(videoPath);
    const outputPath = path.join(dir, `${name}_left_removed${ext}`);

    this.logger.log(`Removing left side of video: ${videoPath}`);

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .videoFilters([
          {
            filter: 'crop',
            options: {
              w: 'iw/2', // 영상 너비의 절반
              h: 'ih', // 원본 높이 유지
              x: 'iw/2', // 오른쪽 절반만 선택
              y: '0', // 세로 위치는 변경 없음
            },
          },
        ])
        .output(outputPath)
        .on('end', () => {
          this.logger.log(`Left side removed video saved: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err: Error) => reject(new Error(`왼쪽 프레임 제거 오류: ${err.message}`)))
        .run();
    });
  }

  /**
   * 오디오 추출 및 오디오 제거된 비디오 생성
   * @param videoPath 원본 비디오 경로
   * @returns 오디오 추출 및 오디오 제거된 비디오 경로 (audioPath, noAudioVideoPath)
   */
  private async separateAudioAndVideo(videoPath: string): Promise<{ audioPath: string; noAudioVideoPath: string }> {
    const { dir, name } = path.parse(videoPath);
    const audioPath = path.join(dir, `${name}_audio.mp3`);
    const noAudioVideoPath = path.join(dir, `${name}_no_audio.mp4`);

    this.logger.log(`Extracting audio from video: ${videoPath}`);

    // Promise.all을 사용하여 두 작업을 병렬로 실행
    const [extractedAudioPath, noAudioVideoResult] = await Promise.all([
      this.extractAudio(videoPath, audioPath),
      this.removeAudioFromVideo(videoPath, noAudioVideoPath),
    ]);

    return { audioPath: extractedAudioPath, noAudioVideoPath: noAudioVideoResult };
  }

  /**
   * 오디오 추출
   * @param videoPath 원본 비디오 경로
   * @param outputPath 저장할 오디오 경로
   * @returns 오디오 추출된 경로
   */
  private extractAudio(videoPath: string, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions('-vn') // 비디오 스트림 제거, 오디오만 추출
        .output(outputPath)
        .on('end', () => {
          this.logger.log(`Audio extracted: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err: Error) => reject(new Error(`오디오 추출 오류: ${err.message}`)))
        .run();
    });
  }

  /**
   * 무음 비디오 생성
   * @param videoPath 원본 비디오 경로
   * @param outputPath 출력 경로
   * @returns 무음 비디오 생성된 경로
   */
  private removeAudioFromVideo(videoPath: string, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .noAudio()
        .output(outputPath)
        .on('end', () => {
          this.logger.log(`Silent video created: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err: Error) => reject(new Error(`무음 비디오 생성 오류: ${err.message}`)))
        .run();
    });
  }
}
