import { useCallback, useEffect, useRef, useState } from "react";
import { createConversation, getConversation, getConversationStatus, streamStudio, type Connection, type ConversationDetail, type StudioMode } from "../../api/studio";

export function useStudioChat(id: string | null, onCreated: (id: string) => void) {
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [trimmed, setTrimmed] = useState(false);
  const [revision, setRevision] = useState(0);
  const currentId = useRef<string | null>(null);
  const operation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const alive = useRef(true);
  const created = useRef(onCreated); created.current = onCreated;

  useEffect(() => { alive.current = true; return () => { alive.current = false; controller.current?.abort(); }; }, []);
  useEffect(() => {
    if (currentId.current === id) return;
    const version = ++operation.current;
    controller.current?.abort(); controller.current = null;
    currentId.current = id; setConversation(null); setError(""); setTrimmed(false); setSending(false);
    if (!id) { setLoading(false); return; }
    setLoading(true);
    getConversation(id).then(value => { if (alive.current && operation.current === version) setConversation(value); })
      .catch(err => { if (alive.current && operation.current === version) setError(err.message); })
      .finally(() => { if (alive.current && operation.current === version) setLoading(false); });
  }, [id]);
  // A stopped request may still be committing, or another tab owns the generation.
  useEffect(() => {
    if (!conversation?.busy || sending) return;
    const cid = conversation.id;
    let pending = false, active = true;
    const timer = window.setInterval(async () => {
      if (pending) return;
      pending = true;
      try {
        const status = await getConversationStatus(cid);
        if (!status.busy && active && currentId.current === cid) {
          const value = await getConversation(cid);
          if (alive.current && active && currentId.current === cid) setConversation(value);
        }
      } catch { /* Keep the current content if the connection is temporarily unavailable. */ }
      finally { pending = false; }
    }, 1500);
    return () => { active = false; window.clearInterval(timer); };
  }, [conversation?.id, conversation?.busy, sending]);

  const send = useCallback(async (connection: Connection, mode: StudioMode, content: string, imageIds: string[], onAccepted: (id: string) => void, retryId?: string) => {
    if (controller.current || loading || conversation?.busy) return;
    const version = ++operation.current;
    const abort = new AbortController(); controller.current = abort;
    setSending(true); setError("");
    let cid = currentId.current;
    const live = () => alive.current && operation.current === version;
    try {
      if (!cid) {
        const fresh = await createConversation(mode);
        if (!live() || abort.signal.aborted) return;
        cid = fresh.id; currentId.current = cid; setConversation(fresh); created.current(cid);
      }
      const activeId = cid;
      let answerId = "";
      await streamStudio(cid, { connection, ...(retryId ? { retry_message_id: retryId } : { content, image_ids: imageIds }) }, abort.signal, event => {
        if (!live()) return;
        if (event.event === "start") {
          answerId = event.data.message_id; setTrimmed(event.data.history_trimmed);
          setConversation(previous => previous ? { ...previous, busy: true, messages: [...previous.messages.filter(row => !event.data.turn.some(item => item.id === row.id)), ...event.data.turn] } : previous);
          if (!retryId) onAccepted(activeId);
          setRevision(value => value + 1);
        } else if (event.event === "delta") {
          setConversation(previous => previous ? { ...previous, messages: previous.messages.map(row => row.id === answerId ? { ...row, content: row.content + event.data.content } : row) } : previous);
        } else if (event.event === "error") setError(event.data.message);
      });
    } catch (err) {
      if (live() && !abort.signal.aborted) setError((err as Error).message);
    } finally {
      if (live()) {
        if (cid) {
          try { const value = await getConversation(cid); if (live()) setConversation(value); }
          catch { if (live()) setError("无法刷新讨论。请检查网络后重新打开，已接收的内容仍在当前页面。"); }
        }
        if (live()) { controller.current = null; setSending(false); setRevision(value => value + 1); }
      }
    }
  }, [loading, conversation?.busy]);

  return { conversation, setConversation, loading, sending, error, setError, trimmed, revision, send, stop: () => controller.current?.abort() };
}
