import { API_BASE, readApiErrorMessage, request } from "./client";
import type { QuestionCreatePayload } from "../types/question";

export type Connection = { base_url: string; api_key: string; model: string; supports_images: boolean };
export type StudioMode = "learn" | "explain" | "create";
export type StudioMessage = { id: string; role: "user" | "assistant"; content: string; image_ids: string[]; status: "pending" | "complete" | "error" | "stopped"; model: string | null; error: string | null; created_at: string };
export type Conversation = { id: string; title: string; mode: StudioMode; pinned: boolean; archived: boolean; busy: boolean; created_at: string; updated_at: string };
export type ConversationDetail = Conversation & { messages: StudioMessage[] };
export type MathResult = { expression: string; value: number | null; formatted?: string; points: Array<[number, number | null]>; x_min?: number; x_max?: number };
export type StudioEvent = { event: "start"; data: { message_id: string; turn: StudioMessage[]; history_trimmed: boolean; context_messages: number; image_count: number } } | { event: "delta"; data: { content: string } } | { event: "done"; data: { message_id: string } } | { event: "error"; data: { message: string } };

export const listConversations = (q = "", archived = false, offset = 0) => request<{ items: Conversation[]; has_more: boolean }>(`/studio/conversations?${new URLSearchParams({ q, archived: String(archived), offset: String(offset) })}`);
export const createConversation = (mode: StudioMode) => request<ConversationDetail>("/studio/conversations", { method: "POST", body: JSON.stringify({ mode }) });
export const getConversation = (id: string) => request<ConversationDetail>(`/studio/conversations/${id}`);
export const getConversationStatus = (id: string) => request<Conversation>(`/studio/conversations/${id}/status`);
export const updateConversation = (id: string, update: Partial<Pick<Conversation, "title" | "pinned" | "archived">>) => request<Conversation>(`/studio/conversations/${id}`, { method: "PATCH", body: JSON.stringify(update) });
export const getStudioQuestionDraft = (messageId: string) => request<QuestionCreatePayload>(`/studio/messages/${messageId}/question-draft`);
export const checkConnection = (connection: Connection) => request<{ ok: boolean; model: string }>("/studio/connection/check", { method: "POST", body: JSON.stringify(connection) });
export const calculate = (expression: string, plot: boolean, x_min: number, x_max: number) => request<MathResult>("/studio/tools/math", { method: "POST", body: JSON.stringify({ expression, plot, x_min, x_max }) });

export async function streamStudio(id: string, payload: { connection: Connection; content?: string; image_ids?: string[]; retry_message_id?: string }, signal: AbortSignal, onEvent: (event: StudioEvent) => void) {
  const response = await fetch(`${API_BASE}/studio/conversations/${id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal });
  if (!response.ok) throw new Error(readApiErrorMessage(await response.text()) || `请求失败：${response.status}`);
  if (!response.body) throw new Error("浏览器不支持流式读取。");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "", completed = false;
  function dispatch(block: string) {
    const name = block.split("\n").find(line => line.startsWith("event:"))?.slice(6).trim();
    const data = block.split("\n").filter(line => line.startsWith("data:")).map(line => line.slice(5).trimStart()).join("\n");
    if (!name || !data) return;
    const event = { event: name, data: JSON.parse(data) } as StudioEvent;
    if (event.event === "done" || event.event === "error") completed = true;
    onEvent(event);
  }
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      buffer = buffer.replace(/\r\n/g, "\n");
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) >= 0) { dispatch(buffer.slice(0, boundary)); buffer = buffer.slice(boundary + 2); }
      if (done) { if (buffer.trim()) dispatch(buffer); break; }
    }
    if (!completed) throw new Error("连接提前结束，已收到的内容会保留；请刷新讨论后重试。");
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}
