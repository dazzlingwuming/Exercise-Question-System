import type { Question } from "../../types/question";
import { Badge } from "../common/Badge";

export function QuestionCard({ question }: { question: Question }) {
  return (
    <section className="panel rounded-lg p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone="accent">{question.type_label}</Badge>
        {question.difficulty && <Badge>{question.difficulty}</Badge>}
        {question.part_id && <span className="text-xs text-muted">{question.part_id}</span>}
      </div>
      <h2 className="whitespace-pre-wrap text-lg font-semibold leading-8">{question.stem}</h2>
      {question.material && <pre className="mt-4 overflow-auto rounded-md bg-ink p-4 text-sm leading-6 text-white">{question.material}</pre>}
    </section>
  );
}
