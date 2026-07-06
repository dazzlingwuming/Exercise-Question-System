import { RotateCcw, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getFilterOptions, listDeletedQuestions, restoreDeletedQuestion } from "../api/questions";
import { Badge } from "../components/common/Badge";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import type { FilterOptions, Question } from "../types/question";

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
  }, []);

  useEffect(() => {
    load();
  }, [keyword, type, difficulty, examPoint, direction, page]);

  async function restore(question: Question) {
    const reason = window.prompt("请输入恢复原因", "误删，恢复题目");
    if (!reason) return;
    await restoreDeletedQuestion(question.id, { reason });
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">题目回收站</h1>
          <p className="mt-1 text-sm text-muted">已删除题目默认不进入练习、错题和统计。</p>
        </div>
        <Link className="rounded-md border border-line bg-white px-3 py-2 text-sm" to="/questions">返回题库</Link>
      </div>
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
      {error && <ErrorState message={error} />}
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
              <h2 className="line-clamp-2 font-medium leading-7">{question.stem}</h2>
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
