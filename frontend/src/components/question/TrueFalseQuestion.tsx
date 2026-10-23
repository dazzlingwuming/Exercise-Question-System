import { Check, X } from "lucide-react";

// 中文说明：判断题组件负责提供“正确/错误”二选一按钮，并回传中文答案；提交后标出正确项。
export function TrueFalseQuestion({
  value,
  onChange,
  correctValue = "",
}: {
  value: string;
  onChange: (value: string) => void;
  correctValue?: string;
}) {
  const options = [
    { key: "正确", icon: Check, tone: "good" as const },
    { key: "错误", icon: X, tone: "bad" as const },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map(({ key, icon: Icon, tone }) => {
        const selected = value === key;
        const isCorrect = Boolean(correctValue) && correctValue === key;
        const isWrong = Boolean(correctValue) && selected && !isCorrect;
        const state = isCorrect ? "is-correct" : isWrong ? "is-wrong" : selected ? "is-selected" : "";
        return (
          <button
            key={key}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(key)}
            className={`option-card items-center justify-center py-5 ${state}`}
          >
            <span
              className={`grid h-9 w-9 place-items-center rounded-xl border ${
                selected
                  ? tone === "good"
                    ? "border-good-border bg-good-soft text-good"
                    : "border-bad-border bg-bad-soft text-bad"
                  : "border-line bg-panel-2 text-muted"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-base font-semibold">{key}</span>
            {correctValue && isCorrect && <span className="text-xs font-semibold text-good">正确答案</span>}
            {correctValue && isWrong && <span className="text-xs font-semibold text-bad">你的答案</span>}
          </button>
        );
      })}
    </div>
  );
}
