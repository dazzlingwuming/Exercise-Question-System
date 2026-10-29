import { Check, LoaderCircle, Sparkles, X } from "lucide-react";
import { Dialog } from "../common/Dialog";
import { useState } from "react";
import { parseAiQuestionDraft, type AiParseIssue, type AiQuestionParseResponse } from "../../api/ai";
import type { QuestionCreatePayload } from "../../types/question";
import { aiConfigForRole, loadStoredAiConfig, saveStoredAiConfig } from "../../utils/aiConfigStorage";
import { AiConfigFields } from "../ai/AiConfigFields";
import { ImageAttachments } from "../content/ImageAttachments";
import { RichContent } from "../content/RichContent";
import type { ManagedImage } from "../../api/media";

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
  const [images, setImages] = useState<ManagedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [keepImages, setKeepImages] = useState(false);
  const [config, setConfig] = useState(loadStoredAiConfig);

  if (!open) return null;

  const parse = async () => {
    if (loading || uploading) return;
    if (!sourceText.trim() && !images.length) {
      setError("请粘贴题目文本或添加题目图片。");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setResult(await parseAiQuestionDraft({ ...aiConfigForRole(config, "generation"), source_text: sourceText, image_ids: images.map(image => image.id), keep_source_images: keepImages, expected_type: expectedType || undefined }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} title="AI 解析为题目草稿" onClose={onClose} busy={loading || uploading} className="max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              <span className="text-lg font-semibold">从文字或图片整理题目</span>
            </div>
            <p className="mt-1 text-sm leading-6 text-muted">粘贴文字、截图或上传题目照片。先识别，再核对；缺失的答案和模糊条件会标记出来。</p>
          </div>
          <button className="rounded-md border border-line bg-panel p-2" type="button" disabled={loading || uploading} onClick={onClose} aria-label="关闭解析窗口"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px]">
          <label className="block">
            <span className="mb-1 block text-sm text-muted">预期题型</span>
            <select disabled={loading || uploading} className="focus-ring w-full rounded-md border border-line px-3 py-2" value={expectedType} onChange={(event) => { setExpectedType(event.target.value); setResult(null); }}>
              <option value="">自动识别</option>
              {typeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <div className="rounded-md bg-surface p-3 text-xs leading-5 text-muted">一次只解析一道题。原文会保留在此窗口中，解析失败后可修改并重试。</div>
        </div>
        <div className="mt-3"><ImageAttachments images={images} onChange={value => { setImages(value); setResult(null); }} disabled={loading} onBusyChange={setUploading}>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">原始文本</span>
          <textarea disabled={loading || uploading} className="focus-ring min-h-36 w-full rounded-md border border-line px-3 py-2 text-sm leading-6" value={sourceText} onChange={(event) => { setSourceText(event.target.value); setResult(null); }} placeholder="输入题目，或在这里直接粘贴截图。可以补充：只识别第 2 题……" />
        </label>
        </ImageAttachments></div>
        {images.length > 0 && <label className="mt-3 flex items-start gap-2 text-sm text-muted">
          <input type="checkbox" disabled={loading || uploading} checked={keepImages} onChange={event => { setKeepImages(event.target.checked); setResult(null); }} className="mt-1" />
          <span>将原图保留为题目材料<span className="block text-xs leading-6">仅在原图不含答案时勾选；否则请先裁剪题图，避免练习时提前看到答案。</span></span>
        </label>}

        <details className="mt-3 rounded-md border border-line p-3"><summary className="text-sm text-muted">AI 设置</summary><div className="mt-3"><AiConfigFields config={config} disabled={loading || uploading} onChange={value => { setConfig(value); saveStoredAiConfig(value); }} /></div></details>
        {error && <div role="alert" className="mt-3 rounded-md bg-bad-soft p-3 text-sm text-bad">{error}</div>}
        {result && <ParseResult result={result} />}

        <div className="sticky -bottom-5 mt-4 flex flex-wrap justify-end gap-2 border-t border-line bg-panel py-3">
          <button className="rounded-md border border-line bg-panel px-4 py-2 text-sm" type="button" disabled={loading || uploading} onClick={onClose}>取消</button>
          {result && <button disabled={loading || uploading} className="inline-flex items-center gap-2 rounded-md border border-line bg-panel px-4 py-2 text-sm font-medium" type="button" onClick={() => onApply(result.candidate, result.issues)}>
            <Check className="h-4 w-4" />应用到表单
          </button>}
          <button className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent disabled:opacity-60" type="button" onClick={parse} disabled={loading || uploading}>
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "正在解析…" : result ? "重新解析" : "解析草稿"}
          </button>
        </div>
    </Dialog>
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
      <div className="mt-3 border-t border-line pt-3"><RichContent content={result.candidate.stem} /></div>
      {result.candidate.options.map(option => <div key={option.key} className="mt-2 flex gap-2 text-sm"><strong>{option.key}.</strong><RichContent content={option.text} /></div>)}
      {Boolean(result.image_count) && <p className="mt-3 text-xs text-muted">已识别 {result.image_count} 张图片 · {result.model}</p>}
      {result.issues.length > 0 ? (
        <div className="mt-3 space-y-2 text-sm">
          {result.issues.map((item, index) => (
            <div key={`${item.code}-${index}`} className={`rounded-md p-2 ${item.severity === "error" ? "bg-bad-soft text-bad" : item.severity === "warning" ? "bg-warn-soft text-warn" : "bg-surface text-muted"}`}>
              <span className="font-medium">{item.field ? `${item.field}：` : ""}{item.message}</span>
              {item.suggestion && <span className="block mt-1 text-xs opacity-90">建议：{item.suggestion}</span>}
            </div>
          ))}
        </div>
      ) : <div className="mt-2 text-sm text-good">未发现确定性结构问题；应用后仍请人工核对题意和答案。</div>}
    </section>
  );
}
