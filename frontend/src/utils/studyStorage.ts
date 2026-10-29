const RESUME_KEY = "study_resume_v1";
const GOAL_KEY = "study_daily_goal_v1";
export type ResumePractice = { id: string; mode: string; index: number; total: number; title: string };
export function loadResume(): ResumePractice | null {
  try {
    const value = JSON.parse(localStorage.getItem(RESUME_KEY) || "null");
    return value && typeof value.id === "string" && Number.isFinite(value.total) ? value : null;
  } catch { return null; }
}
export function saveResume(value: ResumePractice) {
  try { localStorage.setItem(RESUME_KEY, JSON.stringify(value)); } catch { /* In-memory practice remains usable. */ }
}
export function clearResume(id: string) {
  try { if (loadResume()?.id === id) localStorage.removeItem(RESUME_KEY); } catch { /* Storage may be unavailable. */ }
}
export function loadDailyGoal(): number {
  try { const value = Number(localStorage.getItem(GOAL_KEY)); return [5, 10, 20].includes(value) ? value : 10; } catch { return 10; }
}
export function saveDailyGoal(value: number) {
  try { localStorage.setItem(GOAL_KEY, String(value)); } catch { /* A preference is optional. */ }
}
