import { Check, X } from "lucide-react";
import type { PracticeQuestion } from "../../types/question";
import { RichContent } from "../content/RichContent";

export type AnswerGrade = {
  correctKeys: Set<string>;
  isCorrect: boolean | null;
} | null;

// 中文说明：单选题组件负责渲染选项卡片，并把选中的选项字母回传给父组件；提交后按判分结果上色。
export function SingleChoiceQuestion({
  question,
  value,
  onChange,
  grade = null,
}: {
  question: PracticeQuestion;
  value: string;
  onChange: (value: string) => void;
  grade?: AnswerGrade;
}) {
  return (
    <div className="space-y-2.5">
      {question.options.map((option) => {
        const selected = value === option.key;
        const isCorrect = Boolean(grade?.correctKeys.has(option.key.toUpperCase()));
        const isWrong = Boolean(grade) && selected && !isCorrect;
        const state = isCorrect ? "is-correct" : isWrong ? "is-wrong" : selected ? "is-selected" : "";
        return (
          <label
            key={option.key}
            className={`option-card has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/60 ${state}`}
          >
            <input
              type="radio"
              className="sr-only"
              name={`answer-${question.id}`}
              checked={selected}
              onChange={() => onChange(option.key)}
            />
            <span className="option-key">{option.key}</span>
            <span className="min-w-0 flex-1 pt-1 text-[0.95rem] leading-7">
              <RichContent content={option.text} />
            </span>
            {grade ? (
              isCorrect ? (
                <span className="mt-1 flex shrink-0 items-center gap-1 text-xs font-semibold text-good">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  正确答案
                </span>
              ) : isWrong ? (
                <span className="mt-1 flex shrink-0 items-center gap-1 text-xs font-semibold text-bad">
                  <X className="h-4 w-4" aria-hidden="true" />
                  你的答案
                </span>
              ) : null
            ) : (
              <Check
                className={`mt-1 h-4 w-4 shrink-0 text-accent transition-opacity ${selected ? "opacity-100" : "opacity-0"}`}
                aria-hidden="true"
              />
            )}
          </label>
        );
      })}
    </div>
  );
}
