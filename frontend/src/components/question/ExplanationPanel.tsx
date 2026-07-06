import type { SubmitAnswerResponse } from "../../types/attempt";
import { Badge } from "../common/Badge";

// 中文说明：解析面板负责展示判分状态、标准答案、解析、考察点和评分标准。
export function ExplanationPanel({ result }: { result: SubmitAnswerResponse }) {
  return (
    <section className="panel mt-5 rounded-lg p-5">
      <div className="mb-4 flex items-center gap-2">
        {result.requires_self_review ? (
          <Badge tone="accent">待自评</Badge>
        ) : result.is_correct ? (
          <Badge tone="good">正确</Badge>
        ) : (
          <Badge tone="bad">错误</Badge>
        )}
        <span className="text-sm text-muted">标准答案：{String(result.standard_answer ?? "")}</span>
      </div>
      {result.explanation && <p className="whitespace-pre-wrap text-sm leading-7">{result.explanation}</p>}
      <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        {result.exam_points.length > 0 && <Info title="考察点" value={result.exam_points.join("、")} />}
        {result.common_mistakes && <Info title="常见错误" value={result.common_mistakes} />}
        {result.follow_up_question && <Info title="面试追问" value={result.follow_up_question} />}
        {result.scoring_standard && <Info title="评分标准" value={result.scoring_standard} />}
      </div>
    </section>
  );
}

function Info({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-surface p-3">
      <div className="mb-1 text-xs font-medium text-muted">{title}</div>
      <div className="whitespace-pre-wrap leading-6">{value}</div>
    </div>
  );
}
