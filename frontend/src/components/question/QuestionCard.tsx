import type { PracticeQuestion } from "../../types/question";
import { Badge } from "../common/Badge";
import { RichContent } from "../content/RichContent";

export function QuestionCard({ question }: { question: PracticeQuestion }) {
  return (
    <section className="bento-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-line/60 bg-panel-2/40 px-5 py-3.5 sm:px-7">
        <Badge tone="accent">{question.type_label}</Badge>
        {question.difficulty && <Badge>难度 · {question.difficulty}</Badge>}
        <span className="ml-auto text-xs font-semibold uppercase tracking-[0.18em] text-muted">Question</span>
      </div>
      <div className="p-5 sm:p-7">
        <RichContent content={question.stem} className="text-[1.12rem] font-semibold leading-9" />
        {question.material && (
          <div className="mt-5 rounded-2xl border border-line bg-panel-2/70 p-4 sm:p-5">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">材料</div>
            <RichContent content={question.material} className="text-sm leading-7" />
          </div>
        )}
      </div>
    </section>
  );
}
