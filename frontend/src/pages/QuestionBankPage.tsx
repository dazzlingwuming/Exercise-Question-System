import { Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteQuestion, getFilterOptions, listQuestions } from "../api/questions";
import { Badge } from "../components/common/Badge";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { DeleteQuestionDialog } from "../components/question/DeleteQuestionDialog";
import type { FilterOptions, Question } from "../types/question";

export function QuestionBankPage() {
  const [items, setItems] = useState<Question[]>([]);
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [tag, setTag] = useState("");
  const [examPoint, setExamPoint] = useState("");
  const [direction, setDirection] = useState("");
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [deleting, setDeleting] = useState<Question | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    listQuestions({ keyword, type, difficulty, tag, exam_point: examPoint, direction, page_size: 50 })
      .then((res) => setItems(res.items))
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    load();
  }, [keyword, type, difficulty, tag, examPoint, direction]);

  useEffect(() => {
    getFilterOptions().then(setFilterOptions).catch(() => undefined);
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">题库</h1>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 rounded-md border border-line bg-white px-3">
            <Search className="h-4 w-4 text-muted" />
            <input className="h-10 outline-none" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索题干" />
          </div>
          <select className="rounded-md border border-line bg-white px-3" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">全部题型</option>
            {(filterOptions?.types ?? []).map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="rounded-md border border-line bg-white px-3" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
            <option value="">全部难度</option>
            {(filterOptions?.difficulties ?? []).map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="rounded-md border border-line bg-white px-3" value={tag} onChange={(event) => setTag(event.target.value)}>
            <option value="">全部标签</option>
            {(filterOptions?.tags ?? []).map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="rounded-md border border-line bg-white px-3" value={examPoint} onChange={(event) => setExamPoint(event.target.value)}>
            <option value="">全部考察点</option>
            {(filterOptions?.exam_points ?? []).map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="rounded-md border border-line bg-white px-3" value={direction} onChange={(event) => setDirection(event.target.value)}>
            <option value="">全部方向</option>
            {(filterOptions?.directions ?? []).map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <Link className="inline-flex items-center gap-2 rounded-md bg-accent px-3 text-sm text-white" to="/questions/new">
            <Plus className="h-4 w-4" />
            新增题目
          </Link>
          <Link className="inline-flex items-center rounded-md border border-line bg-white px-3 text-sm" to="/questions/deleted">查看已删除题目</Link>
        </div>
      </div>
      {error && <ErrorState message={error} />}
      {items.length === 0 ? (
        <EmptyState text="暂无题目，请先导入题库。" />
      ) : (
        <div className="grid gap-3">
          {items.map((question) => (
            <article key={question.id} className="panel rounded-lg p-4">
              <div className="mb-2 flex flex-wrap gap-2">
                <Badge tone="accent">{question.type_label}</Badge>
                <Badge>v{question.version}</Badge>
                {question.difficulty && <Badge>{question.difficulty}</Badge>}
                {question.directions.slice(0, 3).map((item) => <Badge key={item}>{item}</Badge>)}
                {question.exam_points.slice(0, 3).map((point) => <Badge key={point}>{point}</Badge>)}
              </div>
              <h2 className="line-clamp-2 font-medium leading-7">{question.stem}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link className="rounded-md border border-line bg-white px-3 py-1.5 text-sm" to={`/questions/${question.id}`}>详情</Link>
                <Link className="rounded-md bg-accent px-3 py-1.5 text-sm text-white" to={`/questions/${question.id}/edit`}>编辑</Link>
                <Link className="rounded-md border border-line bg-white px-3 py-1.5 text-sm" to={`/questions/${question.id}/revisions`}>查看历史</Link>
                <button className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700" onClick={() => setDeleting(question)}>
                  <Trash2 className="h-4 w-4" />
                  删除
                </button>
                {question.directions[0] && <Link className="rounded-md border border-line bg-white px-3 py-1.5 text-sm" to={`/practice?mode=direction&direction=${encodeURIComponent(question.directions[0])}`}>按该方向练习</Link>}
              </div>
            </article>
          ))}
        </div>
      )}
      <DeleteQuestionDialog
        open={Boolean(deleting)}
        onCancel={() => setDeleting(null)}
        onConfirm={async (reason) => {
          if (!deleting) return;
          try {
            await deleteQuestion(deleting.id, { reason });
            setDeleting(null);
            load();
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      />
    </div>
  );
}
