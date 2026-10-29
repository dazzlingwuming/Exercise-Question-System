import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import * as ai from "../../api/ai";
import { uploadImage } from "../../api/media";
import { AiTutorPanel } from "./AiTutorPanel";
import { AI_CONFIG_STORAGE_KEY } from "../../utils/aiConfigStorage";

vi.mock("../../api/ai", () => ({ getAiThread: vi.fn(), sendAiMessageStream: vi.fn(), runAiActionStream: vi.fn(), generateAiQuestions: vi.fn(), testAiConnection: vi.fn() }));
vi.mock("../../api/media", async original => ({ ...await original<typeof import("../../api/media")>(), uploadImage: vi.fn() }));
const thread: ai.AiThread = { thread_id: "t", question_id: "q", submitted: false, current_stage: "hint", has_hint: false, has_explanation: false, has_engineering_example: false, has_interview_followup: false, allowed_actions: { hint: true, explanation: false, engineering_example: false, interview_followup: false }, messages: [] };
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify({ api_key: "test-only" }));
  vi.mocked(ai.getAiThread).mockResolvedValue(thread);
});
it("sends an image from the existing tutor composer and retains it on failure", async () => {
  const id = "b".repeat(32);
  vi.mocked(uploadImage).mockResolvedValue({ id, url: `/api/media/images/${id}`, mime_type: "image/png", size_bytes: 10, width: 2, height: 2 });
  vi.mocked(ai.sendAiMessageStream).mockRejectedValue(new Error("暂时不可用"));
  render(<MemoryRouter><AiTutorPanel submitted={false} question={{ id: "q", type: "short_answer", type_label: "简答题", stem: "测试", options: [], tags: [], directions: [], exam_points: [] }} /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("添加图片附件"), { target: { files: [new File(["image"], "work.png", { type: "image/png" })] } });
  await screen.findByAltText("附图 1");
  await waitFor(() => expect((screen.getByRole("button", { name: "发送消息" }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole("button", { name: "发送消息" }));
  await screen.findByText("暂时不可用");
  expect(ai.sendAiMessageStream).toHaveBeenCalledWith("q", expect.any(String), expect.any(Object), undefined, expect.any(Function), [id]);
  expect(screen.getByRole("button", { name: "移除附图 1" })).toBeTruthy();
});

it("step checking includes the learner's typed reasoning instead of replacing it", async () => {
  vi.mocked(ai.sendAiMessageStream).mockResolvedValue(undefined);
  render(<MemoryRouter><AiTutorPanel submitted={false} question={{ id: "q", type: "short_answer", type_label: "简答题", stem: "测试", options: [], tags: [], directions: [], exam_points: [] }} /></MemoryRouter>);
  await screen.findByText("暂无 AI 对话。");
  fireEvent.change(screen.getByLabelText("向 AI 提问"), { target: { value: "我认为先把两边平方" } });
  fireEvent.click(screen.getByRole("button", { name: "检查我的步骤" }));
  await waitFor(() => expect(ai.sendAiMessageStream).toHaveBeenCalled());
  const prompt = vi.mocked(ai.sendAiMessageStream).mock.calls[0][1];
  expect(prompt).toContain("我认为先把两边平方");
  expect(prompt).toContain("第一处明确的问题");
});
