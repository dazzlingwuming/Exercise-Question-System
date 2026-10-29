import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { getPracticeReport, getStudyOverview, type PracticeReport } from "../../api/practice";
import { loadDailyGoal, saveResume } from "../../utils/studyStorage";
import { getDraft, removeDraft, saveDraft } from "../../utils/practiceDrafts";
import { SessionReport } from "./SessionReport";
import { TodayPlan } from "./TodayPlan";

vi.mock("../../api/practice", () => ({ getPracticeReport: vi.fn(), getStudyOverview: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); });
it("offers a bounded daily session, persists the goal, and resumes the saved session", async () => {
  vi.mocked(getStudyOverview).mockResolvedValue({ today_count: 2, due_count: 3, available_count: 12, date: "2026-10-29" });
  saveResume({ id: "session", mode: "daily", index: 2, total: 10, title: "当前题目" });
  render(<MemoryRouter><TodayPlan hasQuestions /></MemoryRouter>);
  await screen.findByText("今日已练 2 道不同题目 · 3 道到期复习");
  fireEvent.change(screen.getByLabelText("每日目标"), { target: { value: "5" } });
  expect(screen.getByRole("link", { name: "开始 5 题练习" }).getAttribute("href")).toBe("/practice?mode=daily&limit=5");
  expect(loadDailyGoal()).toBe(5);
  expect(screen.getByRole("link", { name: /接着上次学/ }).getAttribute("href")).toBe("/practice?session_id=session");
});
it("retains drafts after the tab storage is gone and removes submitted drafts", () => {
  saveDraft("s", "q", "手写步骤 ![图](/api/media/images/test)");
  sessionStorage.clear();
  expect(getDraft("s", "q")).toContain("手写步骤");
  removeDraft("s", "q");
  expect(getDraft("s", "q")).toBe("");
});
it("does not call skipped or pending work complete and offers specific recovery actions", async () => {
  const report: PracticeReport = { session_id: "s", total: 3, answered: 2, correct: 0, wrong: 1, partial: 0, pending: 1, unanswered: 1, deleted: 0, accuracy: 0, weak_points: [{ point: "函数", count: 1 }], items: [
    { question_id: "q1", index: 0, title: "第一题", status: "wrong" }, { question_id: "q2", index: 1, title: "第二题", status: "pending" }, { question_id: "q3", index: 2, title: "第三题", status: "unanswered" },
  ] };
  vi.mocked(getPracticeReport).mockResolvedValue(report);
  const jump = vi.fn(); const retry = vi.fn();
  render(<SessionReport sessionId="s" busy={false} onJump={jump} onRetry={retry} />);
  await screen.findByText("这一轮，还可以接着完成");
  fireEvent.click(screen.getByRole("button", { name: "完成自评" }));
  expect(jump).toHaveBeenLastCalledWith("q2");
  fireEvent.click(screen.getByRole("button", { name: /继续未答题/ }));
  expect(jump).toHaveBeenLastCalledWith("q3");
  fireEvent.click(screen.getByRole("button", { name: /只重练薄弱题/ }));
  expect(retry).toHaveBeenCalledWith("mistakes");
});
