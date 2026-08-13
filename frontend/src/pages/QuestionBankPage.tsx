import { FolderInput, GripVertical, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { recommendCollectionPlacements } from "../api/ai";
import { createCollection, deleteCollection, getCollectionTree, mergeCollection, moveCollection, updateCollection } from "../api/collections";
import { bulkMoveQuestions, deleteQuestion, getFilterOptions, listQuestions } from "../api/questions";
import { Badge } from "../components/common/Badge";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { CollectionDialog } from "../components/collection/CollectionDialog";
import { CollectionPicker, findNode } from "../components/collection/CollectionPicker";
import { CollectionTree, type CollectionAction } from "../components/collection/CollectionTree";
import { RichContent } from "../components/content/RichContent";
import { DeleteQuestionDialog } from "../components/question/DeleteQuestionDialog";
import { ROOT_COLLECTION_ID, UNFILED_COLLECTION_ID, type CollectionNode } from "../types/collection";
import type { FilterOptions, Question } from "../types/question";
import { aiConfigForRole, loadStoredAiConfig } from "../utils/aiConfigStorage";

type OrganizeProposal = {
  question: Question;
  collectionId: string;
  confidence: number;
  reason: string;
};

export function QuestionBankPage() {
  const [items, setItems] = useState<Question[]>([]);
  const [tree, setTree] = useState<CollectionNode[]>([]);
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [tag, setTag] = useState("");
  const [examPoint, setExamPoint] = useState("");
  const [direction, setDirection] = useState("");
  const [collectionId, setCollectionId] = useState<string>(ROOT_COLLECTION_ID);
  const [includeDescendants, setIncludeDescendants] = useState(true);
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Question | null>(null);
  const [collectionAction, setCollectionAction] = useState<CollectionAction | null>(null);
  const [actionNode, setActionNode] = useState<CollectionNode | null>(null);
  const [organizeProposals, setOrganizeProposals] = useState<OrganizeProposal[]>([]);
  const [organizeLoading, setOrganizeLoading] = useState(false);
  const [error, setError] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const current = useMemo(() => findNode(tree, collectionId), [tree, collectionId]);

  const loadTree = async () => {
    try {
      setTree(await getCollectionTree());
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const load = async (collectionOverride?: string) => {
    const resolvedCollectionId = collectionOverride ?? collectionId;
    const resolvedCollection = findNode(tree, resolvedCollectionId);
    try {
      const response = await listQuestions({
        keyword,
        type,
        difficulty,
        tag,
        exam_point: examPoint,
        direction,
        collection_id: resolvedCollectionId,
        include_descendants: resolvedCollection?.children.length ? includeDescendants : true,
        page_size: 100,
      });
      setItems(response.items);
      setSelected(new Set());
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    void loadTree();
    getFilterOptions().then(setFilterOptions).catch(() => undefined);
  }, []);

  useEffect(() => {
    void load();
  }, [keyword, type, difficulty, tag, examPoint, direction, collectionId, includeDescendants]);

  const selectCollection = (id: string | null) => {
    setCollectionId(id ?? ROOT_COLLECTION_ID);
    setMobileTreeOpen(false);
  };

  const invokeAction = (action: CollectionAction, node: CollectionNode | null) => {
    setCollectionAction(action);
    setActionNode(node);
    setDialogError("");
  };

  async function submitCollectionAction(data: { name?: string; description?: string; targetId?: string | null; reason?: string }) {
    setBusy(true);
    setDialogError("");
    try {
      if (collectionAction === "create") await createCollection({ name: data.name || "", parent_id: actionNode?.id ?? ROOT_COLLECTION_ID, description: data.description });
      if (collectionAction === "rename" && actionNode) await updateCollection(actionNode.id, { name: data.name, description: data.description });
      if (collectionAction === "move" && actionNode) await moveCollection(actionNode.id, data.targetId ?? ROOT_COLLECTION_ID);
      if (collectionAction === "merge" && actionNode && data.targetId) await mergeCollection(actionNode.id, data.targetId);
      if (collectionAction === "delete" && actionNode) await deleteCollection(actionNode.id, { reason: data.reason });
      const resetToRoot = Boolean(
        actionNode
        && (
          (collectionAction === "merge" && actionNode.id === collectionId)
          || (collectionAction === "delete" && collectionContains(actionNode, collectionId))
        )
      );
      const nextCollectionId = resetToRoot ? ROOT_COLLECTION_ID : collectionId;
      setNotice("集合已更新。");
      setCollectionAction(null);
      setActionNode(null);
      if (resetToRoot) setCollectionId(ROOT_COLLECTION_ID);
      await loadTree();
      await load(nextCollectionId);
    } catch (err) {
      setDialogError((err as Error).message);
      await loadTree();
    } finally {
      setBusy(false);
    }
  }

  async function moveQuestions(questionIds: string[], targetId: string | null) {
    if (!questionIds.length || !targetId || targetId === ROOT_COLLECTION_ID) {
      setError("请选择具体集合或未归类。");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await bulkMoveQuestions(questionIds.map((question_id) => ({ question_id, collection_id: targetId })));
      setNotice(`已移动 ${result.moved_count ?? questionIds.length} 道题。`);
      setMoveOpen(false);
      await loadTree();
      await load();
    } catch (err) {
      setError((err as Error).message);
      await loadTree();
    } finally {
      setBusy(false);
    }
  }

  async function moveCollectionByDrop(id: string, target: string | null) {
    try {
      await moveCollection(id, target ?? ROOT_COLLECTION_ID);
      setNotice("集合已移动。");
      await loadTree();
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function recommendOrganization(targets: Question[]) {
    if (!targets.length) return;
    const limited = targets.slice(0, 20);
    setOrganizeLoading(true);
    setError("");
    try {
      const response = await recommendCollectionPlacements({
        ...aiConfigForRole(loadStoredAiConfig(), "generation"),
        questions: limited.map((question) => ({
          reference_id: question.id,
          type: question.type,
          stem: question.stem,
          material: question.material,
          tags: question.tags,
          directions: question.directions,
          exam_points: question.exam_points,
          current_collection_id: question.collection_id,
        })),
      });
      const byId = new Map(response.items.map((item) => [item.reference_id, item]));
      setOrganizeProposals(limited.flatMap((question) => {
        const proposal = byId.get(question.id);
        return proposal ? [{ question, collectionId: proposal.recommended_collection_id, confidence: proposal.confidence, reason: proposal.reason }] : [];
      }));
      if (targets.length > limited.length) setNotice(`一次最多整理 20 道题，本次先展示前 ${limited.length} 道。`);
    } catch (err) {
      setError(`AI 推荐失败：${(err as Error).message} 你仍可使用“移动到集合”人工整理。`);
    } finally {
      setOrganizeLoading(false);
    }
  }

  async function confirmOrganization() {
    if (!organizeProposals.length || organizeProposals.some((item) => !item.collectionId || item.collectionId === ROOT_COLLECTION_ID)) {
      setError("请为每道题确认具体集合或未归类。");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await bulkMoveQuestions(organizeProposals.map((item) => ({ question_id: item.question.id, collection_id: item.collectionId })));
      setNotice(`已按你确认的位置整理 ${organizeProposals.length} 道题。`);
      setOrganizeProposals([]);
      await loadTree();
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const selectedQuestions = items.filter((item) => selected.has(item.id));
  const draggedQuestions = (id: string) => selected.has(id) ? [...selected] : [id];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">题库</h1><p className="mt-1 text-sm text-muted">集合像文件夹一样组织题目；标签、考察点仍可跨集合筛选。</p></div>
        <div className="flex flex-wrap gap-2"><Link className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-3 text-sm text-white" to={`/questions/new?collection_id=${encodeURIComponent(collectionId === ROOT_COLLECTION_ID ? UNFILED_COLLECTION_ID : collectionId)}`}><Plus className="h-4 w-4" />新增题目</Link><Link className="inline-flex h-10 items-center rounded-md border border-line bg-white px-3 text-sm" to="/questions/deleted">回收站</Link></div>
      </div>
      {error && <ErrorState message={error} />}
      {notice && <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}
      <button type="button" className="collection-mobile-trigger md:hidden" onClick={() => setMobileTreeOpen(true)}>选择集合：{current?.path || "全部题库"}</button>
      {mobileTreeOpen && <div className="collection-mobile-sheet md:hidden"><div className="flex items-center justify-between"><h2 className="font-semibold">选择集合</h2><button type="button" onClick={() => setMobileTreeOpen(false)}><X className="h-5 w-5" /></button></div><div className="mt-3"><CollectionTree tree={tree} selectedId={collectionId} onSelect={selectCollection} onAction={invokeAction} onDropCollection={(id, target) => void moveCollectionByDrop(id, target)} onDropQuestions={(ids, target) => void moveQuestions(ids, target)} /></div></div>}
      <div className="grid gap-5 md:grid-cols-[280px_minmax(0,1fr)]">
        <div className="hidden md:block"><CollectionTree tree={tree} selectedId={collectionId} onSelect={selectCollection} onAction={invokeAction} onDropCollection={(id, target) => void moveCollectionByDrop(id, target)} onDropQuestions={(ids, target) => void moveQuestions(ids, target)} /></div>
        <section className="min-w-0 space-y-4">
          <div className="panel rounded-lg p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="text-lg font-semibold">{collectionId === ROOT_COLLECTION_ID ? "全部题库" : current?.path || "集合"}</h2>{current?.description && <p className="mt-1 text-sm text-muted">{current.description}</p>}<p className="mt-1 text-sm text-muted">{current ? `${current.total_question_count} 道题` : "正在读取集合…"}</p></div>
              <div className="flex flex-wrap gap-2">
                {collectionId === UNFILED_COLLECTION_ID && items.length > 0 && <button className="inline-flex items-center gap-2 rounded-md border border-accent px-3 py-2 text-sm text-accent" type="button" disabled={organizeLoading} onClick={() => void recommendOrganization(items)}><Sparkles className="h-4 w-4" />{organizeLoading ? "正在推荐…" : "AI 整理本页未归类题"}</button>}
                <Link className="rounded-md bg-accent px-3 py-2 text-sm text-white" to={collectionId === ROOT_COLLECTION_ID ? "/practice" : `/practice?collection_id=${encodeURIComponent(collectionId)}&include_descendants=${includeDescendants}`}>练习此集合</Link>
              </div>
            </div>
            {Boolean(current?.children.length) && <label className="mt-3 inline-flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={includeDescendants} onChange={(event) => setIncludeDescendants(event.target.checked)} />包含子集合题目（默认）</label>}
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="flex items-center gap-2 rounded-md border border-line bg-white px-3"><Search className="h-4 w-4 text-muted" /><input className="h-10 w-44 outline-none" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索题干" /></div>
              <FilterSelect value={type} onChange={setType} empty="全部题型" options={filterOptions?.types ?? []} />
              <FilterSelect value={difficulty} onChange={setDifficulty} empty="全部难度" options={filterOptions?.difficulties ?? []} />
              <FilterSelect value={tag} onChange={setTag} empty="全部标签" options={filterOptions?.tags ?? []} />
              <FilterSelect value={examPoint} onChange={setExamPoint} empty="全部考察点" options={filterOptions?.exam_points ?? []} />
              <FilterSelect value={direction} onChange={setDirection} empty="全部方向" options={filterOptions?.directions ?? []} />
            </div>
          </div>
          {selected.size > 0 && <div className="flex flex-wrap items-center gap-3 rounded-lg border border-accent/30 bg-emerald-50 p-3 text-sm"><span>已选 {selected.size} 道题</span><button type="button" className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-white" onClick={() => { setMoveTarget(selectedQuestions.length === 1 ? selectedQuestions[0].collection_id ?? null : null); setMoveOpen(true); }}><FolderInput className="h-4 w-4" />移动到集合</button><button type="button" className="inline-flex items-center gap-1 rounded-md border border-accent px-3 py-1.5 text-accent" disabled={organizeLoading} onClick={() => void recommendOrganization(selectedQuestions)}><Sparkles className="h-4 w-4" />AI 推荐位置</button><button type="button" onClick={() => setSelected(new Set())}>取消选择</button></div>}
          {items.length === 0 ? <EmptyState text="此集合范围内暂无题目。" /> : <div className="grid gap-3">{items.map((question) => <article key={question.id} className="panel rounded-lg p-4" draggable onDragStart={(event) => event.dataTransfer.setData("application/x-question-ids", JSON.stringify(draggedQuestions(question.id)))}><div className="flex gap-3"><input className="mt-1 h-4 w-4" type="checkbox" checked={selected.has(question.id)} onChange={(event) => setSelected((currentSet) => { const next = new Set(currentSet); event.target.checked ? next.add(question.id) : next.delete(question.id); return next; })} /><GripVertical className="mt-1 h-4 w-4 shrink-0 text-muted" /><div className="min-w-0 flex-1"><div className="mb-2 flex flex-wrap gap-2"><Badge tone="accent">{question.type_label}</Badge><Badge>v{question.version}</Badge>{question.collection_path && <Badge>{`集合：${question.collection_path}`}</Badge>}{question.difficulty && <Badge>{question.difficulty}</Badge>}</div><RichContent content={question.stem} className="font-medium leading-7" /><div className="mt-3 flex flex-wrap gap-2"><Link className="rounded-md border border-line bg-white px-3 py-1.5 text-sm" to={`/questions/${question.id}`}>详情</Link><Link className="rounded-md bg-accent px-3 py-1.5 text-sm text-white" to={`/questions/${question.id}/edit`}>编辑</Link><button type="button" className="rounded-md border border-line bg-white px-3 py-1.5 text-sm" onClick={() => { setSelected(new Set([question.id])); setMoveTarget(question.collection_id ?? null); setMoveOpen(true); }}>移动到…</button><button className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700" onClick={() => setDeleting(question)}><Trash2 className="h-4 w-4" />删除</button></div></div></div></article>)}</div>}
        </section>
      </div>
      <CollectionDialog action={collectionAction} node={actionNode} tree={tree} error={dialogError} busy={busy} onClose={() => { setCollectionAction(null); setActionNode(null); }} onSubmit={(data) => void submitCollectionAction(data)} />
      {moveOpen && <MoveQuestionsDialog count={selected.size} tree={tree} target={moveTarget} busy={busy} onTarget={setMoveTarget} onClose={() => setMoveOpen(false)} onConfirm={() => void moveQuestions([...selected], moveTarget)} />}
      {organizeProposals.length > 0 && <OrganizeDialog proposals={organizeProposals} tree={tree} busy={busy} onChange={(questionId, targetId) => setOrganizeProposals((currentItems) => currentItems.map((item) => item.question.id === questionId && targetId ? { ...item, collectionId: targetId } : item))} onClose={() => setOrganizeProposals([])} onConfirm={() => void confirmOrganization()} />}
      <DeleteQuestionDialog open={Boolean(deleting)} onCancel={() => setDeleting(null)} onConfirm={async (reason) => { if (!deleting) return; try { await deleteQuestion(deleting.id, { reason }); setDeleting(null); await loadTree(); await load(); } catch (err) { setError((err as Error).message); } }} />
    </div>
  );
}

function MoveQuestionsDialog({ count, tree, target, busy, onTarget, onClose, onConfirm }: { count: number; tree: CollectionNode[]; target: string | null; busy: boolean; onTarget: (id: string | null) => void; onClose: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"><section className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl"><h2 className="text-lg font-semibold">移动 {count} 道题</h2><p className="mt-2 text-sm text-muted">选择具体集合或“未归类”。移动只改变归档位置，不增加题目内容版本。</p><div className="mt-4"><CollectionPicker tree={tree} selectedId={target} onSelect={onTarget} allowUnfiled label="请选择目标集合" /></div><div className="mt-5 flex justify-end gap-2"><button type="button" className="rounded-md border border-line bg-white px-4 py-2 text-sm" onClick={onClose}>取消</button><button type="button" className="rounded-md bg-accent px-4 py-2 text-sm text-white disabled:opacity-50" disabled={busy || !target || target === ROOT_COLLECTION_ID} onClick={onConfirm}>确认移动</button></div></section></div>;
}

function OrganizeDialog({ proposals, tree, busy, onChange, onClose, onConfirm }: { proposals: OrganizeProposal[]; tree: CollectionNode[]; busy: boolean; onChange: (questionId: string, targetId: string | null) => void; onClose: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"><section className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl"><h2 className="text-lg font-semibold">确认 AI 归档建议</h2><p className="mt-2 text-sm leading-6 text-muted">AI 只提供建议，不会自动移动题目。请逐题检查或改选集合，最后统一确认。</p><div className="mt-4 space-y-3">{proposals.map((item) => <article key={item.question.id} className="rounded-md border border-line p-3"><RichContent content={item.question.stem} className="max-h-20 overflow-hidden text-sm font-medium" /><div className="mt-2 text-xs leading-5 text-muted">置信度 {Math.round(item.confidence * 100)}% · {item.reason}</div><div className="mt-3"><CollectionPicker tree={tree} selectedId={item.collectionId} onSelect={(id) => onChange(item.question.id, id)} allowUnfiled /></div></article>)}</div><div className="mt-5 flex justify-end gap-2"><button type="button" className="rounded-md border border-line bg-white px-4 py-2 text-sm" onClick={onClose}>取消</button><button type="button" className="rounded-md bg-accent px-4 py-2 text-sm text-white disabled:opacity-50" disabled={busy} onClick={onConfirm}>{busy ? "正在移动…" : `确认并移动 ${proposals.length} 道题`}</button></div></section></div>;
}

function FilterSelect({ value, onChange, empty, options }: { value: string; onChange: (value: string) => void; empty: string; options: string[] }) {
  return <select className="h-10 rounded-md border border-line bg-white px-3" value={value} onChange={(event) => onChange(event.target.value)}><option value="">{empty}</option>{options.map((item) => <option key={item} value={item}>{item}</option>)}</select>;
}

function collectionContains(node: CollectionNode, collectionId: string): boolean {
  return node.id === collectionId || node.children.some((child) => collectionContains(child, collectionId));
}
