import type { Question } from "../../types/question";

// 中文说明：单选题组件负责渲染 Radio 选项，并把选中的选项字母回传给父组件。
export function SingleChoiceQuestion({ question, value, onChange }: { question: Question; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      {question.options.map((option) => (
        <label key={option.key} className="flex cursor-pointer gap-3 rounded-md border border-line bg-white p-3 hover:border-accent">
          <input type="radio" checked={value === option.key} onChange={() => onChange(option.key)} />
          <span className="font-medium">{option.key}.</span>
          <span>{option.text}</span>
        </label>
      ))}
    </div>
  );
}
