import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudioPage } from "./StudioPage";
import * as api from "../api/studio";
import { saveConnections } from "../utils/modelConnections";

vi.mock("../api/studio", () => ({ createConversation: vi.fn(), getConversation: vi.fn(), getConversationStatus: vi.fn(), streamStudio: vi.fn(), listConversations: vi.fn(), updateConversation: vi.fn(), calculate: vi.fn() }));
vi.mock("../components/content/RichContent", () => ({ RichContent: ({ content }: { content: string }) => <div>{content}</div> }));
const user: api.StudioMessage = { id: "u", role: "user", content: "需要保留的问题", image_ids: [], status: "complete", error: null, model: null, created_at: "2026-10-29T01:00:00Z" };
const answer: api.StudioMessage = { ...user, id: "a", role: "assistant", content: "", status: "pending", model: "test-model" };
const detail = (id = "c", messages: api.StudioMessage[] = []): api.ConversationDetail => ({ id, title: id, mode: "learn", pinned: false, archived: false, busy: false, messages, created_at: user.created_at, updated_at: user.created_at });
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  saveConnections({ activeId: "p", profiles: [{ id: "p", name: "测试连接", base_url: "http://localhost:1234/v1", api_key: "test-key", model: "test-model", supports_images: true }] });
  vi.mocked(api.createConversation).mockResolvedValue(detail());
  vi.mocked(api.getConversation).mockResolvedValue(detail());
  vi.mocked(api.listConversations).mockResolvedValue({ items: [], has_more: false });
});

describe("studio discussion state", () => {
  it("keeps a draft when a newly created conversation rejects the request before acceptance", async () => {
    vi.mocked(api.streamStudio).mockRejectedValue(new Error("模型地址错误"));
    render(<MemoryRouter><StudioPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("输入你的问题"), { target: { value: "需要保留的问题" } });
    fireEvent.click(screen.getByLabelText("发送问题"));
    await screen.findByText("模型地址错误");
    expect((screen.getByLabelText("输入你的问题") as HTMLTextAreaElement).value).toBe("需要保留的问题");
    expect(JSON.parse(localStorage.getItem("xiaojing_studio_draft:c")!).text).toBe("需要保留的问题");
    expect(api.streamStudio).toHaveBeenCalledTimes(1);
  });

  it("stops a stream, preserves its partial reply and retries the same message", async () => {
    const stopped = { ...answer, content: "部分内容", status: "stopped" as const, error: "生成已停止" };
    vi.mocked(api.getConversation).mockResolvedValue(detail("c", [user, stopped]));
    vi.mocked(api.streamStudio).mockImplementation(async (_id, _payload, signal, callback) => {
      callback({ event: "start", data: { message_id: "a", turn: [user, answer], history_trimmed: false, context_messages: 1, image_count: 0 } });
      callback({ event: "delta", data: { content: "部分内容" } });
      await new Promise<void>((_, reject) => signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError"))));
    });
    render(<MemoryRouter><StudioPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("输入你的问题"), { target: { value: user.content } });
    fireEvent.click(screen.getByLabelText("发送问题"));
    await screen.findByText("部分内容");
    fireEvent.click(screen.getByLabelText("停止生成"));
    await screen.findByRole("button", { name: "重试回复" });
    await waitFor(() => expect((screen.getByLabelText("输入你的问题") as HTMLTextAreaElement).disabled).toBe(false));
    vi.mocked(api.getConversation).mockResolvedValue(detail("c", [user, { ...answer, content: "完整回复", status: "complete" }]));
    vi.mocked(api.streamStudio).mockImplementation(async (_id, _payload, _signal, callback) => {
      callback({ event: "start", data: { message_id: "a", turn: [user, answer], history_trimmed: false, context_messages: 1, image_count: 0 } });
      callback({ event: "delta", data: { content: "完整回复" } });
      callback({ event: "done", data: { message_id: "a" } });
    });
    fireEvent.click(screen.getByRole("button", { name: "重试回复" }));
    await screen.findByText("完整回复");
    expect(screen.getAllByText(user.content)).toHaveLength(1);
    expect(vi.mocked(api.streamStudio).mock.calls[1][1].retry_message_id).toBe("a");
    expect((screen.getByLabelText("输入你的问题") as HTMLTextAreaElement).value).toBe("");
  });

  it("does not let an older history response replace the newly selected conversation", async () => {
    let resolveA!: (value: api.ConversationDetail) => void;
    vi.mocked(api.getConversation).mockImplementation(id => id === "A" ? new Promise(resolve => { resolveA = resolve; }) : Promise.resolve(detail("B", [{ ...user, content: "B 的问题" }])));
    function Switcher() { const navigate = useNavigate(); return <><button onClick={() => navigate("/studio?id=B")}>浏览器跳转 B</button><StudioPage /></>; }
    render(<MemoryRouter initialEntries={["/studio?id=A"]}><Switcher /></MemoryRouter>);
    fireEvent.click(screen.getByText("浏览器跳转 B"));
    await screen.findByText("B 的问题");
    await act(async () => { resolveA(detail("A", [{ ...user, content: "A 的问题" }])); });
    expect(screen.queryByText("A 的问题")).toBeNull();
    expect(screen.getByText("B 的问题")).toBeTruthy();
  });
});
