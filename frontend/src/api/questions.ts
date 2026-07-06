import { request } from "./client";
import type {
  Question,
  QuestionListResponse,
  FilterOptions,
  QuestionRevision,
  QuestionRevisionDetail,
  QuestionCreatePayload,
  QuestionUpdatePayload,
  QuestionDeletePayload,
  QuestionDeleteStatus,
  RevisionRestorePayload,
} from "../types/question";
import type { SubmitAnswerResponse } from "../types/attempt";

export type QuestionFilters = {
  type?: string;
  difficulty?: string;
  tag?: string;
  keyword?: string;
  only_wrong?: boolean;
  page?: number;
  page_size?: number;
  exam_point?: string;
  direction?: string;
  include_deleted?: boolean;
  only_deleted?: boolean;
};

function toQuery(filters: QuestionFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== false) params.set(key, String(value));
  });
  return params.toString() ? `?${params.toString()}` : "";
}

export const listQuestions = (filters: QuestionFilters) => request<QuestionListResponse>(`/questions${toQuery(filters)}`);
export const listDeletedQuestions = (filters: QuestionFilters) => request<QuestionListResponse>(`/questions/deleted${toQuery(filters)}`);
export const getFilterOptions = () => request<FilterOptions>("/questions/filter-options");
export const getQuestion = (id: string) => request<Question>(`/questions/${id}`);
export const createQuestion = (payload: QuestionCreatePayload) =>
  request<Question>("/questions", { method: "POST", body: JSON.stringify(payload) });
export const submitAnswer = (id: string, answer: unknown, practiceSessionId?: string) =>
  request<SubmitAnswerResponse>(`/questions/${id}/submit`, { method: "POST", body: JSON.stringify({ answer, practice_session_id: practiceSessionId }) });
export const updateQuestion = (id: string, payload: QuestionUpdatePayload) =>
  request<Question>(`/questions/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const deleteQuestion = (id: string, payload: QuestionDeletePayload) =>
  request<QuestionDeleteStatus>(`/questions/${id}`, { method: "DELETE", body: JSON.stringify(payload) });
export const restoreDeletedQuestion = (id: string, payload: QuestionDeletePayload) =>
  request<Question>(`/questions/${id}/restore`, { method: "POST", body: JSON.stringify(payload) });
export const getQuestionRevisions = (id: string) => request<QuestionRevision[]>(`/questions/${id}/revisions`);
export const getQuestionRevisionDetail = (questionId: string, revisionId: string) =>
  request<QuestionRevisionDetail>(`/questions/${questionId}/revisions/${revisionId}`);
export const restoreQuestionRevision = (questionId: string, revisionId: string, payload: RevisionRestorePayload) =>
  request<Question>(`/questions/${questionId}/revisions/${revisionId}/restore`, { method: "POST", body: JSON.stringify(payload) });
