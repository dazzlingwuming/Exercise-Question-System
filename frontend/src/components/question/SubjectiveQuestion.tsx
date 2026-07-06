// 中文说明：主观题组件负责渲染长文本输入框，提交后由后端返回自评模式。
export function SubjectiveQuestion({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <textarea
      className="focus-ring min-h-40 w-full rounded-md border border-line bg-white px-3 py-3 leading-7"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="输入你的作答，提交后根据参考答案自评"
    />
  );
}
