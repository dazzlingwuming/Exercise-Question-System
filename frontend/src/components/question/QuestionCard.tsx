import type { PracticeQuestion } from "../../types/question";
import { Badge } from "../common/Badge";
import { RichContent } from "../content/RichContent";

export function QuestionCard({ question }: { question: PracticeQuestion }) {
  return (
    <section className="panel rounded-lg p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone="accent">{question.type_label}</Badge>
        {question.difficulty && <Badge>{question.difficulty}</Badge>}
        {question.part_id && <span className="text-xs text-muted">{question.part_id}</span>}
      </div>
      <RichContent content={question.stem} className="text-lg font-semibold leading-8" />
      {question.material && <RichContent content={question.material} className="mt-4 rounded-md bg-surface p-4 text-sm leading-6" />}
    </section>
  );
}
