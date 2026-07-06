export type StatsSummary = {
  total_questions: number;
  answered_count: number;
  accuracy: number | null;
  wrong_count: number;
  type_distribution: Record<string, number>;
  difficulty_distribution: Record<string, number>;
  recent_attempts: Array<Record<string, unknown>>;
  frequent_error_points: Array<{ point: string; count: number }>;
};
