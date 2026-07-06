import { Check, FileText, Play } from "lucide-react";
import { useState } from "react";
import { previewImport, resetCommitImport, type ImportPreview as ImportPreviewType } from "../api/imports";
import { Badge } from "../components/common/Badge";
import { ErrorState } from "../components/common/ErrorState";
import { ImportErrorList } from "../components/import/ImportErrorList";
import { ImportPreview } from "../components/import/ImportPreview";

export function ImportPage() {
  const [preview, setPreview] = useState<ImportPreviewType | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const runPreview = async () => {
    setLoading(true);
    setError("");
    try {
      setPreview(await previewImport());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const runCommit = async () => {
      setLoading(true);
      setError("");
      try {
      const ok = window.confirm("确认物理删除旧题库、旧答题记录、旧修改历史和旧练习会话，然后重新导入当前题库吗？");
      if (!ok) return;
      const result = await resetCommitImport();
      setMessage(`已物理清空旧题库并重新导入 ${result.imported_count} 道题。`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="panel rounded-lg p-5">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" />
            <h1 className="text-xl font-semibold">题库导入</h1>
          </div>
          <div className="rounded-md bg-surface p-3 text-sm">data/个人题库/agent基础题目.md</div>
          <div className="mt-4 flex gap-2">
            <button className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white" onClick={runPreview} disabled={loading}>
              <Play className="h-4 w-4" />
              解析预览
            </button>
            <button className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-sm font-medium" onClick={runCommit} disabled={!preview || loading}>
              <Check className="h-4 w-4" />
              确认重置导入
            </button>
          </div>
          {message && <div className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
        </div>
        {preview && <ImportPreview preview={preview} />}
      </section>
      {error && <ErrorState message={error} />}
      {preview && (
        <>
          <ImportErrorList preview={preview} />
          <section className="panel rounded-lg p-5">
            <h2 className="mb-4 font-semibold">题目预览</h2>
            <div className="space-y-3">
              {preview.questions.slice(0, 20).map((question) => (
                <div key={question.id} className="rounded-md border border-line bg-white p-3">
                  <div className="mb-2 flex gap-2">
                    <Badge tone="accent">{question.type_label}</Badge>
                    {question.difficulty && <Badge>{question.difficulty}</Badge>}
                  </div>
                  <div className="line-clamp-2 text-sm">{question.stem}</div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
