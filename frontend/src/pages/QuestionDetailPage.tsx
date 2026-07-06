import { Edit3, History, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { deleteQuestion, getQuestion, restoreDeletedQuestion } from "../api/questions";
import { Badge } from "../components/common/Badge";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { DeleteQuestionDialog } from "../components/question/DeleteQuestionDialog";
import type { Question } from "../types/question";

export function QuestionDetailPage() {
  const { id = "" } = useParams();
  const [question, setQuestion] = useState<Question | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    getQuestion(id).then(setQuestion).catch((err) => setError(err.message));
  };

  useEffect(() => {
    load();
  }, [id]);

  if (error) return <ErrorState message={error} />;
  if (!question) return <LoadingState />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge tone="accent">{question.type_label}</Badge>
            <Badge>v{question.version}</Badge>
            {question.is_deleted && <Badge tone="bad">已删除</Badge>}
            {question.difficulty && <Badge>{question.difficulty}</Badge>}
            {question.directions.map((item) => <Badge key={item}>{item}</Badge>)}
          </div>
          <h1 className="text-2xl font-semibold">{question.part_id ?? question.id}</h1>
        </div>
        <div className="flex gap-2">
          {!question.is_deleted && (
            <Link className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm text-white" to={`/questions/${question.id}/edit`}>
              <Edit3 className="h-4 w-4" />
              编辑题目
            </Link>
          )}
          <Link className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm" to={`/questions/${question.id}/revisions`}>
            <History className="h-4 w-4" />
            修改历史
          </Link>
          {question.is_deleted ? (
            <button
              className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
              onClick={async () => {
                const reason = window.prompt("请输入恢复原因", "误删，恢复题目");
                if (!reason) return;
                setQuestion(await restoreDeletedQuestion(question.id, { reason }));
              }}
            >
              <RotateCcw className="h-4 w-4" />
              恢复题目
            </button>
          ) : (
            <button className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
              删除题目
            </button>
          )}
        </div>
      </div>
      {question.is_deleted && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="font-medium">已删除</div>
          <div className="mt-1">删除时间：{question.deleted_at ? new Date(question.deleted_at).toLocaleString() : "-"}</div>
          <div className="mt-1">删除原因：{question.delete_reason || "-"}</div>
        </section>
      )}
      <section className="panel rounded-lg p-5">
        <h2 className="mb-3 font-semibold">题干</h2>
        <p className="whitespace-pre-wrap leading-8">{question.stem}</p>
      </section>
      {question.directions.length > 0 && (
        <section className="panel rounded-lg p-5">
          <h2 className="mb-3 font-semibold">题目方向</h2>
          <div className="flex flex-wrap gap-2">{question.directions.map((item) => <Badge key={item}>{item}</Badge>)}</div>
        </section>
      )}
      {question.options.length > 0 && (
        <section className="panel rounded-lg p-5">
          <h2 className="mb-3 font-semibold">选项</h2>
          <div className="space-y-2">
            {question.options.map((option) => (
              <div key={option.key} className="rounded-md border border-line bg-white p-3">
                {option.key}. {option.text}
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="panel rounded-lg p-5">
        <h2 className="mb-3 font-semibold">答案与解析</h2>
        <div className="mb-3 text-sm text-muted">标准答案：{String(question.standard_answer ?? "")}</div>
        <p className="whitespace-pre-wrap leading-7">{question.explanation || "暂无解析"}</p>
      </section>
      <DeleteQuestionDialog
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={async (reason) => {
          await deleteQuestion(question.id, { reason });
          setDeleteOpen(false);
          load();
        }}
      />
    </div>
  );
}
