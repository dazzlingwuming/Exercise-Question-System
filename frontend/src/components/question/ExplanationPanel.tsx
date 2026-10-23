import type { SubmitAnswerResponse } from "../../types/attempt";
import { Badge } from "../common/Badge";
import { RichContent } from "../content/RichContent";

// 中文说明：解析面板负责展示判分状态、标准答案、解析、考察点和评分标准。
export function ExplanationPanel({ result }: { result: SubmitAnswerResponse }) {
  return (
    <section className="panel mt-5 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line/70 bg-panel-2/70 px-5 py-3">
        {result.requires_self_review ? (
          <Badge tone="accent">待自评</Badge>
        ) : result.is_correct ? (
          <Badge tone="good">回答正确</Badge>
        ) : (
          <Badge tone="bad">再看一眼</Badge>
        )}
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-muted">
          <span className="text-xs uppercase tracking-wider">标准答案</span>
          <RichContent content={formatRichValue(result.standard_answer)} className="inline-rich-content font-medium text-ink" />
        </div>
      </div>
      <div className="p-5">
        {result.explanation && <RichContent content={result.explanation} className="text-sm leading-7" />}
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
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
    <div className="rounded-xl border border-line bg-panel-2 p-3.5">
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
