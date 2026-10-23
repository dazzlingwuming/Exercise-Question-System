import { Check, ChevronDown, ChevronUp, Copy, Download, Play, RotateCcw, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { getCollectionTree } from "../api/collections";
import { commitImport, previewImport, resetCommitImport, type ImportPreview as ImportPreviewType } from "../api/imports";
import { Badge } from "../components/common/Badge";
import { ErrorState } from "../components/common/ErrorState";
import { PageHeader } from "../components/common/PageHeader";
import { CollectionPicker } from "../components/collection/CollectionPicker";
import { RichContent } from "../components/content/RichContent";
import { ImportErrorList } from "../components/import/ImportErrorList";
import { ImportPreview } from "../components/import/ImportPreview";
import { QUESTION_BANK_GPT_TEMPLATE_V2 } from "../constants/questionBankTemplate";
import type { CollectionNode } from "../types/collection";

export function ImportPage() {
  const [text, setText] = useState("");
  const [batchName, setBatchName] = useState("");
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [collectionTree, setCollectionTree] = useState<CollectionNode[]>([]);
  const [preview, setPreview] = useState<ImportPreviewType | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedQuestionIds, setExpandedQuestionIds] = useState<Set<string>>(() => new Set());

  const importInput = () => ({
    ...(text.trim() ? { text, batchName: batchName.trim() } : {}),
    ...(collectionId ? { collectionId } : {}),
  });
  const canCommit = Boolean(preview && preview.blocking_error_count === 0 && collectionId);

  useEffect(() => {
    getCollectionTree().then(setCollectionTree).catch((err) => setError((err as Error).message));
  }, []);

  const updateText = (value: string) => {
    setText(value);
    setPreview(null);
    setMessage("");
    setExpandedQuestionIds(new Set());
  };

  const toggleQuestionPreview = (questionId: string) => {
    setExpandedQuestionIds((current) => {
      const next = new Set(current);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const runPreview = async ({ preserveMessage = false } = {}) => {
    if (text.trim() && !batchName.trim()) {
      setError("请填写本次导入批次名称，通常保留原 Markdown 文件名即可。");
      return;
    }
    if (!collectionId) {
      setError("请先选择这批题目的目标集合；也可以明确选择“未归类”。");
      return;
    }
    setLoading(true);
    setError("");
    if (!preserveMessage) setMessage("");
    try {
      setPreview(await previewImport(importInput()));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const runAppend = async () => {
    if (!canCommit) return;
    setLoading(true);
    setError("");
    try {
      const result = await commitImport(importInput());
      setMessage(`已追加导入 ${result.imported_count} 道题；跳过 ${result.skipped_count} 道内容相同的已有题。`);
      await runPreview({ preserveMessage: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const runReset = async () => {
    if (!canCommit) return;
    const confirmation = window.prompt("这会删除题目、答题记录、修改历史和 AI 相关记录。请输入“重置题库”继续：");
    if (confirmation !== "重置题库") {
      setMessage("已取消重置，未修改题库。");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await resetCommitImport(importInput());
      setMessage(`已重置题目数据并导入 ${result.imported_count} 道题。集合树仍然保留，旧题目及关联练习数据已删除。`);
      await runPreview({ preserveMessage: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const copyGptTemplate = async () => {
    try {
      await navigator.clipboard.writeText(QUESTION_BANK_GPT_TEMPLATE_V2);
      setMessage("已复制一份完整 GPT 题库模板：顶部是生成规则，后面是正式示例。把这份模板与原始资料一起交给 GPT，GPT 返回的新 .md 才用于导入。");
    } catch {
      const blob = new Blob([QUESTION_BANK_GPT_TEMPLATE_V2], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "question-bank-template-v2.md";
      link.click();
      URL.revokeObjectURL(url);
      setMessage("浏览器未授予剪贴板权限，已改为下载完整 GPT 题库模板。把这一份 .md 与原始资料一起交给 GPT 即可。");
    }
  };

  const downloadGptTemplate = () => {
    const blob = new Blob([QUESTION_BANK_GPT_TEMPLATE_V2], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "question-bank-template-v2.md";
    link.click();
    URL.revokeObjectURL(url);
  };

  const readFile = async (file: File) => {
    try {
      updateText(await file.text());
      setBatchName(file.name);
      setMessage(`已读取 ${file.name}，请先解析预览。`);
    } catch (err) {
      setError(`读取文件失败：${(err as Error).message}`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="QUESTION BANK"
        title="题库导入"
        description="粘贴 Markdown 或上传 .md 文件，先预览题目与字段错误，再追加导入。"
        actions={
          <>
            <Badge tone="accent">Markdown v2</Badge>
            <button className="btn-primary min-w-0 max-w-full" type="button" onClick={copyGptTemplate}>
              <Copy className="h-4 w-4 shrink-0" />复制完整 GPT 模板
            </button>
            <button className="btn-secondary min-w-0 max-w-full" type="button" onClick={downloadGptTemplate}>
              <Download className="h-4 w-4 shrink-0" />下载完整 GPT 模板
            </button>
          </>
        }
      />
      <section className="panel p-5">

        <details className="group mt-5 rounded-xl border border-warn-border bg-warn-soft/70 p-4 text-sm leading-6 text-warn">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
            格式必读（6 条规则）
            <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>只需把上方这一份完整模板与原始资料交给 GPT；模板顶部是规则，后面是所有题型的正式示例，不需要再拼接其他说明。</li>
            <li>完整模板本身用于指导 GPT，不能导入；应导入 GPT 根据原始资料生成的新 Markdown 文件。</li>
            <li>文件第一行必须是 <code>&lt;!-- question-bank-format: v2 --&gt;</code>；声明前不能有空行或导语。</li>
            <li>顶层字段从行首开始；列表、选项和 <code>|</code> 多行内容固定缩进两个空格。</li>
            <li>行内公式用 <code>$...$</code>，块公式独占段落用 <code>$$...$$</code>；中文标点写在定界符外。</li>
            <li>代码和 Mermaid 必须放在 <code>|</code> 多行字段中；选项正文只能单行。</li>
          </ul>
        </details>

        <div className="mt-5 grid items-start gap-4 lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="rounded-2xl border border-dashed border-line bg-panel-2/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Import source</p>
            <h2 className="mt-1.5 text-sm font-bold tracking-tight">从文件读取</h2>
            <p className="mt-2 text-xs leading-6 text-muted">
              选择 UTF-8 编码的 .md 文件后，内容会填入右侧输入框；不会直接上传或写入数据库。
            </p>
            <label className="btn-secondary btn-sm mt-3 cursor-pointer">
              <Upload className="h-4 w-4" aria-hidden="true" />
              选择 .md 文件
              <input
                id="question-bank-file"
                className="sr-only"
                type="file"
                aria-label="选择 Markdown 文件"
                accept=".md,.markdown,.txt,text/markdown,text/plain"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (file) void readFile(file);
                }}
              />
            </label>
            <p className="mt-2 truncate text-xs text-muted">{batchName || "尚未选择文件"}</p>
            <button
              className="mt-2 w-fit py-1 text-xs font-medium text-accent underline-offset-2 hover:underline"
              type="button"
              onClick={() => {
                updateText("");
                setBatchName("agent基础题目.md");
                setMessage("已切换为项目默认题库 data/个人题库/agent基础题目.md。");
              }}
            >
              使用项目默认题库
            </button>
          </aside>

          <div className="space-y-3">
            <label className="block">
              <span className="field-label">
                <span>导入批次名称 <span className="text-bad">*</span></span>
                <span>仅用于审计</span>
              </span>
              <input
                className="field"
                value={batchName}
                onChange={(event) => {
                  setBatchName(event.target.value);
                  setPreview(null);
                }}
                placeholder="例如：bias_variance_A批次.md"
              />
            </label>

            <div>
              <span className="field-label">
                <span>目标集合 <span className="text-bad">*</span></span>
                <span>决定归档位置</span>
              </span>
              <CollectionPicker
                tree={collectionTree}
                selectedId={collectionId}
                onSelect={(id) => { setCollectionId(id); setPreview(null); }}
                allowUnfiled
                label="请选择这批题目的归档集合"
              />
            </div>

            <label className="block">
              <span className="field-label">
                <span>题库 Markdown</span>
                <span>留空则读取默认题库</span>
              </span>
              <textarea
                className="field field--tall field--code"
                value={text}
                onChange={(event) => updateText(event.target.value)}
                placeholder="粘贴 question-bank-format v2 内容；留空则读取项目默认题库。"
              />
            </label>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary min-w-0 max-w-full disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={() => void runPreview()} disabled={loading}>
            <Play className="h-4 w-4 shrink-0" />{loading ? "正在解析…" : "解析预览"}
          </button>
          <button className="btn-secondary min-w-0 max-w-full disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={runAppend} disabled={!canCommit || loading}>
            <Check className="h-4 w-4 shrink-0" />追加导入
          </button>
          <button className="btn-danger min-w-0 max-w-full disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={runReset} disabled={!canCommit || loading}>
            <RotateCcw className="h-4 w-4 shrink-0" />重置并重新导入
          </button>
        </div>
        {message && <div className="mt-4 whitespace-pre-line rounded-md bg-good-soft p-3 text-sm text-good">{message}</div>}
      </section>

      {error && <ErrorState message={error} />}
      {preview && (
        <>
          <section className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>导入批次：{preview.batch_name}</span>
            <Badge tone={preview.is_legacy ? "neutral" : "accent"}>{preview.is_legacy ? "旧格式兼容解析" : preview.format_version}</Badge>
            {preview.blocking_error_count > 0 && <span className="text-bad">存在 {preview.blocking_error_count} 个阻断问题，不能导入。</span>}
          </section>
          <ImportPreview preview={preview} />
          <ImportErrorList preview={preview} />
          <section className="panel p-5">
            <h2 className="mb-4 font-semibold">题目预览</h2>
            <div className="space-y-3">
              {preview.questions.slice(0, 20).map((question) => (
                <QuestionPreviewCard key={question.id} question={question} expanded={expandedQuestionIds.has(question.id)} onToggle={() => toggleQuestionPreview(question.id)} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function QuestionPreviewCard({ question, expanded, onToggle }: { question: ImportPreviewType["questions"][number]; expanded: boolean; onToggle: () => void }) {
  return (
    <article className="rounded-md border border-line bg-panel p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge tone="accent">{question.type_label}</Badge>
            {question.difficulty && <Badge>{`难度 ${question.difficulty}`}</Badge>}
            <span className="text-xs text-muted">{question.id}</span>
          </div>
          <div className="text-sm font-medium">{question.title || question.id}</div>
        </div>
        <button className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-accent hover:bg-surface" type="button" onClick={onToggle} aria-expanded={expanded}>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? "收起完整预览" : "展开完整预览"}
        </button>
      </div>

      {expanded ? (
        <div className="mt-4 space-y-4 border-t border-line pt-4 text-sm">
          <PreviewField title="题干" content={question.stem} />
          <PreviewField title="材料" content={question.material} />
          <OptionsPreview options={question.options} />
          <PreviewField title="标准答案" content={formatPreviewValue(question.standard_answer)} />
          <PreviewField title="解析" content={question.explanation} />
          <PreviewField title="常见错误" content={question.common_mistakes} />
          <PreviewField title="延伸追问" content={question.follow_up_question} />
          <PreviewField title="评分标准" content={question.scoring_standard} />
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-muted">{plainTextSummary(question.stem)}</p>
      )}
    </article>
  );
}

function PreviewField({ title, content }: { title: string; content: string | null | undefined }) {
  return (
    <section>
      <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted">{title}</h3>
      {content ? <RichContent content={content} className="text-sm" /> : <p className="text-sm text-muted">（未提供）</p>}
    </section>
  );
}

function OptionsPreview({ options }: { options: ImportPreviewType["questions"][number]["options"] }) {
  return (
    <section>
      <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted">选项</h3>
      {options.length ? (
        <div className="space-y-2">
          {options.map((option) => (
            <div key={option.key} className="flex gap-2 rounded-md bg-surface px-3 py-2">
              <span className="shrink-0 font-medium">{option.key}.</span>
              <RichContent content={option.text} className="min-w-0 text-sm" />
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-muted">（未提供）</p>}
    </section>
  );
}

function formatPreviewValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join("、");
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function plainTextSummary(content: string): string {
  const plain = content
    .replace(/```[\s\S]*?```/g, "代码块")
    .replace(/\$\$[\s\S]*?\$\$/g, "公式")
    .replace(/\$[^$\n]+\$/g, "公式")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[\`*~>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return plain.length > 180 ? `${plain.slice(0, 180)}…` : plain || "（空题干）";
}
