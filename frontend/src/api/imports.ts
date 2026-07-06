import { request } from "./client";
import type { Question } from "../types/question";

export type ImportPreview = {
  source_name: string;
  success_count: number;
  type_distribution: Record<string, number>;
  difficulty_distribution: Record<string, number>;
  questions: Question[];
  warnings: Array<{ question_id?: string | null; part_id?: string | null; message: string }>;
  errors: Array<{ index: number; part_id?: string | null; message: string; raw_text_preview: string }>;
};

export type ImportCommit = {
  imported_count: number;
  skipped_count: number;
  warning_count: number;
  error_count: number;
  batch_id: string;
  extra?: Record<string, unknown>;
};

export const previewImport = () => request<ImportPreview>("/imports/preview", { method: "POST", body: JSON.stringify({}) });
export const commitImport = () => request<ImportCommit>("/imports/commit", { method: "POST", body: JSON.stringify({}) });
export const resetCommitImport = () => request<ImportCommit>("/imports/reset-commit", { method: "POST", body: JSON.stringify({}) });
