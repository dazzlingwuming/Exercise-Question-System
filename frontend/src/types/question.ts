export type Option = {
  key: string;
  text: string;
};

export type Question = {
  id: string;
  part_id?: string | null;
  title?: string | null;
  type: string;
  type_label: string;
  difficulty?: string | null;
  tags: string[];
  directions: string[];
  import_order?: number | null;
  stem: string;
  material?: string | null;
  options: Option[];
  standard_answer?: unknown;
  answer_text?: string | null;
  explanation?: string | null;
  exam_points: string[];
  common_mistakes?: string | null;
  follow_up_question?: string | null;
  scoring_standard?: string | null;
  source_text: string;
  parse_warnings: string[];
  version: number;
  is_deleted: boolean;
  deleted_at?: string | null;
  delete_reason?: string | null;
  deleted_source?: string | null;
};

export type QuestionListResponse = {
  total: number;
  page: number;
  page_size: number;
  items: Question[];
};

export type QuestionPageResponse = {
  items: Question[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
};

export type FilterOptions = {
  types: string[];
  difficulties: string[];
  tags: string[];
  exam_points: string[];
  directions: string[];
};

export type QuestionUpdatePayload = Partial<{
  title: string | null;
  type: string;
  type_label: string;
  difficulty: string | null;
  tags: string[];
  directions: string[];
  stem: string;
  material: string | null;
  options: Option[];
  standard_answer: unknown;
  explanation: string | null;
  exam_points: string[];
  common_mistakes: string | null;
  follow_up_question: string | null;
  scoring_standard: string | null;
  reason: string | null;
}>;

export type QuestionCreatePayload = {
  type: string;
  type_label?: string | null;
  difficulty?: string | null;
  tags: string[];
  directions: string[];
  stem: string;
  material?: string | null;
  options: Option[];
  standard_answer?: unknown;
  explanation?: string | null;
  exam_points: string[];
  common_mistakes?: string | null;
  follow_up_question?: string | null;
  scoring_standard?: string | null;
  reason?: string | null;
};

export type QuestionRevision = {
  id: string;
  question_id: string;
  version_before: number;
  version_after: number;
  changed_fields: string[];
  reason?: string | null;
  source: string;
  created_at?: string | null;
};

export type QuestionRevisionDetail = QuestionRevision & {
  before_data: Record<string, unknown>;
  after_data: Record<string, unknown>;
};

export type RevisionRestorePayload = {
  restore_target: "before" | "after";
  reason?: string | null;
};

export type QuestionDeletePayload = {
  reason?: string | null;
};

export type QuestionDeleteStatus = {
  question_id: string;
  is_deleted: boolean;
  deleted_at?: string | null;
  delete_reason?: string | null;
  deleted_source?: string | null;
};
