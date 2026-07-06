import { BookOpen, Edit3, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { listWrongAttempts } from "../api/attempts";
import { deleteQuestion, getFilterOptions } from "../api/questions";
import { Badge } from "../components/common/Badge";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { DeleteQuestionDialog } from "../components/question/DeleteQuestionDialog";
import type { WrongAttempt } from "../types/attempt";
import type { FilterOptions, Question } from "../types/question";

export function ReviewPage() {
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}`;
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
    listWrongAttempts({ page, page_size: 10, type, difficulty, exam_point: examPoint, direction, keyword, sort })
      .then((response) => {
        setItems(response.items);
        setTotal(response.total);
        setHasNext(response.has_next);
      })
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    load();
  }, [page, type, difficulty, examPoint, direction, keyword, sort]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">错题复习</h1>
      <section className="panel rounded-lg p-4">
        <div className="grid gap-3 md:grid-cols-6">
          <input className="rounded-md border border-line px-3 py-2" value={keyword} onChange={(event) => { setPage(1); setKeyword(event.target.value); }} placeholder="搜索题干" />
          <Select value={type} onChange={setType} empty="全部题型" options={filters?.types ?? []} />
          <Select value={difficulty} onChange={setDifficulty} empty="全部难度" options={filters?.difficulties ?? []} />
          <Select value={examPoint} onChange={setExamPoint} empty="全部考察点" options={filters?.exam_points ?? []} />
          <Select value={direction} onChange={setDirection} empty="全部方向" options={filters?.directions ?? []} />
          <select className="rounded-md border border-line bg-white px-3 py-2" value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="latest_wrong">最新错题</option>
            <option value="oldest_wrong">最早错题</option>
            <option value="import_order">导入顺序</option>
            <option value="wrong_count_desc">错误次数</option>
          </select>
        </div>
      </section>
      {error && <ErrorState message={error} />}
      {notice && <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}
      {items.length === 0 ? (
        <EmptyState text="暂无错题。" />
      ) : (
        <div className="grid gap-3">
          {items.map(({ attempt, question, wrong_count, last_wrong_at, last_wrong_answer }) => (
            <article className="panel rounded-lg p-4" key={attempt.id}>
              <div className="mb-2 flex flex-wrap gap-2">
                <Badge tone="bad">错 {wrong_count} 次</Badge>
                <Badge tone="accent">{question.type_label}</Badge>
                {question.difficulty && <Badge>{question.difficulty}</Badge>}
                {question.directions.map((item) => <Badge key={item}>{item}</Badge>)}
              </div>
              <h2 className="font-medium leading-7">{question.stem}</h2>
              <div className="mt-3 grid gap-2 text-sm text-muted md:grid-cols-3">
                <div>上次错误答案：{last_wrong_answer}</div>
                <div>标准答案：{String(question.standard_answer ?? "")}</div>
                <div>最近错误：{last_wrong_at ? new Date(last_wrong_at).toLocaleString() : "-"}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-sm text-white" to={`/practice?mode=wrong&start_question_id=${question.id}`}>
                  <RotateCcw className="h-4 w-4" />
                  重新练习
                </Link>
                <Link className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-1.5 text-sm" to={`/questions/${question.id}`}>
                  <BookOpen className="h-4 w-4" />
                  查看解析
                </Link>
                <Link className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-1.5 text-sm" to={`/questions/${question.id}/edit?${new URLSearchParams({ return_to: returnTo }).toString()}`}>
                  <Edit3 className="h-4 w-4" />
                  编辑题目
                </Link>
                <button className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700" onClick={() => setDeleting(question)}>
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
          <button className="rounded-md border border-line bg-white px-3 py-2 text-sm" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>上一页</button>
          <button className="rounded-md border border-line bg-white px-3 py-2 text-sm" disabled={!hasNext} onClick={() => setPage((value) => value + 1)}>下一页</button>
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

function Select({ value, onChange, options, empty }: { value: string; onChange: (value: string) => void; options: string[]; empty: string }) {
  return (
    <select className="rounded-md border border-line bg-white px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{empty}</option>
      {options.map((item) => <option key={item} value={item}>{item}</option>)}
    </select>
  );
}
