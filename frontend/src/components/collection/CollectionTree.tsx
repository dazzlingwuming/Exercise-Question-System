import { ChevronDown, ChevronRight, Folder, FolderOpen, MoreHorizontal, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { ROOT_COLLECTION_ID, UNFILED_COLLECTION_ID, type CollectionNode } from "../../types/collection";

export type CollectionAction = "create" | "rename" | "move" | "merge" | "delete";
type Props = {
  tree: CollectionNode[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAction: (action: CollectionAction, node: CollectionNode | null) => void;
  onDropCollection?: (draggedId: string, targetId: string | null) => void;
  onDropQuestions?: (questionIds: string[], targetId: string | null) => void;
};

const STORAGE_KEY = "question-collection-tree-expanded";

export function CollectionTree({ tree, selectedId, onSelect, onAction, onDropCollection, onDropQuestions }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); } catch { return new Set(); }
  });
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify([...expanded])); }, [expanded]);
  const toggle = (id: string) => setExpanded((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const root = findRoot(tree);
  const topLevel = root ? root.children : tree;
  const receive = (event: React.DragEvent, targetId: string | null, acceptQuestions = true, acceptCollections = true) => {
    event.preventDefault();
    event.stopPropagation();
    const raw = event.dataTransfer.getData("application/x-question-ids");
    const collectionId = event.dataTransfer.getData("application/x-collection-id");
    if (raw && acceptQuestions) { try { onDropQuestions?.(JSON.parse(raw) as string[], targetId); } catch { /* invalid drag payload */ } }
    else if (collectionId && acceptCollections && collectionId !== targetId) onDropCollection?.(collectionId, targetId);
  };
  return <aside className="collection-tree panel rounded-lg p-3">
    <div className="mb-2 flex items-center justify-between gap-2"><div className="font-semibold">集合</div><button type="button" className="rounded-md border border-line bg-white p-1.5" title="新建根集合" onClick={() => onAction("create", null)}><Plus className="h-4 w-4" /></button></div>
    {root && <button type="button" className={`collection-tree__row ${selectedId === ROOT_COLLECTION_ID ? "is-selected" : ""}`} onClick={() => onSelect(ROOT_COLLECTION_ID)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => receive(event, ROOT_COLLECTION_ID, false, true)}><FolderOpen className="h-4 w-4" /><span className="truncate">全部题库</span><span className="ml-auto text-xs text-muted">{root.total_question_count}</span></button>}
    <div className="mt-1 space-y-0.5">{topLevel.map((node) => <TreeNode key={node.id} node={node} depth={0} selectedId={selectedId} expanded={expanded} toggle={toggle} onSelect={onSelect} onAction={onAction} receive={receive} />)}</div>
  </aside>;
}

function TreeNode({ node, depth, selectedId, expanded, toggle, onSelect, onAction, receive }: { node: CollectionNode; depth: number; selectedId: string | null; expanded: Set<string>; toggle: (id: string) => void; onSelect: (id: string) => void; onAction: (action: CollectionAction, node: CollectionNode) => void; receive: (event: React.DragEvent, targetId: string | null, acceptQuestions?: boolean, acceptCollections?: boolean) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  return <div>
    <div className={`collection-tree__row group ${selectedId === node.id ? "is-selected" : ""}`} style={{ paddingLeft: `${8 + depth * 16}px` }} draggable={!node.is_system} onDragStart={(event) => event.dataTransfer.setData("application/x-collection-id", node.id)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => receive(event, node.id, true, node.id !== UNFILED_COLLECTION_ID)}>
      <button type="button" className="collection-tree__chevron" aria-label={isExpanded ? "收起" : "展开"} onClick={() => hasChildren && toggle(node.id)}>{hasChildren ? (isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : <span />}</button>
      <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => onSelect(node.id)}>{hasChildren && isExpanded ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}<span className="truncate">{node.name}</span><span className="ml-auto text-xs text-muted">{node.total_question_count}</span></button>
      {!node.is_system && <div className="relative"><button type="button" className="collection-tree__more" aria-label={`${node.name} 操作`} onClick={() => setMenuOpen((value) => !value)}><MoreHorizontal className="h-4 w-4" /></button>{menuOpen && <div className="collection-tree__menu">{(["create", "rename", "move", "merge", "delete"] as CollectionAction[]).map((action) => <button type="button" key={action} onClick={() => { setMenuOpen(false); onAction(action, node); }}>{({ create: "新建子集合", rename: "重命名", move: "移动到…", merge: "合并到…", delete: "删除" })[action]}</button>)}</div>}</div>}
    </div>
    {hasChildren && isExpanded && <div>{node.children.map((child) => <TreeNode key={child.id} node={child} depth={depth + 1} selectedId={selectedId} expanded={expanded} toggle={toggle} onSelect={onSelect} onAction={onAction} receive={receive} />)}</div>}
  </div>;
}

function findRoot(tree: CollectionNode[]): CollectionNode | null {
  for (const node of tree) {
    if (node.id === ROOT_COLLECTION_ID) return node;
    const nested = findRoot(node.children);
    if (nested) return nested;
  }
  return null;
}
