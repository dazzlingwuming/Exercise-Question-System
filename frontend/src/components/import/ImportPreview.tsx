import type { ImportPreview as ImportPreviewType } from "../../api/imports";

export function ImportPreview({ preview }: { preview: ImportPreviewType }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Metric label="解析成功" value={preview.success_count} />
      <Metric label="警告" value={preview.warnings.length} />
      <Metric label="错误" value={preview.errors.length} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel rounded-lg p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}
