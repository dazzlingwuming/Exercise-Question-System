import { Check, LoaderCircle, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { parseAiQuestionDraft, type AiParseIssue, type AiQuestionParseResponse } from "../../api/ai";
import type { QuestionCreatePayload } from "../../types/question";
import { aiConfigForRole, loadStoredAiConfig } from "../../utils/aiConfigStorage";

type TypeOption = readonly [string, string];

export function AiQuestionParseDialog({
  open,
  typeOptions,
  onClose,
  onApply,
}: {
  open: boolean;
  typeOptions: readonly TypeOption[];
  onClose: () => void;
  onApply: (candidate: QuestionCreatePayload, issues: AiParseIssue[]) => void;
}) {
  const [sourceText, setSourceText] = useState("");
  const [expectedType, setExpectedType] = useState("");
  const [result, setResult] = useState<AiQuestionParseResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const parse = async () => {
    if (!sourceText.trim()) {
      setError("请先粘贴一道题的原始文本。");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const config = aiConfigForRole(loadStoredAiConfig(), "generation");
      setResult(await parseAiQuestionDraft({ ...config, source_text: sourceText, expected_type: expectedType || undefined }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold">AI 解析为题目草稿</h2>
            </div>
            <p className="mt-1 text-sm leading-6 text-muted">粘贴一道题的题干、选项、答案和解析。AI 只生成草稿，不会自动保存；不完整或冲突的信息会标记出来。</p>
          </div>
          <button className="rounded-md border border-line bg-white p-2" type="button" onClick={onClose} aria-label="关闭解析窗口"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px]">
          <label className="block">
            <span className="mb-1 block text-sm text-muted">预期题型</span>
            <select className="focus-ring w-full rounded-md border border-line px-3 py-2" value={expectedType} onChange={(event) => setExpectedType(event.target.value)}>
              <option value="">自动识别</option>
              {typeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <div className="rounded-md bg-surface p-3 text-xs leading-5 text-muted">一次只解析一道题。原文会保留在此窗口中，解析失败后可修改并重试。</div>
        </div>
        <label className="mt-3 block">
          <span className="mb-1 block text-sm text-muted">原始文本</span>
          <textarea className="focus-ring min-h-56 w-full rounded-md border border-line px-3 py-2 text-sm leading-6" value={sourceText} onChange={(event) => { setSourceText(event.target.value); setResult(null); }} placeholder="例如：题干、A/B/C/D 选项、正确答案、解析或评分标准……" />
        </label>

        {error && <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {result && <ParseResult result={result} />}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button className="rounded-md border border-line bg-white px-4 py-2 text-sm" type="button" onClick={onClose}>取消</button>
          {result && <button className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-sm font-medium" type="button" onClick={() => onApply(result.candidate, result.issues)}>
            <Check className="h-4 w-4" />应用到表单
          </button>}
          <button className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60" type="button" onClick={parse} disabled={loading}>
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "正在解析…" : result ? "重新解析" : "解析草稿"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ParseResult({ result }: { result: AiQuestionParseResponse }) {
  const errors = result.issues.filter((item) => item.severity === "error");
  return (
    <section className="mt-4 rounded-md border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-medium">解析结果：{result.candidate.type_label ?? result.candidate.type}</div>
        <div className="text-xs text-muted">识别题型：{result.detected_type ?? "未确定"} · {errors.length ? `${errors.length} 个需处理问题` : "可应用后继续检查"}</div>
      </div>
      {result.issues.length > 0 ? (
        <div className="mt-3 space-y-2 text-sm">
          {result.issues.map((item, index) => (
            <div key={`${item.code}-${index}`} className={`rounded-md p-2 ${item.severity === "error" ? "bg-red-50 text-red-700" : item.severity === "warning" ? "bg-amber-50 text-amber-800" : "bg-surface text-muted"}`}>
              <span className="font-medium">{item.field ? `${item.field}：` : ""}{item.message}</span>
              {item.suggestion && <span className="block mt-1 text-xs opacity-90">建议：{item.suggestion}</span>}
            </div>
          ))}
        </div>
      ) : <div className="mt-2 text-sm text-emerald-700">未发现确定性结构问题；应用后仍请人工核对题意和答案。</div>}
    </section>
  );
}
