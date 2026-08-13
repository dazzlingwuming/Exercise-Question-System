import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { ImportPreview } from "../../api/imports";

export function ImportErrorList({ preview }: { preview: ImportPreview }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <List title="解析警告" items={preview.warnings.map((item) => `${item.part_id ?? item.question_id ?? ""}${item.field ? ` · ${item.field}` : ""} ${item.message}`)} />
      <ErrorList errors={preview.errors} />
      <List title="数据库重复检测" items={preview.database_conflicts.map((item) => `${item.question_id} · ${item.status === "same" ? "内容相同，将跳过" : "内容不同，阻断导入"}\n${item.message}`)} />
    </div>
  );
}

function ErrorList({ errors }: { errors: ImportPreview["errors"] }) {
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());

  const toggle = (index: number) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <section className="panel rounded-lg p-4">
      <h3 className="mb-3 font-medium">解析错误</h3>
      {errors.length === 0 ? (
        <div className="text-sm text-muted">暂无</div>
      ) : (
        <div className="max-h-72 space-y-2 overflow-auto text-sm leading-6 text-muted">
          {errors.map((item, index) => {
            const isExpanded = expanded.has(index);
            const summary = item.raw_text_preview || "（无可预览原文）";
            const visibleSummary = isExpanded || summary.length <= 140 ? summary : `${summary.slice(0, 140)}…`;

            return (
              <div key={`${item.index}-${item.question_id ?? "file"}-${index}`} className="rounded-md bg-surface p-2">
                <div className="font-medium text-ink">
                  #{item.index}{item.question_id ? ` · ${item.question_id}` : ""}{item.field ? ` · ${item.field}` : ""}：{item.message}
                </div>
                <div className="mt-1 text-xs text-muted">原文摘要（最多 400 字），仅用于定位错误，不是完整题块。</div>
                <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-xs leading-5 text-muted">{visibleSummary}</pre>
                {summary.length > 140 && (
                  <button className="mt-1 inline-flex items-center gap-1 text-xs text-accent underline-offset-2 hover:underline" type="button" onClick={() => toggle(index)} aria-expanded={isExpanded}>
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {isExpanded ? "收起原文摘要" : "展开原文摘要"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
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
            <div key={index} className="whitespace-pre-line rounded-md bg-surface p-2">
              {item}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
