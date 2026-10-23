// 中文说明：主观题组件负责渲染长文本输入框，提交后由后端返回自评模式。
export function SubjectiveQuestion({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="rounded-2xl border border-line bg-panel-2/60 p-4">
      <textarea
        aria-label="你的作答"
        className="focus-ring min-h-44 w-full rounded-xl border border-line bg-panel px-4 py-3.5 text-[0.95rem] leading-7"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="写下你的思路，提交后对照参考答案自评"
      />
      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        <span>建议按「结论 → 原理 → 例子」的结构作答。</span>
        <span className="tabular-nums">{value.length} 字</span>
      </div>
    </div>
  );
}
