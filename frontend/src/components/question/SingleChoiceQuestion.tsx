import { Check } from "lucide-react";
import type { PracticeQuestion } from "../../types/question";
import { RichContent } from "../content/RichContent";

// 中文说明：单选题组件负责渲染选项卡片，并把选中的选项字母回传给父组件。
export function SingleChoiceQuestion({ question, value, onChange }: { question: PracticeQuestion; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2.5">
      {question.options.map((option) => {
        const selected = value === option.key;
        return (
          <label
            key={option.key}
            className={`option-card has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/60 ${selected ? "is-selected" : ""}`}
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
            <Check
              className={`mt-1 h-4 w-4 shrink-0 text-accent transition-opacity ${selected ? "opacity-100" : "opacity-0"}`}
              aria-hidden="true"
            />
          </label>
        );
      })}
    </div>
  );
}
