// 中文说明：判断题组件负责提供“正确/错误”二选一按钮，并回传中文答案。
export function TrueFalseQuestion({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {["正确", "错误"].map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={`rounded-md border px-4 py-4 text-left font-medium transition ${
            value === item ? "border-accent bg-teal-50 text-accent" : "border-line bg-white hover:border-accent"
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
