import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getQuestionRevisionDetail, getQuestionRevisions, restoreQuestionRevision } from "../api/questions";
import { Badge } from "../components/common/Badge";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import type { QuestionRevision, QuestionRevisionDetail } from "../types/question";

export function QuestionRevisionPage() {
  const { id = "" } = useParams();
  const [items, setItems] = useState<QuestionRevision[]>([]);
  const [detail, setDetail] = useState<QuestionRevisionDetail | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = () => getQuestionRevisions(id).then(setItems).catch((err) => setError(err.message));
  useEffect(() => { load(); }, [id]);

  const showDetail = async (revisionId: string) => setDetail(await getQuestionRevisionDetail(id, revisionId));
  const restore = async (revisionId: string) => {
    try {
      const question = await restoreQuestionRevision(id, revisionId, { restore_target: "before", reason: "从修改历史恢复旧版本" });
      setMessage(`已恢复，当前版本 v${question.version}`);
      setDetail(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">修改历史</h1>
        <Link className="rounded-md border border-line bg-white px-3 py-2 text-sm" to={`/questions/${id}`}>返回详情</Link>
      </div>
      {error && <ErrorState message={error} />}
      {message && <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
      {items.length === 0 ? <EmptyState text="暂无修改历史。" /> : (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <section className="space-y-2">
            {items.map((item) => (
              <button key={item.id} className="panel w-full rounded-lg p-4 text-left" onClick={() => showDetail(item.id)}>
                <div className="mb-2 flex gap-2"><Badge tone="accent">v{item.version_before} {"->"} v{item.version_after}</Badge><Badge>{item.source}</Badge></div>
                <div className="text-sm text-muted">{item.changed_fields.join("、")}</div>
                {item.reason && <div className="mt-2 text-sm">{item.reason}</div>}
              </button>
            ))}
          </section>
          <section className="panel rounded-lg p-5">
            {!detail ? (
              <div className="text-sm text-muted">选择一条历史查看字段级对比。</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">v{detail.version_before} {"->"} v{detail.version_after}</div>
                  <button className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm" onClick={() => restore(detail.id)}>
                    <RotateCcw className="h-4 w-4" />
                    恢复到修改前
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <RevisionSide title="修改前" data={detail.before_data} fields={detail.changed_fields} />
                  <RevisionSide title="修改后" data={detail.after_data} fields={detail.changed_fields} />
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function RevisionSide({ title, data, fields }: { title: string; data: Record<string, unknown>; fields: string[] }) {
  return (
    <div>
      <h2 className="mb-3 font-medium">{title}</h2>
      <div className="space-y-2">
        {fields.map((field) => (
          <div className="rounded-md border border-line bg-surface p-3" key={field}>
            <div className="mb-1 text-xs font-medium text-muted">{field}</div>
            <pre className="whitespace-pre-wrap break-words text-sm leading-6">{formatValue(data[field])}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatValue(value: unknown) {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}
