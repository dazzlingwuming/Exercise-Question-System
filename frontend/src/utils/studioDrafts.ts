import type { ManagedImage } from "../api/media";
import type { ConversationDetail } from "../api/studio";

export type StudioDraft = { text: string; images: ManagedImage[] };
const key = (id: string | null) => `xiaojing_studio_draft:${id || "new"}`;
export function readStudioDraft(id: string | null): StudioDraft {
  try {
    const value = JSON.parse(localStorage.getItem(key(id)) || "null");
    if (value && typeof value.text === "string" && Array.isArray(value.images)) return value;
  } catch { /* A corrupt draft must not block a discussion. */ }
  return { text: "", images: [] };
}
export function saveStudioDraft(id: string | null, draft: StudioDraft): boolean {
  try {
    if (!draft.text && !draft.images.length) localStorage.removeItem(key(id));
    else localStorage.setItem(key(id), JSON.stringify(draft));
    return true;
  } catch { return false; }
}
export function conversationMarkdown(conversation: ConversationDetail): string {
  return `# ${conversation.title}\n\n` + conversation.messages.map(row => `## ${row.role === "user" ? "我" : "AI"}${row.status === "complete" ? "" : `（${row.status === "stopped" ? "已停止" : row.status === "pending" ? "生成中" : "未完成"}）`}\n\n${row.content}${row.image_ids.length ? "\n\n" + row.image_ids.map((id, i) => `![附图 ${i + 1}](/api/media/images/${id})`).join("\n\n") : ""}\n`).join("\n---\n\n") + "\n> 图片使用当前学习空间的资源链接；在其他设备离线阅读时需另存图片。\n";
}
