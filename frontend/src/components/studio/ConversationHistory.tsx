import { Archive, MessageSquare, Pin, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { listConversations, type Conversation } from "../../api/studio";

export function ConversationHistory({ currentId, onSelect, onNew, disabled }: { currentId: string | null; onSelect: (id: string) => void; onNew: () => void; disabled: boolean }) {
  const [query, setQuery] = useState("");
  const [archived, setArchived] = useState(false);
  const [items, setItems] = useState<Conversation[]>([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true; setLoading(true); setError(""); setItems([]);
    const timer = window.setTimeout(() => {
      listConversations(query, archived).then(data => { if (active) { setItems(data.items); setMore(data.has_more); } })
        .catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    }, 200);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query, archived]);
  async function loadMore() {
    setLoading(true); setError("");
    try { const data = await listConversations(query, archived, items.length); setItems(previous => [...previous, ...data.items]); setMore(data.has_more); }
    catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }
  return <div className="conversation-history">
    <div className="flex gap-2 mb-4"><button className="btn-primary flex-1" disabled={disabled} onClick={onNew}><Plus size={16} />新讨论</button><button className="btn-secondary" disabled={loading} aria-pressed={archived} onClick={() => setArchived(value => !value)}><Archive size={16} />{archived ? "返回最近" : "已归档"}</button></div>
    <label className="history-search"><Search size={16} /><input placeholder="搜索讨论标题" aria-label="搜索讨论标题" value={query} onChange={e => setQuery(e.target.value)} maxLength={120} disabled={loading && items.length > 0} /></label>
    <div className="history-list">{items.map(item => <button key={item.id} disabled={disabled} className={currentId === item.id ? "is-active" : ""} onClick={() => onSelect(item.id)}><MessageSquare size={16} /><span><strong>{item.title}</strong><small>{new Date(item.updated_at).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · {item.mode === "learn" ? "引导学习" : item.mode === "create" ? "创作整理" : "直接解答"}</small></span>{item.pinned && <Pin size={14} aria-label="已置顶" />}</button>)}</div>
    {error && <p role="alert" className="text-bad text-sm py-3">{error}</p>}
    {loading && <p role="status" className="text-sm text-muted py-4">正在读取讨论…</p>}
    {!items.length && !loading && !error && <p className="text-sm text-muted py-8 text-center">{query ? "没有匹配的标题" : archived ? "还没有归档的讨论" : "开始一次讨论，就会保存在这里。"}</p>}
    {more && <button className="btn-secondary w-full mt-3" disabled={loading} onClick={() => void loadMore()}>加载更早的讨论</button>}
  </div>;
}
