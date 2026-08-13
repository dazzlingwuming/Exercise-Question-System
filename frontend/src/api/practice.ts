import { request } from "./client";
import type { PracticeQuestion } from "../types/question";

export type PracticeParams = {
  mode?: string;
  current_question_id?: string;
  type?: string;
  difficulty?: string;
  exam_point?: string;
  direction?: string;
  collection_id?: string;
  include_descendants?: boolean;
  only_wrong?: boolean;
  only_unanswered?: boolean;
  order?: string;
  page?: number;
  page_size?: number;
  start_question_id?: string;
};

export type PracticeSessionCreate = {
  mode?: string;
  type?: string;
  difficulty?: string;
  exam_point?: string;
  direction?: string;
  collection_id?: string;
  include_descendants?: boolean;
  order?: string;
  page_size?: number;
  start_question_id?: string;
  allow_answered?: boolean;
};

export type PracticeSessionResponse = {
  session_id: string;
  mode: string;
  total: number;
  page_size: number;
  current_index: number;
  current_group_start: number;
  current_group_end: number;
  items: PracticeQuestion[];
  has_next_group: boolean;
  has_previous_group: boolean;
  shortage_code?: string | null;
  requested_count?: number | null;
  available_count?: number | null;
  shortage_message?: string | null;
};

export type PracticeSessionState = {
  session_id: string;
  mode: string;
  total: number;
  page_size: number;
  current_index: number;
  current_question: PracticeQuestion | null;
  current_group_start: number;
  current_group_end: number;
  current_group: PracticeQuestion[];
  has_next: boolean;
  has_previous: boolean;
  has_next_group: boolean;
  has_previous_group: boolean;
  filters: Record<string, string | number | boolean | null>;
  order: string;
};

export type PracticeGroupResponse = {
  items: PracticeQuestion[];
  offset: number;
  limit: number;
  total: number;
  current_index: number;
  has_next_group: boolean;
  has_previous_group: boolean;
};

export type PracticeMoveResponse = {
  status: "ok" | "group_finished" | "session_finished";
  current_index?: number;
  question?: PracticeQuestion | null;
  has_next: boolean;
  has_previous: boolean;
  has_next_group: boolean;
  next_group_offset?: number | null;
  message?: string | null;
};

function toQuery(params: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return query.toString() ? `?${query.toString()}` : "";
}

export const getPracticeModes = () => request<Array<{ key: string; label: string }>>("/practice/modes");
export type PracticeQuestionPageResponse = {
  items: PracticeQuestion[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
};

export const listPracticeQuestions = (params: PracticeParams) => request<PracticeQuestionPageResponse>(`/practice/questions${toQuery(params)}`);
export const nextPracticeQuestion = (params: PracticeParams = { mode: "random" }) => request<PracticeQuestion>(`/practice/next${toQuery(params)}`);
export const createPracticeSession = (payload: PracticeSessionCreate) => request<PracticeSessionResponse>("/practice/sessions", { method: "POST", body: JSON.stringify(payload) });
export const getPracticeSession = (sessionId: string) => request<PracticeSessionState>(`/practice/sessions/${sessionId}`);
export const getPracticeSessionGroup = (sessionId: string, params: { offset?: number; limit?: number } = {}) => request<PracticeGroupResponse>(`/practice/sessions/${sessionId}/group${toQuery(params)}`);
export const movePracticeNext = (sessionId: string) => request<PracticeMoveResponse>(`/practice/sessions/${sessionId}/next`, { method: "POST" });
export const movePracticePrevious = (sessionId: string) => request<PracticeMoveResponse>(`/practice/sessions/${sessionId}/previous`, { method: "POST" });
export const movePracticeNextGroup = (sessionId: string) => request<PracticeSessionResponse>(`/practice/sessions/${sessionId}/next-group`, { method: "POST" });
export const movePracticePreviousGroup = (sessionId: string) => request<PracticeSessionResponse>(`/practice/sessions/${sessionId}/previous-group`, { method: "POST" });
