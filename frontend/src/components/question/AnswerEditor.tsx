import type { Option } from "../../types/question";

// 中文说明：标准答案编辑分发器，根据题型选择单选、多选、判断、填空或主观答案编辑方式。
export function AnswerEditor({
  type,
  options,
  value,
  onChange,
}: {
  type: string;
  options: Option[];
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (type === "single_choice") return <SingleChoiceAnswerEditor options={options} value={String(value ?? "")} onChange={onChange} />;
  if (type === "multiple_choice") return <MultipleChoiceAnswerEditor options={options} value={String(value ?? "")} onChange={onChange} />;
  if (type === "true_false") return <TrueFalseAnswerEditor value={String(value ?? "")} onChange={onChange} />;
  if (type === "fill_blank") return <FillBlankAnswerEditor value={String(value ?? "")} onChange={onChange} />;
  return <SubjectiveAnswerEditor value={String(value ?? "")} onChange={onChange} />;
}

// 中文说明：单选题答案编辑器从已有选项中选择一个标准答案。
function SingleChoiceAnswerEditor({ options, value, onChange }: { options: Option[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      {options.map((option) => (
        <label key={option.key} className="flex gap-2 rounded-md border border-line bg-white p-2">
          <input type="radio" checked={value === option.key} onChange={() => onChange(option.key)} />
          {option.key}. {option.text}
        </label>
      ))}
    </div>
  );
}

// 中文说明：多选题答案编辑器从已有选项中选择多个标准答案，并用中文顿号保存。
function MultipleChoiceAnswerEditor({ options, value, onChange }: { options: Option[]; value: string; onChange: (value: string) => void }) {
  const selected = value.match(/[A-Z]/gi)?.map((item) => item.toUpperCase()) ?? [];
  const toggle = (key: string) => {
    const next = selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key].sort();
    onChange(next.join("、"));
  };
  return (
    <div className="space-y-2">
      {options.map((option) => (
        <label key={option.key} className="flex gap-2 rounded-md border border-line bg-white p-2">
          <input type="checkbox" checked={selected.includes(option.key)} onChange={() => toggle(option.key)} />
          {option.key}. {option.text}
        </label>
      ))}
    </div>
  );
}

// 中文说明：判断题答案编辑器限制答案只能是“正确”或“错误”。
function TrueFalseAnswerEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {["正确", "错误"].map((item) => (
        <button key={item} type="button" onClick={() => onChange(item)} className={`rounded-md border px-3 py-2 ${value === item ? "border-accent bg-teal-50 text-accent" : "border-line bg-white"}`}>
          {item}
        </button>
      ))}
    </div>
  );
}

// 中文说明：填空题答案编辑器使用文本框，允许用 / 分隔多个可接受答案。
function FillBlankAnswerEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <input className="focus-ring w-full rounded-md border border-line px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)} placeholder="多个答案用 / 分隔" />;
}

// 中文说明：主观题答案编辑器使用长文本，通常配合评分标准一起保存。
function SubjectiveAnswerEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <textarea className="focus-ring min-h-32 w-full rounded-md border border-line px-3 py-2 leading-7" value={value} onChange={(event) => onChange(event.target.value)} />;
}
