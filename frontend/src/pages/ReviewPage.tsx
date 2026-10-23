import { BookOpen, Edit3, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { listWrongAttempts } from "../api/attempts";
import { deleteQuestion, getFilterOptions } from "../api/questions";
import { Badge } from "../components/common/Badge";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { RichContent } from "../components/content/RichContent";
import { DeleteQuestionDialog } from "../components/question/DeleteQuestionDialog";
import type { WrongAttempt } from "../types/attempt";
import type { FilterOptions, Question } from "../types/question";

import { LoadingState } from "../components/common/LoadingState";
import { PageHeader } from "../components/common/PageHeader";

export function ReviewPage() {
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}`;
  const sequence = useRef(0);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [items, setItems] = useState<WrongAttempt[]>([]);
  const [filters, setFilters] = useState<FilterOptions | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [type, setType] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [examPoint, setExamPoint] = useState("");
  const [direction, setDirection] = useState("");
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState("latest_wrong");
  const [deleting, setDeleting] = useState<Question | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getFilterOptions().then(setFilters).catch(() => undefined);
  }, []);

  const load = () => {
    const current = ++sequence.current; setLoading(true); setError("");
    listWrongAttempts({ page, page_size: 10, type, difficulty, exam_point: examPoint, direction, keyword: searchKeyword, sort })
      .then((response) => {
        if (current !== sequence.current) return;
        if (response.items.length === 0 && page > 1) { setPage(Math.max(1, Math.ceil(response.total / 10))); return; }
        setItems(response.items);
        setTotal(response.total);
        setHasNext(response.has_next);
      })
      .catch((err) => { if (current === sequence.current) setError(err.message); })
      .finally(() => { if (current === sequence.current) setLoading(false); });
  };

  useEffect(() => { const timer = setTimeout(() => setSearchKeyword(keyword), 220); return () => clearTimeout(timer); }, [keyword]);
  useEffect(() => { setPage(1); }, [type, difficulty, examPoint, direction, searchKeyword, sort]);
  useEffect(() => { load(); return () => { sequence.current += 1; }; }, [page, type, difficulty, examPoint, direction, searchKeyword, sort]);

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="A LITTLE BETTER EACH TIME" title="把错题变成进步" description="回看没掌握的地方，下一次就会更有把握。" />
      <section className="panel p-4">
        <div className="grid gap-3 md:grid-cols-6">
          <input aria-label="搜索错题题干" className="rounded-md border border-line px-3 py-2" value={keyword} onChange={(event) => { setPage(1); setKeyword(event.target.value); }} placeholder="搜索题干" />
          <Select value={type} onChange={setType} empty="全部题型" options={filters?.types ?? []} />
          <Select value={difficulty} onChange={setDifficulty} empty="全部难度" options={filters?.difficulties ?? []} />
          <Select value={examPoint} onChange={setExamPoint} empty="全部考察点" options={filters?.exam_points ?? []} />
          <Select value={direction} onChange={setDirection} empty="全部方向" options={filters?.directions ?? []} />
          <select aria-label="错题排序" className="rounded-md border border-line bg-panel px-3 py-2" value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="latest_wrong">最新错题</option>
            <option value="oldest_wrong">最早错题</option>
            <option value="import_order">导入顺序</option>
            <option value="wrong_count_desc">错误次数</option>
          </select>
        </div>
      </section>
      {error && <ErrorState message={error} />}
      {notice && <div className="rounded-md bg-good-soft p-3 text-sm text-good">{notice}</div>}
      {loading ? <LoadingState text="正在准备复习内容…" /> : items.length === 0 ? (
        <EmptyState text="暂无错题。" />
      ) : (
        <div className="grid gap-3">
          {items.map(({ attempt, question, wrong_count, last_wrong_at, last_wrong_answer }) => (
            <article className="panel panel-hover p-5 sm:p-6" key={attempt.id}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="bad">错 {wrong_count} 次</Badge>
                <Badge tone="accent">{question.type_label}</Badge>
                {question.difficulty && <Badge>难度 · {question.difficulty}</Badge>}
                {question.directions.map((item) => <Badge key={item}>{item}</Badge>)}
                <span className="ml-auto text-xs text-muted">
                  {last_wrong_at ? formatTime(last_wrong_at) : "—"}
                </span>
              </div>
              <div className="mt-4 min-w-0">
                <RichContent content={question.stem} className="text-[0.98rem] font-medium leading-8" />
              </div>
              <dl className="mt-4 grid gap-3 rounded-xl border border-line bg-panel-2/60 p-4 text-sm sm:grid-cols-2">
                <div className="min-w-0">
                  <dt className="text-xs text-muted">上次错误答案</dt>
                  <dd className="mt-1 break-words font-medium text-bad">{last_wrong_answer || "—"}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-muted">标准答案</dt>
                  <dd className="mt-1 text-ink">
                    <RichContent content={formatStandardAnswer(question.standard_answer)} />
                  </dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link className="btn-primary btn-sm" to={`/practice?mode=wrong&start_question_id=${question.id}`}>
                  <RotateCcw className="h-4 w-4" />
                  重新练习
                </Link>
                <Link className="btn-secondary btn-sm" to={`/questions/${question.id}`}>
                  <BookOpen className="h-4 w-4" />
                  查看解析
                </Link>
                <Link className="btn-secondary btn-sm" to={`/questions/${question.id}/edit?${new URLSearchParams({ return_to: returnTo }).toString()}`}>
                  <Edit3 className="h-4 w-4" />
                  编辑题目
                </Link>
                <button className="btn-danger btn-sm" onClick={() => setDeleting(question)}>
                  <Trash2 className="h-4 w-4" />
                  删除题目
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted">共 {total} 道错题</div>
        <div className="flex gap-2">
          <button className="rounded-md border border-line bg-panel px-3 py-2 text-sm" disabled={loading || page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>上一页</button>
          <button className="rounded-md border border-line bg-panel px-3 py-2 text-sm" disabled={loading || !hasNext} onClick={() => setPage((value) => value + 1)}>下一页</button>
        </div>
      </div>
      <DeleteQuestionDialog
        open={Boolean(deleting)}
        onCancel={() => setDeleting(null)}
        onConfirm={async (reason) => {
          if (!deleting) return;
          try {
            await deleteQuestion(deleting.id, { reason });
            setDeleting(null);
            setNotice("题目已删除，已从错题列表中移除。");
            load();
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      />
    </div>
  );
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatStandardAnswer(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join("、");
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value ?? "");
}

function Select({ value, onChange, options, empty }: { value: string; onChange: (value: string) => void; options: string[]; empty: string }) {
  return (
    <select aria-label={empty} className="rounded-md border border-line bg-panel px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{empty}</option>
      {options.map((item) => <option key={item} value={item}>{item}</option>)}
    </select>
  );
}
