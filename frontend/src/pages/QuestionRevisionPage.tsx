import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getQuestionRevisionDetail, getQuestionRevisions, restoreQuestionRevision } from "../api/questions";
import { Badge } from "../components/common/Badge";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { PageHeader } from "../components/common/PageHeader";
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
      <PageHeader
        eyebrow="REVISION HISTORY"
        title="修改历史"
        description="查看每次修改的字段，并按需恢复旧版本。"
        actions={<Link className="btn-secondary min-w-0" to={`/questions/${id}`}>返回详情</Link>}
      />
      {error && <ErrorState message={error} />}
      {message && (
        <div className="rounded-2xl border border-good-border bg-good-soft p-3 text-sm font-medium text-good">
          {message}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState title="还没有修改记录" text="编辑并保存题目后，这里会按版本列出每一次改动。" />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <section className="space-y-2">
            {items.map((item) => {
              const active = detail?.id === item.id;
              return (
                <button
                  key={item.id}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-accent bg-accent-soft/70 shadow-soft"
                      : "border-line bg-panel hover:border-accent/35 hover:bg-panel-2"
                  }`}
                  onClick={() => void showDetail(item.id)}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="accent">v{item.version_before} → v{item.version_after}</Badge>
                    <Badge>{item.source}</Badge>
                    {item.created_at && (
                      <span className="ml-auto text-xs text-muted">{formatTime(item.created_at)}</span>
                    )}
                  </div>
                  <div className="mt-2 text-xs leading-5 text-muted">{item.changed_fields.join("、")}</div>
                  {item.reason && <div className="mt-2 text-sm leading-6">{item.reason}</div>}
                </button>
              );
            })}
          </section>

          <section className="bento-card p-5 sm:p-6">
            {!detail ? (
              <EmptyState title="选择一条历史" text="左侧点开任意版本，这里会显示字段级的修改前后对比。" />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="eyebrow">Comparing</p>
                    <div className="mt-1 text-sm font-bold tracking-tight">
                      v{detail.version_before} → v{detail.version_after}
                    </div>
                  </div>
                  <button className="btn-secondary btn-sm min-w-0" onClick={() => void restore(detail.id)}>
                    <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
                    恢复到修改前
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <RevisionSide title="修改前" data={detail.before_data} fields={detail.changed_fields} tone="before" />
                  <RevisionSide title="修改后" data={detail.after_data} fields={detail.changed_fields} tone="after" />
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function RevisionSide({
  title,
  data,
  fields,
  tone,
}: {
  title: string;
  data: Record<string, unknown>;
  fields: string[];
  tone: "before" | "after";
}) {
  return (
    <div className="min-w-0">
      <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        <span className={`h-1.5 w-1.5 rounded-full ${tone === "before" ? "bg-bad" : "bg-good"}`} aria-hidden="true" />
        {title}
      </h2>
      <div className="space-y-2">
        {fields.map((field) => (
          <div
            className={`rounded-xl border p-3 ${
              tone === "before" ? "border-bad-border/50 bg-bad-soft/30" : "border-good-border/60 bg-good-soft/30"
            }`}
            key={field}
          >
            <div className="mb-1 text-xs font-semibold text-muted">{field}</div>
            <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6">{formatValue(data[field])}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatValue(value: unknown) {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}
