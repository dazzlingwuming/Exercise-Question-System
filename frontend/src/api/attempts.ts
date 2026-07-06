import { request } from "./client";
import type { Attempt, QuestionState, WrongAttemptPage } from "../types/attempt";

export const listAttempts = () => request<Attempt[]>("/attempts");
export const listLatestAttempts = (questionIds: string[]) => {
  const params = new URLSearchParams();
  if (questionIds.length > 0) params.set("question_ids", questionIds.join(","));
  return request<Attempt[]>(`/attempts/latest${params.toString() ? `?${params.toString()}` : ""}`);
};
export const listQuestionStates = (questionIds: string[]) => {
  const params = new URLSearchParams();
  if (questionIds.length > 0) params.set("question_ids", questionIds.join(","));
  return request<QuestionState[]>(`/attempts/question-states${params.toString() ? `?${params.toString()}` : ""}`);
};
export type WrongFilters = {
  page?: number;
  page_size?: number;
  type?: string;
  difficulty?: string;
  exam_point?: string;
  direction?: string;
  keyword?: string;
  sort?: string;
};

function toQuery(filters: WrongFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  return params.toString() ? `?${params.toString()}` : "";
}

export const listWrongAttempts = (filters: WrongFilters = {}) => request<WrongAttemptPage>(`/attempts/wrong${toQuery(filters)}`);
export const selfReview = (attemptId: string, status: "correct" | "partial" | "wrong") =>
  request<Attempt>(`/attempts/${attemptId}/self-review`, { method: "POST", body: JSON.stringify({ status }) });
