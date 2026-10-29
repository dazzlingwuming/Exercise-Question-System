import { Archive, ArrowDown, ArrowUp, BookOpen, Download, History, ImagePlus, MessageSquare, PanelRight, PenLine, Pin, Plus, Settings2, Square, Waypoints, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { updateConversation, type StudioMode } from "../api/studio";
import { Dialog } from "../components/common/Dialog";
import { ImageAttachments } from "../components/content/ImageAttachments";
import { BrandMark } from "../components/layout/BrandMark";
import { ConversationHistory } from "../components/studio/ConversationHistory";
import { MathWorkbench } from "../components/studio/MathWorkbench";
import { StudioMessageView } from "../components/studio/StudioMessages";
import { useStudioChat } from "../components/studio/useStudioChat";
import { connectionPayload, loadConnections, saveConnections } from "../utils/modelConnections";
import { conversationMarkdown, readStudioDraft, saveStudioDraft, type StudioDraft } from "../utils/studioDrafts";

const starters = [
  { icon: BookOpen, title: "弄懂一个概念", text: "请用生活中的例子解释一个概念，并问我一个问题检查是否理解。概念是：" },
  { icon: ImagePlus, title: "一起看题和截图", text: "请先读出图片里的关键信息，帮我逐步分析；看不清的地方先问我。" },
  { icon: Waypoints, title: "用流程图梳理", text: "请把这个过程整理成 Mermaid 流程图，并解释关键步骤：" },
  { icon: PenLine, title: "整理思路与表达", text: "请帮我把下面的材料整理成清楚的提纲，指出需要补充的依据：" },
];
const modes: Array<[StudioMode, string]> = [["learn", "引导学习"], ["explain", "直接解答"], ["create", "创作整理"]];

export function StudioPage() {
  const [params, setParams] = useSearchParams();
  const id = params.get("id");
  const [draftState, setDraftState] = useState(() => ({ id, value: readStudioDraft(id) }));
  if (draftState.id !== id) setDraftState({ id, value: readStudioDraft(id) });
  const draft = draftState.id === id ? draftState.value : readStudioDraft(id);
  const [store, setStore] = useState(loadConnections);
  const [mode, setMode] = useState<StudioMode>("learn");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [wide, setWide] = useState(() => window.innerWidth >= 1280);
  const [uploading, setUploading] = useState(false);
  const [rename, setRename] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [updating, setUpdating] = useState(false);
  const [visible, setVisible] = useState(30);
  const [away, setAway] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const chat = useStudioChat(id, newId => {
    saveStudioDraft(newId, draft); setDraftState({ id: newId, value: draft });
    setParams({ id: newId }, { replace: true });
  });
  const profile = store.profiles.find(p => p.id === store.activeId) || store.profiles[0];
  const busy = chat.sending || !!chat.conversation?.busy || chat.loading || updating;
  const messages = chat.conversation?.messages || [];
  useEffect(() => { const query = window.matchMedia("(min-width: 1280px)"); const change = () => setWide(query.matches); query.addEventListener("change", change); return () => query.removeEventListener("change", change); }, []);
  useEffect(() => { setVisible(30); setAway(false); setNotice(""); }, [id]);
  useEffect(() => { if (scroll.current && !messages.length) scroll.current.scrollTop = 0; else if (!away && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }, [messages, away]);
  function editDraft(value: StudioDraft) {
    setDraftState({ id, value });
    if (!saveStudioDraft(id, value)) setNotice("浏览器无法保存草稿，离开页面前请复制内容。");
  }
  function accepted(activeId: string) {
    const empty = { text: "", images: [] };
    saveStudioDraft(activeId, empty); if (!id) saveStudioDraft(null, empty);
    setDraftState({ id: activeId, value: empty }); setAway(false);
  }
  function send(retryId?: string) {
    if (busy || uploading || (!retryId && !draft.text.trim() && !draft.images.length)) return;
    if (!profile.base_url.trim() || !profile.model.trim()) { chat.setError("请先在模型连接中填写 API 地址与模型。"); return; }
    if (draft.images.length && !profile.supports_images && !retryId) { chat.setError("当前连接未开启图片输入，请在模型连接中选择支持图片的模型。"); return; }
    void chat.send(connectionPayload(profile), mode, draft.text, draft.images.map(image => image.id), accepted, retryId);
  }
  async function changeConversation(change: Parameters<typeof updateConversation>[1]) {
    if (!id || busy) return;
    setUpdating(true); chat.setError("");
    try { const updated = await updateConversation(id, change); chat.setConversation(previous => previous ? { ...previous, ...updated } : previous); setRename(null); }
    catch (err) { chat.setError((err as Error).message); }
    finally { setUpdating(false); }
  }
  function exportChat() {
    if (!chat.conversation) return;
    const url = URL.createObjectURL(new Blob([conversationMarkdown(chat.conversation)], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `${chat.conversation.title.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").slice(0, 60)}.md`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("讨论已导出为 Markdown；图片链接仅在当前学习空间可用。");
  }
  function chooseProfile(value: string) {
    try { const next = { ...store, activeId: value }; saveConnections(next); setStore(next); chat.setError(""); }
    catch (err) { chat.setError((err as Error).message); }
  }
  const toolContent = <MathWorkbench disabled={busy || !!chat.conversation?.archived} onUse={text => { editDraft({ ...draft, text: draft.text ? `${draft.text}\n\n${text}` : text }); if (!wide) setToolsOpen(false); window.setTimeout(() => input.current?.focus(), 0); }} />;
  return <div className="studio-page">
    <header className="studio-toolbar"><div className="studio-title"><MessageSquare size={19} /><h1>{chat.conversation?.title || "AI 工作台"}</h1>{chat.conversation?.pinned && <Pin size={14} />}</div>
      <div className="studio-toolbar-actions"><button className="btn-ghost btn-sm" aria-label="讨论记录" onClick={() => setHistoryOpen(true)}><History size={16} /><span>讨论记录</span></button><button className="btn-ghost btn-sm" disabled={busy || uploading} aria-label="新讨论" onClick={() => setParams({})}><Plus size={16} /><span>新讨论</span></button><button className="btn-secondary btn-sm" aria-label="学习工具" aria-expanded={toolsOpen} onClick={() => setToolsOpen(value => !value)}><PanelRight size={16} /><span>学习工具</span></button></div>
    </header>
    <div className="studio-shell"><div className="studio-chat">
      {chat.conversation && <div className="studio-conversation-tools"><span>{modes.find(([value]) => value === chat.conversation?.mode)?.[1]}</span><button disabled={busy} onClick={() => setRename(chat.conversation!.title)}>重命名</button><button disabled={busy} onClick={() => void changeConversation({ pinned: !chat.conversation!.pinned })}>{chat.conversation.pinned ? "取消置顶" : "置顶"}</button><button disabled={busy} onClick={() => void changeConversation({ archived: !chat.conversation!.archived })}><Archive size={13} />{chat.conversation.archived ? "恢复讨论" : "归档"}</button><button disabled={busy || !messages.length} onClick={exportChat}><Download size={13} />导出</button></div>}
      <div className="studio-scroll" ref={scroll} onScroll={e => { const el = e.currentTarget; setAway(el.scrollHeight - el.scrollTop - el.clientHeight > 120); }}>
        {chat.loading && <p role="status" className="text-muted p-8 text-center">正在读取讨论…</p>}
        {!chat.loading && !messages.length && <div className="studio-welcome"><div className="studio-welcome-mark"><BrandMark size={52} /><span>小鲸 · AI 工作台</span></div><h2>今天想弄懂什么？</h2><p>提一个问题，贴一张图，或从一个想法开始。</p><div className="studio-starters">{starters.map(({ icon: Icon, title, text }) => <button key={title} disabled={busy} onClick={() => { editDraft({ ...draft, text }); input.current?.focus(); }}><Icon size={19} strokeWidth={1.6} /><span>{title}</span><ArrowUp size={14} /></button>)}</div><Link className="studio-setup-link" to="/settings"><Settings2 size={14} />{(profile.api_key || !profile.base_url.includes("api.deepseek.com")) ? "管理模型连接" : "首次使用？先连接你的模型"}</Link></div>}
        {messages.length > 0 && <div className="studio-messages">{messages.length > visible && <button className="btn-ghost btn-sm mb-5" onClick={() => setVisible(value => value + 30)}>显示更早的消息（还有 {messages.length - visible} 条）</button>}{messages.slice(-visible).map((message, index, rows) => <StudioMessageView key={message.id} message={message} disabled={busy || !!chat.conversation?.archived} retryable={index === rows.length - 1 && ["error", "stopped"].includes(message.status)} onRetry={send} />)}</div>}
      </div>
      <div className="studio-compose-area">
        {away && messages.length > 0 && <button className="studio-scroll-bottom" onClick={() => { setAway(false); scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: "auto" }); }}><ArrowDown size={14} />回到最新</button>}
        {chat.error && <p role="alert" className="studio-status text-bad">{chat.error}</p>}{notice && <p role="status" className="studio-status text-muted">{notice}</p>}
        {chat.trimmed && <p className="studio-status text-muted">本次仅使用最近可容纳的上下文（最多 10 轮、6 张图片）；完整记录仍保留。</p>}
        {chat.conversation?.archived ? <div className="studio-archived"><Archive size={18} />这段讨论已归档。<button className="btn-secondary btn-sm" disabled={busy} onClick={() => void changeConversation({ archived: false })}>恢复并继续</button></div> : <>
          {!chat.conversation && <div className="studio-mode-choice" aria-label="讨论方式">{modes.map(([value, label]) => <button disabled={busy} key={value} aria-pressed={mode === value} onClick={() => setMode(value)}>{label}</button>)}</div>}
          <div className="studio-composer"><ImageAttachments images={draft.images} onChange={images => editDraft({ ...draft, images })} disabled={busy} onBusyChange={setUploading}>
            <label className="sr-only" htmlFor="studio-input">输入你的问题</label><textarea id="studio-input" ref={input} rows={3} maxLength={20000} placeholder="输入问题，或粘贴一张截图…" value={draft.text} disabled={busy} onChange={e => editDraft({ ...draft, text: e.target.value })} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) { e.preventDefault(); send(); } }} />
          </ImageAttachments><div className="studio-send-row"><label className="studio-model-select"><span className="sr-only">当前模型连接</span><select value={store.activeId} onChange={e => chooseProfile(e.target.value)} disabled={busy}>{store.profiles.map(p => <option key={p.id} value={p.id}>{p.name} · {p.model}</option>)}</select></label><Link to="/settings" className="icon-btn" aria-label="模型连接设置"><Settings2 size={17} /></Link>{chat.sending ? <button className="studio-send-button is-stopping" onClick={chat.stop} aria-label="停止生成"><Square size={16} fill="currentColor" /></button> : <button className="studio-send-button" aria-label="发送问题" disabled={busy || uploading || (!draft.text.trim() && !draft.images.length)} onClick={() => send()}><ArrowUp size={21} /></button>}</div></div>
          <div className="studio-compose-hint"><span>{chat.sending ? "正在生成 · 可随时停止" : chat.conversation?.busy ? "这段讨论正在另一个窗口生成…" : profile.supports_images ? "文字与图片，一起讨论" : "当前连接支持文字"}</span><span className="desktop-send-hint">Enter 发送 · Shift + Enter 换行</span></div>
        </>}
      </div>
    </div>{wide && toolsOpen && <aside className="studio-tools"><button className="icon-btn float-right" aria-label="关闭学习工具" onClick={() => setToolsOpen(false)}><X size={17} /></button>{toolContent}</aside>}</div>
    <Dialog open={historyOpen} title="讨论记录" onClose={() => setHistoryOpen(false)} className="max-w-xl"><ConversationHistory currentId={id} disabled={busy || uploading} onNew={() => { setParams({}); setHistoryOpen(false); }} onSelect={value => { setParams({ id: value }); setHistoryOpen(false); }} /><button className="btn-ghost w-full mt-4" onClick={() => setHistoryOpen(false)}>关闭记录</button></Dialog>
    <Dialog open={toolsOpen && !wide} title="学习工具" onClose={() => setToolsOpen(false)} className="max-w-lg">{toolContent}<button className="btn-ghost w-full mt-4" onClick={() => setToolsOpen(false)}>关闭工具</button></Dialog>
    <Dialog open={rename !== null} title="重命名讨论" onClose={() => setRename(null)}><form onSubmit={e => { e.preventDefault(); if (rename?.trim()) void changeConversation({ title: rename.trim() }); }}><label className="tool-label">讨论标题<input value={rename || ""} maxLength={120} onChange={e => setRename(e.target.value)} /></label><div className="flex gap-2 mt-4"><button className="btn-primary" disabled={busy || !rename?.trim()}>保存标题</button><button type="button" className="btn-ghost" onClick={() => setRename(null)}>取消</button></div></form></Dialog>
  </div>;
}
