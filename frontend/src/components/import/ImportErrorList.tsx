import type { ImportPreview } from "../../api/imports";

export function ImportErrorList({ preview }: { preview: ImportPreview }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <List title="解析警告" items={preview.warnings.map((item) => `${item.part_id ?? item.question_id ?? ""} ${item.message}`)} />
      <List title="解析错误" items={preview.errors.map((item) => `#${item.index} ${item.message}：${item.raw_text_preview}`)} />
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="panel rounded-lg p-4">
      <h3 className="mb-3 font-medium">{title}</h3>
      {items.length === 0 ? (
        <div className="text-sm text-muted">暂无</div>
      ) : (
        <div className="max-h-72 space-y-2 overflow-auto text-sm leading-6 text-muted">
          {items.map((item, index) => (
            <div key={index} className="rounded-md bg-surface p-2">
              {item}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
