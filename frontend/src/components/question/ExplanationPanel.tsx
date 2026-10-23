import { CheckCircle2, XCircle } from "lucide-react";
import type { SubmitAnswerResponse } from "../../types/attempt";
import { RichContent } from "../content/RichContent";

// 中文说明：解析面板负责展示判分状态、标准答案、解析、考察点和评分标准。
export function ExplanationPanel({ result }: { result: SubmitAnswerResponse }) {
  const tone = result.requires_self_review ? "warn" : result.is_correct ? "good" : "bad";

  return (
    <section className="bento-card mt-5 overflow-hidden scroll-mt-32">
      <div
        className={`flex flex-wrap items-center gap-3 border-b px-5 py-4 ${
          tone === "good"
            ? "border-good-border/60 bg-good-soft/60"
            : tone === "bad"
              ? "border-bad-border/60 bg-bad-soft/50"
              : "border-warn-border/60 bg-warn-soft/50"
        }`}
      >
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
            tone === "good" ? "bg-good text-white" : tone === "bad" ? "bg-bad text-white" : "bg-warn text-white"
          }`}
        >
          {tone === "good" ? (
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          ) : (
            <XCircle className="h-5 w-5" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0">
          <p
            className={`text-sm font-bold tracking-tight ${
              tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-warn"
            }`}
          >
            {result.requires_self_review ? "待自评" : result.is_correct ? "回答正确" : "答错了"}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <span>标准答案</span>
            <RichContent
              content={formatRichValue(result.standard_answer)}
              className="inline-rich-content font-semibold text-ink"
            />
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <p className="eyebrow">Explanation</p>
        <div className="mt-2 border-l-2 border-accent/25 pl-4">
          {result.explanation ? (
            <RichContent content={result.explanation} className="text-sm leading-8" />
          ) : (
            <p className="text-sm text-muted">这道题还没有写解析。</p>
          )}
        </div>

        <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
          {result.exam_points.length > 0 && <Info title="考察点" value={result.exam_points.join("、")} />}
          {result.common_mistakes && <Info title="常见错误" value={result.common_mistakes} />}
          {result.follow_up_question && <Info title="面试追问" value={result.follow_up_question} />}
          {result.scoring_standard && <Info title="评分标准" value={result.scoring_standard} />}
        </div>
      </div>
    </section>
  );
}

function Info({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel-2/60 p-3.5">
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{title}</div>
      <RichContent content={value} className="leading-6" />
    </div>
  );
}

function formatRichValue(value: unknown) {
  if (Array.isArray(value)) return value.join("、");
  if (typeof value === "object" && value !== null) return JSON.stringify(value, null, 2);
  return String(value ?? "");
}
