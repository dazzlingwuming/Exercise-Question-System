import type { PracticeQuestion } from "../../types/question";
import { RichContent } from "../content/RichContent";

// 中文说明：多选题组件负责渲染 Checkbox 选项，并把选项字母数组回传给父组件。
export function MultipleChoiceQuestion({ question, value, onChange }: { question: PracticeQuestion; value: string[]; onChange: (value: string[]) => void }) {
  const toggle = (key: string) => {
    onChange(value.includes(key) ? value.filter((item) => item !== key) : [...value, key].sort());
  };
  return (
    <div className="space-y-2">
      {question.options.map((option) => (
        <label key={option.key} className="flex cursor-pointer gap-3 rounded-md border border-line bg-white p-3 hover:border-accent">
          <input type="checkbox" checked={value.includes(option.key)} onChange={() => toggle(option.key)} />
          <span className="font-medium">{option.key}.</span>
          <div className="min-w-0 flex-1"><RichContent content={option.text} /></div>
        </label>
      ))}
    </div>
  );
}
