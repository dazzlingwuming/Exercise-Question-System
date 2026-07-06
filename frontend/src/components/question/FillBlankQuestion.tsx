// 中文说明：填空题组件负责渲染单行输入框，并回传用户填写的原始文本。
export function FillBlankQuestion({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      className="focus-ring w-full rounded-md border border-line bg-white px-3 py-3"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="填写答案"
    />
  );
}
