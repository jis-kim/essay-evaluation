import { MediaType } from '@prisma/client';

export type SubmissionMediaInfo = {
  type: MediaType;
  path: string;
  filename: string;
  size: number;
  format: string;
};

export type SubmissionMediaCreateInput = {
  type: MediaType;
  filename: string;
  url: string;
  size: number;
  format: string;
};
