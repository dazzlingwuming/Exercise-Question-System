export const PRACTICE_DRAFTS_KEY = "practice_question_drafts_v1";
type Answer = string | string[];
function read(): Record<string, Answer> { try { return JSON.parse(sessionStorage.getItem(PRACTICE_DRAFTS_KEY) || "{}"); } catch { return {}; } }
function write(value: Record<string, Answer>) { try { sessionStorage.setItem(PRACTICE_DRAFTS_KEY, JSON.stringify(value)); } catch { /* Storage unavailable: the current answer remains in memory. */ } }
export function getDraft(session: string, question: string): Answer { return read()[`${session}:${question}`] ?? ""; }
export function saveDraft(session: string, question: string, answer: Answer) { if (!session || !question) return; const drafts = read(); drafts[`${session}:${question}`] = answer; write(drafts); }
export function removeDraft(session: string, question: string) { const drafts = read(); delete drafts[`${session}:${question}`]; write(drafts); }
export function clearSessionDrafts(session: string) { const drafts = read(); Object.keys(drafts).filter((key) => key.startsWith(`${session}:`)).forEach((key) => delete drafts[key]); write(drafts); }
