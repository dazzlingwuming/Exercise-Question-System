// 中文说明：填空题组件负责渲染单行输入框，并回传用户填写的原始文本。
export function FillBlankQuestion({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="rounded-2xl border border-line bg-panel-2/60 p-4">
      <input
        aria-label="你的作答"
        className="focus-ring w-full rounded-xl border border-line bg-panel px-4 py-3.5 text-base"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="在这里填写答案"
      />
      <p className="mt-2 text-[11px] text-muted">多个可接受答案请用 / 分隔。</p>
    </div>
  );
}
