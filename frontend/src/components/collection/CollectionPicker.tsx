import { ChevronDown, Folder, FolderOpen, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ROOT_COLLECTION_ID, UNFILED_COLLECTION_ID, type CollectionNode } from "../../types/collection";

type Props = {
  tree: CollectionNode[];
  value?: string | null;
  onChange?: (value: string | null) => void;
  /** Preferred reusable names for entry forms. */
  selectedId?: string | null;
  onSelect?: (value: string | null) => void;
  label?: string;
  allowUnfiled?: boolean;
  /** 兼容旧调用方：这里表示允许“未归类”，不是题库根目录。 */
  allowRoot?: boolean;
  includeSystemRoot?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
  excludeIds?: Set<string>;
  disabled?: boolean;
};

export function CollectionPicker({
  tree,
  value,
  onChange,
  selectedId,
  onSelect,
  label = "请选择集合",
  allowUnfiled,
  allowRoot,
  includeSystemRoot = false,
  allowEmpty = false,
  emptyLabel = "全部题库",
  excludeIds,
  disabled,
}: Props) {
  const currentValue = selectedId ?? value ?? null;
  const change = onSelect ?? onChange ?? (() => undefined);
  const canSelectUnfiled = allowUnfiled ?? allowRoot ?? true;
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const selected = useMemo(() => findNode(tree, currentValue), [tree, currentValue]);
  const selectableTree = useMemo(
    () => pickerRoots(tree, includeSystemRoot, canSelectUnfiled),
    [tree, includeSystemRoot, canSelectUnfiled],
  );
  const visibleTree = useMemo(
    () => keyword.trim() ? filterTree(selectableTree, keyword.trim().toLowerCase()) : selectableTree,
    [selectableTree, keyword],
  );
  const choose = (id: string | null) => { change(id); setOpen(false); setKeyword(""); };
  return (
    <div className="relative">
      <button type="button" disabled={disabled} onClick={() => setOpen((current) => !current)} className="collection-picker__button">
        <span className="min-w-0 truncate">{selected?.path || (allowEmpty && currentValue === null ? emptyLabel : label)}</span><ChevronDown className="h-4 w-4 shrink-0" />
      </button>
      {open && <div className="collection-picker__popover">
        <div className="flex items-center gap-2 border-b border-line p-2"><Search className="h-4 w-4 text-muted" /><input autoFocus className="min-w-0 flex-1 outline-none" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索集合" /><button type="button" onClick={() => setOpen(false)} aria-label="关闭"><X className="h-4 w-4" /></button></div>
        <div className="collection-picker__list">
          {allowEmpty && <button type="button" className={`collection-picker__row ${currentValue === null ? "is-selected" : ""}`} onClick={() => choose(null)}>{emptyLabel}</button>}
          {visibleTree.map((node) => <PickerNode key={node.id} node={node} depth={0} value={currentValue} onChoose={choose} excludeIds={excludeIds} />)}
          {!allowEmpty && visibleTree.length === 0 && <p className="p-3 text-sm text-muted">没有可选集合</p>}
        </div>
      </div>}
    </div>
  );
}

function PickerNode({ node, depth, value, onChoose, excludeIds }: { node: CollectionNode; depth: number; value: string | null; onChoose: (id: string) => void; excludeIds?: Set<string> }) {
  const excluded = node.is_deleted || excludeIds?.has(node.id);
  return <>
    <button type="button" disabled={excluded} className={`collection-picker__row ${value === node.id ? "is-selected" : ""}`} style={{ paddingLeft: `${12 + depth * 16}px` }} onClick={() => onChoose(node.id)}>
      {node.children.length ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}<span className="truncate">{node.name}</span>
    </button>
    {node.children.map((child) => <PickerNode key={child.id} node={child} depth={depth + 1} value={value} onChoose={onChoose} excludeIds={excludeIds} />)}
  </>;
}

export function findNode(tree: CollectionNode[], id: string | null): CollectionNode | null {
  if (!id) return null;
  for (const item of tree) { if (item.id === id) return item; const found = findNode(item.children, id); if (found) return found; }
  return null;
}

function filterTree(nodes: CollectionNode[], keyword: string): CollectionNode[] {
  return nodes.flatMap((node) => {
    const children = filterTree(node.children, keyword);
    return node.name.toLowerCase().includes(keyword) || node.path.toLowerCase().includes(keyword) || children.length ? [{ ...node, children }] : [];
  });
}

function pickerRoots(tree: CollectionNode[], includeSystemRoot: boolean, includeUnfiled: boolean): CollectionNode[] {
  const root = findNode(tree, ROOT_COLLECTION_ID);
  const roots = root ? (includeSystemRoot ? [root] : root.children) : tree;
  return filterSelectable(roots, includeUnfiled, includeSystemRoot);
}

function filterSelectable(nodes: CollectionNode[], includeUnfiled: boolean, includeSystemRoot: boolean): CollectionNode[] {
  return nodes.flatMap((node) => {
    if (node.id === UNFILED_COLLECTION_ID && !includeUnfiled) return [];
    if (node.id === ROOT_COLLECTION_ID && !includeSystemRoot) return filterSelectable(node.children, includeUnfiled, includeSystemRoot);
    return [{ ...node, children: filterSelectable(node.children, includeUnfiled, includeSystemRoot) }];
  });
}
