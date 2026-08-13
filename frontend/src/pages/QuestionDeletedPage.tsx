import { Folder, RotateCcw, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDeletedCollections, getCollectionTree, restoreCollection } from "../api/collections";
import { getFilterOptions, listDeletedQuestions, restoreDeletedQuestion } from "../api/questions";
import { Badge } from "../components/common/Badge";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { RichContent } from "../components/content/RichContent";
import type { FilterOptions, Question } from "../types/question";
import { UNFILED_COLLECTION_ID, type CollectionNode } from "../types/collection";
import { CollectionPicker, findNode } from "../components/collection/CollectionPicker";

export function QuestionDeletedPage() {
  const [items, setItems] = useState<Question[]>([]);
  const [filters, setFilters] = useState<FilterOptions | null>(null);
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [examPoint, setExamPoint] = useState("");
  const [direction, setDirection] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"questions" | "collections">("questions");
  const [deletedCollections, setDeletedCollections] = useState<CollectionNode[]>([]);
  const [collectionTree, setCollectionTree] = useState<CollectionNode[]>([]);
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
  const [restoringQuestion, setRestoringQuestion] = useState<Question | null>(null);

  const load = () => {
    listDeletedQuestions({ keyword, type, difficulty, exam_point: examPoint, direction, page, page_size: 20 })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    getFilterOptions().then(setFilters).catch(() => undefined);
    getCollectionTree().then(setCollectionTree).catch(() => undefined);
    getDeletedCollections().then(setDeletedCollections).catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
  }, [keyword, type, difficulty, examPoint, direction, page]);

  async function restore(question: Question) {
    setRestoringQuestion(question);
    setRestoreTarget(findNode(collectionTree, question.collection_id ?? null) ? question.collection_id ?? UNFILED_COLLECTION_ID : UNFILED_COLLECTION_ID);
  }

  async function confirmRestoreQuestion() {
    if (!restoringQuestion) return;
    const reason = window.prompt("请输入恢复原因", "误删，恢复题目");
    if (!reason) return;
    try { await restoreDeletedQuestion(restoringQuestion.id, { reason, target_collection_id: restoreTarget }); setRestoringQuestion(null); load(); } catch (err) { setError((err as Error).message); }
  }

  async function restoreDeletedCollection(item: CollectionNode) {
    if (!item.deletion_id) {
      setError(`集合“${item.name}”缺少删除记录，暂时无法恢复。`);
      return;
    }
    try { await restoreCollection(item.deletion_id); setDeletedCollections(await getDeletedCollections()); setCollectionTree(await getCollectionTree()); } catch (err) { setError((err as Error).message); }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">题目回收站</h1>
          <p className="mt-1 text-sm text-muted">已删除题目和集合默认不进入练习、错题和统计。</p>
        </div>
        <Link className="rounded-md border border-line bg-white px-3 py-2 text-sm" to="/questions">返回题库</Link>
      </div>
      <div className="flex gap-2 border-b border-line"><button className={`px-3 py-2 text-sm ${tab === "questions" ? "border-b-2 border-accent text-accent" : "text-muted"}`} onClick={() => setTab("questions")}>题目 ({total})</button><button className={`px-3 py-2 text-sm ${tab === "collections" ? "border-b-2 border-accent text-accent" : "text-muted"}`} onClick={() => setTab("collections")}>集合 ({deletedCollections.length})</button></div>
      {error && <ErrorState message={error} />}
      {tab === "collections" ? <>
        {deletedCollections.length === 0 ? <EmptyState text="集合回收站为空。" /> : <div className="grid gap-3">{deletedCollections.map((item) => <article className="panel rounded-lg p-4" key={item.id}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><Folder className="h-4 w-4 text-muted" /><h2 className="truncate font-medium">{item.name}</h2></div><p className="mt-1 text-sm text-muted">原路径：{item.path} · 共 {item.total_question_count} 道题</p>{item.description && <p className="mt-1 text-sm text-muted">{item.description}</p>}</div><button title={item.deletion_id ? "恢复整棵集合" : "缺少删除记录，无法恢复"} disabled={!item.deletion_id} className="inline-flex shrink-0 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => void restoreDeletedCollection(item)}><RotateCcw className="h-4 w-4" />{item.deletion_id ? "恢复整棵集合" : "恢复记录缺失"}</button></div></article>)}</div>}
      </> : <>
      <section className="panel rounded-lg p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="flex items-center gap-2 rounded-md border border-line bg-white px-3">
            <Search className="h-4 w-4 text-muted" />
            <input className="h-10 min-w-0 outline-none" value={keyword} onChange={(event) => { setPage(1); setKeyword(event.target.value); }} placeholder="搜索题干" />
          </div>
          <Select value={type} onChange={(value) => { setPage(1); setType(value); }} empty="全部题型" options={filters?.types ?? []} />
          <Select value={difficulty} onChange={(value) => { setPage(1); setDifficulty(value); }} empty="全部难度" options={filters?.difficulties ?? []} />
          <Select value={examPoint} onChange={(value) => { setPage(1); setExamPoint(value); }} empty="全部考察点" options={filters?.exam_points ?? []} />
          <Select value={direction} onChange={(value) => { setPage(1); setDirection(value); }} empty="全部方向" options={filters?.directions ?? []} />
        </div>
      </section>
      {items.length === 0 ? (
        <EmptyState text="回收站暂无题目。" />
      ) : (
        <div className="grid gap-3">
          {items.map((question) => (
            <article className="panel rounded-lg p-4" key={question.id}>
              <div className="mb-2 flex flex-wrap gap-2">
                <Badge tone="bad">已删除</Badge>
                <Badge tone="accent">{question.type_label}</Badge>
                {question.difficulty && <Badge>{question.difficulty}</Badge>}
                {question.directions.slice(0, 3).map((item) => <Badge key={item}>{item}</Badge>)}
              </div>
              <RichContent content={question.stem} className="max-h-16 overflow-hidden font-medium leading-7" />
              <div className="mt-2 text-sm text-muted">
                删除时间：{question.deleted_at ? new Date(question.deleted_at).toLocaleString() : "-"} · 删除原因：{question.delete_reason || "-"}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link className="rounded-md border border-line bg-white px-3 py-1.5 text-sm" to={`/questions/${question.id}`}>查看详情</Link>
                <button className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700" onClick={() => restore(question)}>
                  <RotateCcw className="h-4 w-4" />
                  恢复题目
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted">共 {total} 道已删除题目</div>
        <div className="flex gap-2">
          <button className="rounded-md border border-line bg-white px-3 py-2 text-sm" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>上一页</button>
          <button className="rounded-md border border-line bg-white px-3 py-2 text-sm" disabled={page * 20 >= total} onClick={() => setPage((value) => value + 1)}>下一页</button>
        </div>
      </div>
      </>}
      {restoringQuestion && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"><section className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl"><h2 className="text-lg font-semibold">恢复题目</h2><p className="mt-2 text-sm text-muted">若原集合已不存在，系统已预选“未归类”；你也可以改选其他集合。</p><div className="mt-4"><CollectionPicker tree={collectionTree} selectedId={restoreTarget} onSelect={setRestoreTarget} allowUnfiled label="请选择恢复位置" /></div><div className="mt-5 flex justify-end gap-2"><button className="rounded-md border border-line bg-white px-4 py-2 text-sm" onClick={() => setRestoringQuestion(null)}>取消</button><button disabled={!restoreTarget} className="rounded-md bg-accent px-4 py-2 text-sm text-white disabled:opacity-50" onClick={() => void confirmRestoreQuestion()}>恢复题目</button></div></section></div>}
    </div>
  );
}

function Select({ value, onChange, options, empty }: { value: string; onChange: (value: string) => void; options: string[]; empty: string }) {
  return (
    <select className="rounded-md border border-line bg-white px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{empty}</option>
      {options.map((item) => <option key={item} value={item}>{item}</option>)}
    </select>
  );
}
