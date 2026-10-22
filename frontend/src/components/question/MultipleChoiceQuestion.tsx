import { Check } from "lucide-react";
import type { PracticeQuestion } from "../../types/question";
import { RichContent } from "../content/RichContent";

// 中文说明：多选题组件负责渲染选项卡片，并把选项字母数组回传给父组件。
export function MultipleChoiceQuestion({ question, value, onChange }: { question: PracticeQuestion; value: string[]; onChange: (value: string[]) => void }) {
  const toggle = (key: string) => {
    onChange(value.includes(key) ? value.filter((item) => item !== key) : [...value, key].sort());
  };
  return (
    <div className="space-y-2.5">
      {question.options.map((option) => {
        const selected = value.includes(option.key);
        return (
          <label
            key={option.key}
            className={`option-card has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/60 ${selected ? "is-selected" : ""}`}
          >
            <input type="checkbox" className="sr-only" checked={selected} onChange={() => toggle(option.key)} />
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
