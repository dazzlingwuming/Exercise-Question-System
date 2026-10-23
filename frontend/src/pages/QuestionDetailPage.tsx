import { ArrowLeft, Check, Copy, Edit3, History, Library, PlayCircle, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { deleteQuestion, getQuestion, restoreDeletedQuestion } from "../api/questions";
import { Badge } from "../components/common/Badge";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { PageHeader } from "../components/common/PageHeader";
import { RichContent } from "../components/content/RichContent";
import { DeleteQuestionDialog } from "../components/question/DeleteQuestionDialog";
import { answerKeys } from "../utils/answers";
import type { Question } from "../types/question";

export function QuestionDetailPage() {
  const { id = "" } = useParams();
  const [searchParams] = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("return_to"));
  const [question, setQuestion] = useState<Question | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    getQuestion(id).then(setQuestion).catch((err) => setError(err.message));
  };

  useEffect(() => {
    load();
  }, [id]);

  if (error) return <ErrorState message={error} />;
  if (!question) return <LoadingState />;

  const correctKeys = answerKeys(question.standard_answer);
  const heading = question.title?.trim() || truncate(question.stem, 46) || question.id;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="QUESTION DETAIL"
        title={heading}
        description={question.collection_path || "未归类"}
        actions={
          <>
            {returnTo && (
              <Link className="btn-secondary min-w-0 max-w-full" to={returnTo}>
                <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
                返回
              </Link>
            )}
            {!question.is_deleted && (
              <Link
                className="btn-primary min-w-0 max-w-full"
                to={`/questions/${question.id}/edit${returnTo ? `?${new URLSearchParams({ return_to: returnTo }).toString()}` : ""}`}
              >
                <Edit3 className="h-4 w-4 shrink-0" aria-hidden="true" />
                编辑题目
              </Link>
            )}
            <Link
              className="btn-secondary min-w-0 max-w-full"
              aria-label="修改历史"
              to={`/questions/${question.id}/revisions`}
            >
              <History className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">修改历史</span>
            </Link>
            {question.is_deleted ? (
              <button
                className="btn-secondary min-w-0 max-w-full"
                aria-label="恢复题目"
                onClick={async () => {
                  const reason = window.prompt("请输入恢复原因", "误删，恢复题目");
                  if (!reason) return;
                  setQuestion(await restoreDeletedQuestion(question.id, { reason }));
                }}
              >
                <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">恢复题目</span>
              </button>
            ) : (
              <button
                className="btn-danger min-w-0 max-w-full"
                aria-label="删除题目"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">删除题目</span>
              </button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="chip border-accent-border bg-accent-soft font-semibold text-accent">{question.type_label}</span>
        {question.difficulty && <span className="chip">难度 {question.difficulty}</span>}
        <span className="chip">v{question.version}</span>
        {question.directions.map((item) => (
          <span className="chip" key={item}>{item}</span>
        ))}
        {question.is_deleted && <Badge tone="bad">已删除</Badge>}
        <code className="ml-auto hidden rounded-lg border border-line bg-panel-2 px-2.5 py-1 font-mono text-xs text-muted sm:block">
          {question.id}
        </code>
      </div>

      {question.is_deleted && (
        <section className="rounded-2xl border border-bad-border bg-bad-soft p-4 text-sm leading-6 text-bad">
          <div className="font-semibold">这道题已被删除</div>
          <div className="mt-1 text-bad/80">
            删除时间：{formatDateTime(question.deleted_at)} · 原因：{question.delete_reason || "未填写"}
          </div>
        </section>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-5">
          <section className="bento-card p-6 sm:p-7">
            <SectionHead label="题干" kicker="Stem" />
            <div className="mt-4">
              <RichContent content={question.stem} className="text-[1.02rem] font-medium leading-9" />
            </div>
          </section>

          {question.material && (
            <section className="bento-card p-6 sm:p-7">
              <SectionHead label="材料" kicker="Material" />
              <div className="mt-4 rounded-2xl border border-line bg-panel-2/60 p-4">
                <RichContent content={question.material} className="leading-8" />
              </div>
            </section>
          )}

          {question.options.length > 0 && (
            <section className="bento-card p-6 sm:p-7">
              <SectionHead
                label="选项"
                kicker="Options"
                extra={<span className="text-xs text-muted">{question.options.length} 个</span>}
              />
              <ul className="mt-4 space-y-2.5">
                {question.options.map((option) => {
                  const isCorrect = correctKeys.has(option.key.toUpperCase());
                  return (
                    <li
                      key={option.key}
                      className={`flex items-start gap-3 rounded-2xl border p-3.5 transition ${
                        isCorrect
                          ? "border-good-border bg-good-soft"
                          : "border-line bg-panel"
                      }`}
                    >
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${
                          isCorrect ? "bg-good text-white" : "bg-panel-2 text-muted"
                        }`}
                      >
                        {isCorrect ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : option.key}
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <RichContent content={option.text} className="leading-7" />
                      </div>
                      {isCorrect && <span className="mt-1 shrink-0 text-xs font-semibold text-good">正确答案</span>}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="bento-card overflow-hidden">
            <div className="border-b border-line/60 px-6 py-4 sm:px-7">
              <SectionHead label="答案与解析" kicker="Answer" />
            </div>
            <div className="space-y-4 p-6 sm:p-7">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">标准答案</span>
                {correctKeys.size > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {[...correctKeys].map((key) => (
                      <span
                        key={key}
                        className="grid h-9 min-w-[2.25rem] place-items-center rounded-xl bg-good px-2 text-sm font-extrabold text-white"
                      >
                        {key}
                      </span>
                    ))}
                  </div>
                ) : (
                  <RichContent content={formatRichValue(question.standard_answer)} className="font-semibold" />
                )}
              </div>
              {question.answer_text && !correctKeys.size && (
                <p className="text-sm leading-7 text-muted">{question.answer_text}</p>
              )}
              <div className="border-l-2 border-accent/30 pl-4">
                <RichContent content={question.explanation || "暂无解析"} className="leading-8 text-ink/90" />
              </div>
            </div>
          </section>

          {(question.common_mistakes || question.follow_up_question || question.scoring_standard) && (
            <div className="grid gap-4 md:grid-cols-2">
              {question.common_mistakes && (
                <section className="bento-card p-5">
                  <SectionHead label="常见错误" kicker="Common mistakes" />
                  <p className="mt-3 text-sm leading-7 text-muted">{question.common_mistakes}</p>
                </section>
              )}
              {question.follow_up_question && (
                <section className="bento-card p-5">
                  <SectionHead label="延伸追问" kicker="Follow-up" />
                  <p className="mt-3 text-sm leading-7 text-muted">{question.follow_up_question}</p>
                </section>
              )}
              {question.scoring_standard && (
                <section className="bento-card p-5">
                  <SectionHead label="评分标准" kicker="Scoring" />
                  <p className="mt-3 text-sm leading-7 text-muted">{question.scoring_standard}</p>
                </section>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20">
          <section className="bento-card p-5">
            <SectionHead label="题目信息" kicker="Meta" />
            <dl className="mt-4 space-y-3 text-sm">
              <MetaRow label="题型" value={question.type_label} />
              <MetaRow label="难度" value={question.difficulty ? `${question.difficulty} / 5` : "—"} />
              <MetaRow label="版本" value={`v${question.version}`} />
              <MetaRow label="题目 ID" value={question.id} mono />
              <MetaRow label="所属集合" value={question.collection_path || "未归类"} />
            </dl>

            {question.exam_points.length > 0 && (
              <div className="mt-4 border-t border-line/60 pt-4">
                <p className="text-xs text-muted">考点</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {question.exam_points.map((item) => (
                    <span className="chip" key={item}>{item}</span>
                  ))}
                </div>
              </div>
            )}

            {question.tags.length > 0 && (
              <div className="mt-4 border-t border-line/60 pt-4">
                <p className="text-xs text-muted">标签</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {question.tags.map((item) => (
                    <span className="chip" key={item}>{item}</span>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="bento-card p-5">
            <SectionHead label="快捷操作" kicker="Actions" />
            <div className="mt-3 space-y-1.5">
              <button
                type="button"
                className="row-link w-full text-left text-sm"
                onClick={() => {
                  void navigator.clipboard?.writeText(question.id);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1600);
                }}
              >
                <Copy className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                <span className="flex-1">{copied ? "已复制题目 ID" : "复制题目 ID"}</span>
              </button>
              <Link
                className="row-link text-sm"
                to={
                  question.collection_id
                    ? `/practice?collection_id=${encodeURIComponent(question.collection_id)}&include_descendants=true`
                    : "/practice"
                }
              >
                <PlayCircle className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                <span className="flex-1">练习这个集合</span>
              </Link>
              <Link className="row-link text-sm" to="/questions">
                <Library className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                <span className="flex-1">回到题库</span>
              </Link>
            </div>
          </section>

          {question.parse_warnings.length > 0 && (
            <section className="bento-card border-warn-border bg-warn-soft p-5">
              <h2 className="text-sm font-semibold text-warn">解析提醒</h2>
              <ul className="mt-3 space-y-2 text-xs leading-6 text-warn">
                {question.parse_warnings.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>

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

function SectionHead({ label, kicker, extra }: { label: string; kicker: string; extra?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="flex items-baseline gap-2 text-sm font-bold tracking-tight">
        {label}
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted/70">{kicker}</span>
      </h2>
      {extra}
    </div>
  );
}

function MetaRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line/60 pb-2.5 last:border-0 last:pb-0">
      <dt className="shrink-0 text-xs text-muted">{label}</dt>
      <dd className={`min-w-0 break-words text-right text-xs font-medium ${mono ? "font-mono text-[0.72rem]" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function safeReturnTo(value: string | null) {
  if (!value) return "";
  if (!value.startsWith("/") || value.startsWith("//")) return "";
  return value;
}

function truncate(value: string, max: number) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function formatRichValue(value: unknown) {
  if (Array.isArray(value)) return value.join("、");
  if (typeof value === "object" && value !== null) return JSON.stringify(value, null, 2);
  return String(value ?? "");
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
