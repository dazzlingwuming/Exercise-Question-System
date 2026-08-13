import { request } from "./client";
import type { Question } from "../types/question";

export type ImportPreview = {
  source_name: string;
  format_version: string;
  is_legacy: boolean;
  success_count: number;
  blocking_error_count: number;
  type_distribution: Record<string, number>;
  difficulty_distribution: Record<string, number>;
  questions: Question[];
  warnings: Array<{ question_id?: string | null; part_id?: string | null; field?: string | null; message: string }>;
  errors: Array<{ index: number; part_id?: string | null; question_id?: string | null; field?: string | null; message: string; raw_text_preview: string }>;
  database_conflicts: Array<{ question_id: string; part_id?: string | null; status: "same" | "different" | string; message: string }>;
};

export type ImportCommit = {
  imported_count: number;
  skipped_count: number;
  warning_count: number;
  error_count: number;
  batch_id: string;
  extra?: Record<string, unknown>;
};

export type ImportSource = { text?: string; sourceName?: string };

function importBody(source: ImportSource = {}) {
  return JSON.stringify({ text: source.text, source_name: source.sourceName });
}

export const previewImport = (source: ImportSource = {}) => request<ImportPreview>("/imports/preview", { method: "POST", body: importBody(source) });
export const commitImport = (source: ImportSource = {}) => request<ImportCommit>("/imports/commit", { method: "POST", body: importBody(source) });
export const resetCommitImport = (source: ImportSource = {}) => request<ImportCommit>("/imports/reset-commit", { method: "POST", body: importBody(source) });
