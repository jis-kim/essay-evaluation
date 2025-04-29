import { join } from 'path';

import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

import { AppConfigService } from '../config/config.service';

const { combine, timestamp, printf, colorize, align } = winston.format;

// winston의 TransformableInfo와 호환되는 인터페이스
interface WinstonLogInfo extends winston.Logform.TransformableInfo {
  timestamp?: string;
  context?: string;
  trace?: string;
  method?: string;
  path?: string;
  status?: number;
  duration?: string;
  contents?: Record<string, unknown>;
}

export interface HttpMetaData {
  method: string;
  path: string;
  status: number;
  duration?: string;
  contents?: Record<string, unknown>;
}

@Injectable()
export class CustomLogger implements LoggerService {
  private logger!: winston.Logger;
  private logDir: string = join(__dirname, '..', '..', 'logs');
  constructor(private readonly appConfigService: AppConfigService) {
    this.initializeLogger();
    console.log(this.logDir);
  }

  private formatMetadata(metadata: Record<string, unknown>): string {
    return Object.entries(metadata)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          return `${key}=${JSON.stringify(JSON.stringify(value))}`;
        }
        return `${key}="${String(value)}"`;
      })
      .join(' ');
  }

  private initializeLogger(): void {
    const developmentFormat = combine(
      colorize({ all: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      align(),
      printf((info: WinstonLogInfo) => {
        const contextStr = info.context ? `[${String(info.context)}] ` : '';
        let metaStr = '';

        if (info.method && info.path && info.status) {
          metaStr = `[${String(info.method)}] ${String(info.path)} ${String(info.status)}${
            info.duration ? ` +${String(info.duration)}` : ''
          }`;
        }

        if (info.contents) {
          const contents = info.contents;
          for (const [key, value] of Object.entries(contents)) {
            metaStr += `\n${key}: ${JSON.stringify(value)}`;
          }
        }

        const traceStr = info.trace ? `\nStack Trace: ${String(info.trace)}` : '';
        const timestamp = info.timestamp || new Date().toISOString();
        return `${timestamp} ${info.level}: ${contextStr}${metaStr}${traceStr}${String(info.message)}`;
      }),
    );

    const productionFormat = combine(
      timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
      }),
      printf((info: WinstonLogInfo) => {
        // 기본 로그 정보
        const logData = {
          timestamp: info.timestamp || new Date().toISOString(),
          level: info.level,
          message: info.message,
          context: info.context || '',
        };

        // HTTP 메타데이터가 있는 경우 추가
        if (info.method && info.path && info.status) {
          Object.assign(logData, {
            method: info.method,
            path: info.path,
            status: info.status,
            duration: info.duration,
          });
        }

        // 추가 컨텐츠가 있는 경우 추가
        if (info.contents) {
          Object.assign(logData, { contents: info.contents });
        }

        // 스택 트레이스가 있는 경우 추가
        if (info.trace) {
          Object.assign(logData, { trace: info.trace });
        }

        return JSON.stringify(logData);
      }),
    );

    let level: string = 'info';
    const environment = this.appConfigService.nodeEnv;
    if (environment === 'local') {
      level = 'debug';
    }

    // DailyRotateFile transport 추가
    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: this.appConfigService.isProduction ? productionFormat : developmentFormat,
      }),
      this.createDailyRotateTransport('info'),
    ];

    if (environment === 'local') {
      transports.push(this.createDailyRotateTransport('debug'));
    }

    this.logger = winston.createLogger({
      level,
      transports,
    });
  }

  private createDailyRotateTransport(level: string): DailyRotateFile {
    return new DailyRotateFile({
      level,
      dirname: this.logDir,
      filename: `%DATE%-${level}.log`,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: combine(
        timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        printf((info: WinstonLogInfo) => {
          const metadataObj = { ...info };
          return `[${info.timestamp || ''}] ${info.level.toUpperCase()}: ${String(info.context || '')} ${this.formatMetadata(
            metadataObj,
          )} ${String(info.message)}`.trim();
        }),
      ),
    });
  }

  log(message: string, context?: string, meta?: HttpMetaData): void {
    this.logger.info(message, { context, ...meta });
  }

  error(message: string, trace?: string, context?: string, meta?: HttpMetaData): void {
    this.logger.error(message, { context, trace, ...meta });
  }

  warn(message: string, context?: string, meta?: HttpMetaData): void {
    this.logger.warn(message, { context, ...meta });
  }

  debug(message: string, context?: string, meta?: HttpMetaData): void {
    this.logger.debug(message, { context, ...meta });
  }

  verbose(message: string, context?: string, meta?: HttpMetaData): void {
    this.logger.verbose(message, { context, ...meta });
  }

  silly(message: string, context?: string, meta?: HttpMetaData): void {
    this.logger.silly(message, { context, ...meta });
  }
}
