import { BookPlus, Check, Copy, RotateCcw } from "lucide-react";
import { memo, useState } from "react";
import { Link } from "react-router-dom";
import type { StudioMessage } from "../../api/studio";
import { RichContent } from "../content/RichContent";

export const StudioMessageView = memo(function StudioMessageView({ message, retryable, disabled, onRetry }: { message: StudioMessage; retryable: boolean; disabled: boolean; onRetry: (id: string) => void }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const assistant = message.role === "assistant";
  async function copy() {
    try { await navigator.clipboard.writeText(message.content); setCopied(true); setCopyError(""); }
    catch { setCopyError("复制失败，请选择正文手动复制。"); }
  }
  const images = message.image_ids.map((id, i) => `![讨论附图 ${i + 1}](/api/media/images/${id})`).join("\n\n");
  return <article className={`studio-message ${assistant ? "from-assistant" : "from-user"}`}>
    <div className="studio-message-meta"><span>{assistant ? "小鲸" : "你"}</span>{assistant && <small>{message.model}</small>}<time dateTime={message.created_at}>{new Date(message.created_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</time></div>
    <div className="studio-message-body">
      {message.status === "pending" ? <div className="streaming-text">{message.content || <span className="text-muted">正在思考…</span>}<span className="stream-cursor" aria-hidden="true" /></div> : <RichContent content={message.content} />}
      {images && <div className="studio-message-images"><RichContent content={images} /></div>}
    </div>
    {message.error && <p className="studio-message-error">{message.error}</p>}
    {assistant && message.status !== "pending" && <div className="studio-message-actions">
      {message.content && <button className="btn-ghost btn-sm" onClick={() => void copy()}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "已复制" : "复制"}</button>}
      {message.status === "complete" && !disabled && <Link className="btn-ghost btn-sm" to={`/questions/new?studio_message=${message.id}`}><BookPlus size={14} />整理成题目</Link>}
      {retryable && <button className="btn-ghost btn-sm" disabled={disabled} onClick={() => onRetry(message.id)}><RotateCcw size={14} />重试回复</button>}
      {copyError && <span role="status" className="text-xs text-bad">{copyError}</span>}
    </div>}
  </article>;
});
