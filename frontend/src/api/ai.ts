import { API_BASE, request } from "./client";
import type { Question, QuestionCreatePayload } from "../types/question";

export type AiConfig = {
  provider?: string;
  base_url?: string;
  api_key?: string;
  model?: string;
  tutor_model?: string;
  grading_model?: string;
  generation_model?: string;
  anysearch_api_key?: string;
  anysearch_endpoint?: string;
  stream?: boolean;
};

export type AiMessage = {
  role: string;
  stage: string;
  content: string;
  created_at?: string | null;
};

export type AiThread = {
  thread_id: string;
  question_id: string;
  attempt_id?: string | null;
  submitted: boolean;
  current_stage: string;
  has_hint: boolean;
  has_explanation: boolean;
  has_engineering_example: boolean;
  has_interview_followup: boolean;
  allowed_actions: Record<"hint" | "explanation" | "engineering_example" | "interview_followup", boolean>;
  messages: AiMessage[];
  has_previous_ai_history?: boolean;
  previous_summary?: string | null;
};

export type AiActionResponse = {
  ok: boolean;
  error_code?: string | null;
  message?: string | null;
  thread?: AiThread | null;
};

export type AiDimensionScore = {
  name: string;
  score: number;
  max_score: number;
  comment: string;
};

export type AiGradingCard = {
  score: number;
  max_score: number;
  level: string;
  summary: string;
  dimension_scores: AiDimensionScore[];
  matched_points: string[];
  missing_points: string[];
  wrong_or_unclear_points: string[];
  improvement_suggestion: string;
  better_answer: string;
};

export type AiGradingResult = {
  grading_id?: number | null;
  question_id?: string | null;
  attempt_id?: string | null;
  provider?: string | null;
  model?: string | null;
  rubric_version?: string | null;
  score?: number | null;
  max_score?: number | null;
  level?: string | null;
  summary?: string | null;
  result?: AiGradingCard | null;
  created_at?: string | null;
  messages?: AiMessage[];
};

export type AiStructureValidation = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export type AiQuestionQualityValidation = {
  is_consistent: boolean;
  quality_score: number;
  problems: string[];
  suggestions: string[];
};

export type SimilarQuestion = {
  question_id: string;
  stem: string;
  similarity_score: number;
};

export type AiGeneratedQuestionCandidate = {
  candidate_id: string;
  question: QuestionCreatePayload;
  structure_validation: AiStructureValidation;
  ai_validation: AiQuestionQualityValidation;
  similar_questions: SimilarQuestion[];
  status: "pending" | "accepted" | "rejected" | string;
  accepted_question_id?: string | null;
};

export type AiQuestionGeneration = {
  generation_id: string;
  source_question_id: string;
  candidates: AiGeneratedQuestionCandidate[];
};

export type AiQuestionGenerationRequest = AiConfig & {
  question_id: string;
  attempt_id?: string | null;
  clicked_ai_message?: string | null;
  target_type: string;
  count: number;
  difficulty_strategy: "keep" | "lower" | "higher";
  generation_direction?: string | null;
  use_web_search?: boolean;
};

export type AiQuestionCandidateAcceptResponse = {
  candidate_id: string;
  status: string;
  question?: Question | null;
  question_id?: string | null;
};

export type AiCollectionPlacementQuestion = {
  reference_id: string;
  type?: string | null;
  stem: string;
  material?: string | null;
  tags?: string[];
  directions?: string[];
  exam_points?: string[];
  current_collection_id?: string | null;
};

export type AiCollectionPlacement = {
  reference_id: string;
  recommended_collection_id: string;
  confidence: number;
  reason: string;
  alternatives: Array<{ collection_id: string; confidence: number }>;
};

export type AiCollectionPlacementRequest = AiConfig & {
  questions: AiCollectionPlacementQuestion[];
};

export type AiParseIssue = {
  severity: "error" | "warning" | "info" | string;
  code: string;
  field?: string | null;
  message: string;
  suggestion?: string | null;
};

export type AiQuestionParseResponse = {
  candidate: QuestionCreatePayload;
  detected_type?: string | null;
  issues: AiParseIssue[];
  parser_version: string;
};

export type AiQuestionParseRequest = AiConfig & {
  source_text: string;
  expected_type?: string;
};

export const getAiThread = (questionId: string, attemptId?: string) => {
  const params = new URLSearchParams({ question_id: questionId });
  if (attemptId) params.set("attempt_id", attemptId);
  return request<AiThread>(`/ai/thread?${params.toString()}`);
};

export const runAiAction = (questionId: string, action: string, config: AiConfig, attemptId?: string) =>
  request<AiActionResponse>("/ai/thread/action", {
    method: "POST",
    body: JSON.stringify({ question_id: questionId, attempt_id: attemptId, action, ...config }),
  });

export const sendAiMessage = (questionId: string, content: string, config: AiConfig, attemptId?: string) =>
  request<AiActionResponse>("/ai/thread/message", {
    method: "POST",
    body: JSON.stringify({ question_id: questionId, attempt_id: attemptId, content, ...config }),
  });

export const testAiConnection = (config: AiConfig) =>
  request<{ ok: boolean; message: string }>("/ai/test-connection", { method: "POST", body: JSON.stringify(config) });

export const gradeSubjectiveAnswer = (questionId: string, attemptId: string, config: AiConfig) =>
  request<AiGradingResult>("/ai/grading/grade", {
    method: "POST",
    body: JSON.stringify({ question_id: questionId, attempt_id: attemptId, ...config }),
  });

export const getLatestAiGrading = (attemptId: string) =>
  request<AiGradingResult>(`/ai/grading/latest?${new URLSearchParams({ attempt_id: attemptId }).toString()}`);

export const sendAiGradingMessage = (gradingId: number, content: string, config: AiConfig) =>
  request<AiGradingResult>("/ai/grading/message", {
    method: "POST",
    body: JSON.stringify({ grading_id: gradingId, content, ...config }),
  });

type AiStreamEvent =
  | { type: "delta"; content: string }
  | { type: "done"; thread: AiThread }
  | { type: "done"; grading: AiGradingResult }
  | { type: "error"; error_code?: string; message: string };

async function streamAi(path: string, payload: unknown, onEvent: (event: AiStreamEvent) => void) {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("无法连接 AI 服务，请确认后端正在运行后重试。");
  }
  if (!response.ok || !response.body) {
    throw new Error(await response.text() || `AI 流式请求失败：${response.status}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let receivedTerminalEvent = false;

  function dispatchEvent(eventText: string) {
    const line = eventText.split(/\r?\n/).find((item) => item.startsWith("data:"));
    if (!line) return;
    const event = JSON.parse(line.slice(5).trim()) as AiStreamEvent;
    if (event.type === "done" || event.type === "error") receivedTerminalEvent = true;
    onEvent(event);
  }

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (value) buffer += decoder.decode(value, { stream: !done });
      if (done) buffer += decoder.decode();
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() ?? "";
      for (const eventText of events) dispatchEvent(eventText);
      if (done) break;
    }
    if (buffer.trim()) dispatchEvent(buffer);
  } catch {
    throw new Error("AI 流式响应中断，请重试。");
  }

  if (!receivedTerminalEvent) throw new Error("AI 流式响应意外结束，请重试。");
}

export const runAiActionStream = (questionId: string, action: string, config: AiConfig, attemptId: string | undefined, onEvent: (event: AiStreamEvent) => void) =>
  streamAi("/ai/thread/action-stream", { question_id: questionId, attempt_id: attemptId, action, ...config }, onEvent);

export const sendAiMessageStream = (questionId: string, content: string, config: AiConfig, attemptId: string | undefined, onEvent: (event: AiStreamEvent) => void) =>
  streamAi("/ai/thread/message-stream", { question_id: questionId, attempt_id: attemptId, content, ...config }, onEvent);

export const sendAiGradingMessageStream = (gradingId: number, content: string, config: AiConfig, onEvent: (event: AiStreamEvent) => void) =>
  streamAi("/ai/grading/message-stream", { grading_id: gradingId, content, ...config }, onEvent);

export const summarizePreviousAiStream = (questionId: string, attemptId: string, config: AiConfig, onEvent: (event: AiStreamEvent) => void) =>
  streamAi("/ai/thread/summary-stream", { question_id: questionId, attempt_id: attemptId, ...config }, onEvent);

export const finalizeAiSummaryStream = summarizePreviousAiStream;

export const generateAiQuestions = (payload: AiQuestionGenerationRequest) =>
  request<AiQuestionGeneration>("/ai/question-generation/generate", { method: "POST", body: JSON.stringify(payload) });

export const parseAiQuestionDraft = (payload: AiQuestionParseRequest) =>
  request<AiQuestionParseResponse>("/ai/question-parse", { method: "POST", body: JSON.stringify(payload) });

export const getAiQuestionGeneration = (generationId: string) =>
  request<AiQuestionGeneration>(`/ai/question-generation/${generationId}`);

export const acceptAiQuestionCandidate = (candidateId: string, collectionId: string) =>
  request<AiQuestionCandidateAcceptResponse>(`/ai/question-generation/candidates/${candidateId}/accept`, {
    method: "POST",
    body: JSON.stringify({ collection_id: collectionId }),
  });

export const recommendCollectionPlacements = (payload: AiCollectionPlacementRequest) =>
  request<{ items: AiCollectionPlacement[] }>("/ai/collection-placement/recommend", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const rejectAiQuestionCandidate = (candidateId: string, reason?: string) =>
  request<{ candidate_id: string; status: string }>(`/ai/question-generation/candidates/${candidateId}/reject`, { method: "POST", body: JSON.stringify({ reason }) });

export const updateAiQuestionCandidate = (candidateId: string, question: QuestionCreatePayload) =>
  request<AiGeneratedQuestionCandidate>(`/ai/question-generation/candidates/${candidateId}`, { method: "PATCH", body: JSON.stringify({ question }) });
