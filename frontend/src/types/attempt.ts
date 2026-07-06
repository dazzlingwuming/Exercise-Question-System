import type { Question } from "./question";

export type SubmitAnswerResponse = {
  attempt_id: string;
  is_correct: boolean | null;
  requires_self_review: boolean;
  normalized_user_answer: unknown;
  correct_answer_normalized: unknown;
  standard_answer: unknown;
  explanation?: string | null;
  exam_points: string[];
  common_mistakes?: string | null;
  follow_up_question?: string | null;
  scoring_standard?: string | null;
};

export type Attempt = {
  id: string;
  question_id: string;
  user_answer_raw: string;
  user_answer_normalized: unknown;
  correct_answer_normalized: unknown;
  is_correct: boolean | null;
  score?: number | null;
  max_score?: number | null;
  review_status?: string | null;
  question_version?: number | null;
  question_snapshot?: unknown;
  created_at?: string | null;
};

export type QuestionState = {
  question_id: string;
  status: string;
  attempt_count: number;
  correct_count: number;
  wrong_count: number;
  last_result?: string | null;
  last_attempt_at?: string | null;
  next_review_at?: string | null;
  mastery_level: number;
};

export type WrongAttempt = {
  attempt: Attempt;
  question: Question;
  wrong_count: number;
  last_wrong_at?: string | null;
  last_wrong_answer: string;
};

export type WrongAttemptPage = {
  items: WrongAttempt[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
};
