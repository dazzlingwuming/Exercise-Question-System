import { useEffect, useMemo, useState } from "react";
import { ROOT_COLLECTION_ID, UNFILED_COLLECTION_ID, type CollectionNode } from "../../types/collection";
import { CollectionPicker } from "./CollectionPicker";
import type { CollectionAction } from "./CollectionTree";

export function CollectionDialog({ action, node, tree, error, busy, onClose, onSubmit }: { action: CollectionAction | null; node: CollectionNode | null; tree: CollectionNode[]; error: string; busy: boolean; onClose: () => void; onSubmit: (data: { name?: string; description?: string; targetId?: string | null; reason?: string }) => void }) {
  const [name, setName] = useState(node?.name ?? "");
  const [description, setDescription] = useState(node?.description ?? "");
  const [targetId, setTargetId] = useState<string | null>(node?.parent_id ?? ROOT_COLLECTION_ID);
  const [reason, setReason] = useState("");
  const excluded = useMemo(() => new Set(node ? subtreeIds(node) : []), [node]);
  const moveExcluded = useMemo(() => new Set([...excluded, UNFILED_COLLECTION_ID]), [excluded]);
  const mergeExcluded = useMemo(() => new Set([...excluded, ROOT_COLLECTION_ID, UNFILED_COLLECTION_ID]), [excluded]);
  useEffect(() => {
    setName(node?.name ?? "");
    setDescription(node?.description ?? "");
    setTargetId(action === "move" ? (node?.parent_id ?? ROOT_COLLECTION_ID) : null);
    setReason("");
  }, [action, node]);
  if (!action) return null;
  const title = ({ create: node ? `在“${node.name}”中新建集合` : "新建根集合", rename: "重命名集合", move: "移动集合", merge: "合并集合", delete: "删除集合" })[action];
  const submit = () => onSubmit({
    name: name.trim(),
    description: action === "create" || action === "rename" ? description.trim() : undefined,
    targetId,
    reason: reason.trim() || undefined,
  });
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"><section className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl"><h2 className="text-lg font-semibold">{title}</h2>
    {error && <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {(action === "create" || action === "rename") && <><label className="mt-4 block text-sm text-muted">名称<input autoFocus className="mt-1 w-full rounded-md border border-line px-3 py-2 text-ink" value={name} onChange={(event) => setName(event.target.value)} /></label><label className="mt-3 block text-sm text-muted">收录范围说明（可选）<textarea className="mt-1 min-h-20 w-full rounded-md border border-line px-3 py-2 text-ink" value={description} onChange={(event) => setDescription(event.target.value)} /></label>{!description.trim() && <p className="mt-2 text-xs leading-5 text-amber-700">可以留空，但填写“这个集合收什么题”会提高 AI 归档推荐的准确度。</p>}</>}
    {action === "move" && <><p className="mt-2 text-sm text-muted">选择“{node?.name}”的新父集合。不能移动到自身、子集合或未归类。</p><div className="mt-4"><CollectionPicker tree={tree} value={targetId} onChange={setTargetId} allowUnfiled={false} includeSystemRoot excludeIds={moveExcluded} /></div></>}
    {action === "merge" && <><p className="mt-2 text-sm leading-6 text-amber-800">“{node?.name}”中的题目和子集合会递归并入目标集合，源集合随后移除。题目内容和历史记录不会删除。</p><div className="mt-4"><CollectionPicker tree={tree} value={targetId} onChange={setTargetId} allowUnfiled={false} excludeIds={mergeExcluded} /></div></>}
    {action === "delete" && <><p className="mt-2 text-sm leading-6 text-red-700">整个子树及其中当前未删除的题目会一起移入回收站；之后可按本次删除记录精确恢复。</p><label className="mt-4 block text-sm text-muted">删除原因（可选）<textarea className="mt-1 min-h-20 w-full rounded-md border border-line px-3 py-2 text-ink" value={reason} onChange={(event) => setReason(event.target.value)} /></label></>}
    <div className="mt-5 flex justify-end gap-2"><button type="button" className="rounded-md border border-line bg-white px-4 py-2 text-sm" onClick={onClose} disabled={busy}>取消</button><button type="button" className={`rounded-md px-4 py-2 text-sm text-white ${action === "delete" || action === "merge" ? "bg-red-600" : "bg-accent"}`} onClick={submit} disabled={busy || ((action === "create" || action === "rename") && !name.trim()) || ((action === "move" || action === "merge") && !targetId)}>{busy ? "处理中…" : action === "merge" ? "合并并删除源集合" : action === "delete" ? "确认删除" : "保存"}</button></div>
  </section></div>;
}

function subtreeIds(node: CollectionNode): string[] { return [node.id, ...node.children.flatMap(subtreeIds)]; }
