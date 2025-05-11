import * as fs from 'fs';
import { parse, join, basename } from 'path';

import { Injectable, Logger } from '@nestjs/common';
import { MediaType } from '@prisma/client';
import * as ffmpeg from 'fluent-ffmpeg';

import { MEDIA_DIR, MEDIA_SUFFIXES } from '../common/constants/media.constants';
import { SubmissionMediaInfo } from '../common/types/media.types';

@Injectable()
export class VideoProcessingService {
  constructor(private readonly logger: Logger) {}

  async processVideo(videoPath: string): Promise<SubmissionMediaInfo[]> {
    // 비디오 처리 로직 구현
    const leftRemovedVideoPath = await this.removeLeftSide(videoPath);
    const { audioPath, noAudioVideoPath } = await this.separateAudioAndVideo(leftRemovedVideoPath);

    // flatten metadata 추출
    const videoMeta = await this.flattenMetadata(noAudioVideoPath, MediaType.VIDEO);
    const audioMeta = await this.flattenMetadata(audioPath, MediaType.AUDIO);
    return [videoMeta, audioMeta];
  }

  /**
   * 임시 저장된 비디오 삭제
   * @param filename 비디오 파일명
   */
  async deleteMedia(filename: string): Promise<void> {
    const dir = join(__dirname, '..', '..', MEDIA_DIR);

    try {
      const files = await fs.promises.readdir(dir);
      const baseFilename = parse(filename).name;
      const targetFiles = files.filter((file) => file.startsWith(baseFilename));

      if (targetFiles.length === 0) {
        this.logger.warn(`삭제할 파일을 찾을 수 없습니다: ${baseFilename}`);
        return;
      }

      targetFiles.forEach((file) => {
        const fullPath = join(dir, file);
        fs.promises.unlink(fullPath).catch((err) => {
          if (err instanceof Error) {
            this.logger.error(`파일 삭제 실패 ${fullPath}: ${err.message}`);
          }
        });
      });
    } catch (err) {
      if (err instanceof Error) {
        this.logger.error(`디렉토리 읽기 실패: ${err.message}`);
      }
      throw err;
    }
  }

  /**
   * 왼쪽 프레임 제거
   * @param videoPath 원본 비디오 경로
   * @returns 왼쪽 프레임 제거된 비디오 경로
   */
  private removeLeftSide(videoPath: string): Promise<string> {
    // 왼쪽 사이드 제거 로직 구현
    const { dir, name, ext } = parse(videoPath);
    const outputPath = join(dir, `${name}${MEDIA_SUFFIXES.left_removed}${ext}`);

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
    const { dir, name } = parse(videoPath);
    const audioPath = join(dir, `${name}${MEDIA_SUFFIXES.audio}.mp3`);
    const noAudioVideoPath = join(dir, `${name}${MEDIA_SUFFIXES.no_audio}.mp4`);

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

  /**
   * 비디오 또는 오디오 파일의 메타데이터를 반환
   * @param filePath 비디오 또는 오디오 파일 경로
   * @param type 비디오 또는 오디오
   * @returns 비디오 또는 오디오 파일의 메타데이터
   */
  private flattenMetadata(filePath: string, type: MediaType): Promise<SubmissionMediaInfo> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) return reject(new Error((err as Error).message));
        const format = metadata.format;
        resolve({
          type,
          filename: basename(filePath),
          path: filePath,
          size: Number(format.size),
          format: format.format_name || '',
        });
      });
    });
  }
}
