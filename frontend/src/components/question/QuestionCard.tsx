import type { PracticeQuestion } from "../../types/question";
import { Badge } from "../common/Badge";
import { RichContent } from "../content/RichContent";

export function QuestionCard({ question }: { question: PracticeQuestion }) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line/70 bg-panel-2/70 px-5 py-3">
        <Badge tone="accent">{question.type_label}</Badge>
        {question.difficulty && <Badge>难度 · {question.difficulty}</Badge>}
        {question.part_id && <span className="ml-auto text-[11px] font-medium tracking-wide text-muted">{question.part_id}</span>}
      </div>
      <div className="p-5 sm:p-6">
        <RichContent content={question.stem} className="text-[1.05rem] font-semibold leading-8" />
        {question.material && (
          <div className="mt-4 rounded-xl border border-line bg-panel-2 p-4">
            <RichContent content={question.material} className="text-sm leading-7" />
          </div>
        )}
      </div>
    </section>
  );
}
