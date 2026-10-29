import { MarkdownEditor } from "../content/MarkdownEditor";

export function SubjectiveQuestion({ value, onChange, onUploadingChange }: { value: string; onChange: (value: string) => void; onUploadingChange?: (busy: boolean) => void }) {
  return (
    <div className="rounded-2xl border border-line bg-panel-2/60 p-4">
      <MarkdownEditor
        label="你的作答"
        hideLabel
        value={value}
        onChange={onChange}
        onUploadingChange={onUploadingChange}
        placeholder="写下思路，也可以粘贴手写过程或草稿照片。提交后对照解析，并让 AI 看图点评。"
      />
      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        <span>文字与图片可以一起提交。</span>
        <span className="tabular-nums">{value.length} 字</span>
      </div>
    </div>
  );
}
