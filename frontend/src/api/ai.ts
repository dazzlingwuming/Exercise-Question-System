import { API_BASE, request } from "./client";

export type AiConfig = {
  provider?: string;
  base_url?: string;
  api_key?: string;
  model?: string;
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
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok || !response.body) {
    throw new Error(await response.text() || `AI 流式请求失败：${response.status}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const eventText of events) {
      const line = eventText.split("\n").find((item) => item.startsWith("data:"));
      if (!line) continue;
      onEvent(JSON.parse(line.slice(5).trim()) as AiStreamEvent);
    }
  }
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
