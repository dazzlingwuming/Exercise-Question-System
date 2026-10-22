import { Save, Sparkles, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { recommendCollectionPlacements, type AiParseIssue } from "../api/ai";
import { getCollectionTree } from "../api/collections";
import { createQuestion } from "../api/questions";
import { ErrorState } from "../components/common/ErrorState";
import { AiCollectionPlacement, type CollectionRecommendation } from "../components/collection/AiCollectionPlacement";
import { AnswerEditor } from "../components/question/AnswerEditor";
import { AiQuestionParseDialog } from "../components/question/AiQuestionParseDialog";
import { ROOT_COLLECTION_ID, UNFILED_COLLECTION_ID, type CollectionNode } from "../types/collection";
import type { Option, QuestionCreatePayload } from "../types/question";
import { aiConfigForRole, loadStoredAiConfig } from "../utils/aiConfigStorage";

import { MarkdownEditor } from "../components/content/MarkdownEditor";
import { PageHeader } from "../components/common/PageHeader";

const TYPE_OPTIONS: Array<[string, string]> = [
  ["single_choice", "单选题"],
  ["multiple_choice", "多选题"],
  ["true_false", "判断题"],
  ["fill_blank", "填空题"],
  ["short_answer", "简答题"],
  ["essay", "论述题"],
  ["flow_order", "流程排序题"],
  ["concept_analysis", "概念辨析题"],
  ["scenario_analysis", "场景分析题"],
  ["interview", "面试题"],
  ["system_design", "系统设计题"],
  ["debug_analysis", "Debug / 日志分析题"],
  ["code_reading", "代码阅读 / 伪代码设计题"],
  ["project_follow_up", "项目追问模拟"],
  ["mock_interview", "模拟面试套卷"],
];

const DEFAULT_OPTIONS: Option[] = [
  { key: "A", text: "" },
  { key: "B", text: "" },
  { key: "C", text: "" },
  { key: "D", text: "" },
];

export function QuestionCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedCollectionId = searchParams.get("collection_id");
  const [form, setForm] = useState<QuestionCreatePayload>({
    type: "single_choice",
    type_label: "单选题",
    difficulty: "2",
    tags: ["手动新增"],
    directions: [],
    stem: "",
    material: "",
    options: DEFAULT_OPTIONS,
    standard_answer: "",
    explanation: "",
    exam_points: [],
    common_mistakes: "",
    follow_up_question: "",
    scoring_standard: "",
    reason: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const onUploadingChange = useCallback((active: boolean) => setUploadCount((count) => Math.max(0, count + (active ? 1 : -1))), []);
  const [parseOpen, setParseOpen] = useState(false);
  const [aiParseIssues, setAiParseIssues] = useState<AiParseIssue[]>([]);
  const [collectionTree, setCollectionTree] = useState<CollectionNode[]>([]);
  const [collectionId, setCollectionId] = useState<string | null>(requestedCollectionId && requestedCollectionId !== ROOT_COLLECTION_ID ? requestedCollectionId : null);
  const [placementConfirmed, setPlacementConfirmed] = useState(Boolean(requestedCollectionId && requestedCollectionId !== ROOT_COLLECTION_ID));
  const [recommendation, setRecommendation] = useState<CollectionRecommendation | null>(null);
  const [placementLoading, setPlacementLoading] = useState(false);

  useEffect(() => {
    getCollectionTree().then(setCollectionTree).catch((err) => setError((err as Error).message));
  }, []);

  const update = <K extends keyof QuestionCreatePayload>(key: K, value: QuestionCreatePayload[K]) => {
    setForm({ ...form, [key]: value });
    if (recommendation && ["type", "stem", "material", "tags", "directions", "exam_points"].includes(String(key))) {
      setRecommendation(null);
      setPlacementConfirmed(false);
    }
  };
  const updateOption = (index: number, value: Partial<Option>) => {
    const options = [...form.options];
    options[index] = { ...options[index], ...value };
    update("options", options);
  };
  const addOption = () => update("options", [...form.options, { key: nextOptionKey(form.options), text: "" }]);
  const removeOption = (index: number) => update("options", form.options.filter((_, itemIndex) => itemIndex !== index));

  const save = async () => {
    if (saving) return;
    if (uploadCount > 0) { setError("图片仍在上传，请等待完成后再保存。"); return; }
    const validation = validateForm(form);
    if (validation) {
      setError(validation);
      return;
    }
    if (!collectionId) {
      setError("请先选择题目的归档集合；也可以明确选择“未归类”。");
      return;
    }
    if (!placementConfirmed) {
      setError("AI 已预填归档建议，请确认该位置后再保存。");
      return;
    }
    setError(""); setSaving(true);
    try {
      const created = await createQuestion({ ...normalizePayload(form), collection_id: collectionId });
      navigate(`/questions/${created.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally { setSaving(false); }
  };

  const recommendPlacement = async () => {
    if (!form.stem.trim()) {
      setError("请先填写题干，再让 AI 推荐归档位置。");
      return;
    }
    setPlacementLoading(true);
    setError("");
    try {
      const response = await recommendCollectionPlacements({
        ...aiConfigForRole(loadStoredAiConfig(), "generation"),
        questions: [{
          reference_id: "manual-draft",
          type: form.type,
          stem: form.stem,
          material: form.material,
          tags: form.tags,
          directions: form.directions,
          exam_points: form.exam_points,
          current_collection_id: collectionId,
        }],
      });
      const item = response.items[0];
      if (!item) throw new Error("AI 没有返回归档建议");
      setCollectionId(item.recommended_collection_id);
      setRecommendation({ collectionId: item.recommended_collection_id, confidence: item.confidence, reason: item.reason });
      setPlacementConfirmed(false);
    } catch (err) {
      setError(`AI 推荐失败：${(err as Error).message} 请在下方人工选择集合。`);
    } finally {
      setPlacementLoading(false);
    }
  };

  const isChoice = ["single_choice", "multiple_choice"].includes(form.type);
  const isTrueFalse = form.type === "true_false";

  const applyAiDraft = (candidate: QuestionCreatePayload, issues: AiParseIssue[]) => {
    if (form.stem.trim() && !window.confirm("当前表单已有内容。应用 AI 草稿会覆盖已有字段，是否继续？")) return;
    const typeLabel = TYPE_OPTIONS.find(([value]) => value === candidate.type)?.[1] ?? candidate.type_label ?? candidate.type;
    setForm({ ...candidate, collection_id: undefined, type_label: typeLabel, reason: candidate.reason || "AI 原始文本解析草稿，请人工确认后保存" });
    if (recommendation) {
      setRecommendation(null);
      setPlacementConfirmed(false);
    }
    setAiParseIssues(issues);
    setError("");
    setParseOpen(false);
  };

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="MAKE ROOM FOR NEW KNOWLEDGE" title="收集一道好题" description="把值得练习的知识放进题库，题干、材料和解析都可以插入图片。" actions={<><button className="btn-secondary" type="button" onClick={() => setParseOpen(true)}><Sparkles className="h-4 w-4 text-accent" />从原文解析</button><Link className="btn-secondary" to="/questions">取消</Link></>} />
      {error && <ErrorState message={error} />}
      {aiParseIssues.length > 0 && (
        <section className="rounded-lg border border-warn-border bg-warn-soft p-4 text-sm text-warn">
          <div className="font-medium">AI 解析待核对</div>
          <div className="mt-2 space-y-1 leading-6">
            {aiParseIssues.map((issue, index) => <div key={`${issue.code}-${index}`}>{issue.severity === "error" ? "需处理" : "提示"}{issue.field ? ` · ${issue.field}` : ""}：{issue.message}</div>)}
          </div>
        </section>
      )}
      <EditSection title="基础信息">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="题型">
            <select
              className="focus-ring w-full rounded-md border border-line px-3 py-2"
              value={form.type}
              onChange={(event) => {
                const type = event.target.value;
                const label = TYPE_OPTIONS.find(([value]) => value === type)?.[1] ?? type;
                const options = type === "true_false" ? [{ key: "A", text: "正确" }, { key: "B", text: "错误" }] : isObjectiveChoice(type) ? DEFAULT_OPTIONS : [];
                setForm({ ...form, type, type_label: label, options, standard_answer: type === "true_false" ? "正确" : "" });
                setRecommendation(null);
                setPlacementConfirmed(false);
              }}
            >
              {TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="难度">
            <input className="focus-ring w-full rounded-md border border-line px-3 py-2" value={form.difficulty ?? ""} onChange={(event) => update("difficulty", event.target.value)} />
          </Field>
          <Field label="标签">
            <input className="focus-ring w-full rounded-md border border-line px-3 py-2" value={form.tags.join("、")} onChange={(event) => update("tags", splitList(event.target.value))} />
          </Field>
          <Field label="题目方向">
            <input className="focus-ring w-full rounded-md border border-line px-3 py-2" value={form.directions.join("、")} onChange={(event) => update("directions", splitList(event.target.value))} placeholder="Tool Calling、Agent 基础" />
          </Field>
        </div>
      </EditSection>
      <EditSection title="归档位置">
        <AiCollectionPlacement
          tree={collectionTree}
          selectedId={collectionId}
          recommendation={recommendation}
          confirmed={placementConfirmed}
          loading={placementLoading}
          onRecommend={() => void recommendPlacement()}
          onConfirm={() => setPlacementConfirmed(true)}
          onSelect={(id) => {
            setCollectionId(id);
            setRecommendation(null);
            setPlacementConfirmed(Boolean(id));
            if (id === UNFILED_COLLECTION_ID) setError("");
          }}
        />
      </EditSection>
      <EditSection title="题干内容">
        <MarkdownEditor onUploadingChange={onUploadingChange} label="题干" value={form.stem} onChange={(value) => update("stem", value)} />
      </EditSection>
      <EditSection title="材料"><MarkdownEditor onUploadingChange={onUploadingChange} label="材料（可选）" value={form.material ?? ""} onChange={(value) => update("material", value)} /></EditSection>
      {isChoice && (
        <EditSection title="选项设置">
          <div className="space-y-2">
            {form.options.map((option, index) => (
              <div key={`${option.key}-${index}`} className="grid gap-2 md:grid-cols-[80px_1fr_40px]">
                <input className="focus-ring rounded-md border border-line px-2 py-2" value={option.key} onChange={(event) => updateOption(index, { key: event.target.value.toUpperCase() })} />
                <MarkdownEditor onUploadingChange={onUploadingChange} label={`选项 ${option.key}`} rows={2} value={option.text} onChange={(value) => updateOption(index, { text: value })} />
                <button aria-label={`删除选项 ${option.key}`} className="h-fit rounded-md border border-line bg-panel p-2" type="button" onClick={() => removeOption(index)}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <button className="rounded-md border border-line bg-panel px-3 py-2 text-sm" type="button" onClick={addOption}>新增选项</button>
          </div>
        </EditSection>
      )}
      {isTrueFalse && (
        <EditSection title="判断选项">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-md border border-line bg-panel p-3">A. 正确</div>
            <div className="rounded-md border border-line bg-panel p-3">B. 错误</div>
          </div>
        </EditSection>
      )}
      <EditSection title={isObjective(form.type) ? "标准答案" : "参考答案"}>
        <AnswerEditor onUploadingChange={onUploadingChange} type={form.type} options={form.options} value={form.standard_answer} onChange={(value) => update("standard_answer", value)} />
      </EditSection>
      <EditSection title="解析与考察点">
        <div className="grid gap-3">
          <MarkdownEditor onUploadingChange={onUploadingChange} label="详细解析" value={form.explanation ?? ""} onChange={(value) => update("explanation", value)} />
          <Field label="考察点"><input className="focus-ring w-full rounded-md border border-line px-3 py-2" value={form.exam_points.join("、")} onChange={(event) => update("exam_points", splitList(event.target.value))} /></Field>
          <Field label="常见错误"><textarea className="focus-ring min-h-20 w-full rounded-md border border-line px-3 py-2" value={form.common_mistakes ?? ""} onChange={(event) => update("common_mistakes", event.target.value)} /></Field>
          <Field label="面试延伸追问"><textarea className="focus-ring min-h-20 w-full rounded-md border border-line px-3 py-2" value={form.follow_up_question ?? ""} onChange={(event) => update("follow_up_question", event.target.value)} /></Field>
          <Field label="评分标准"><textarea className="focus-ring min-h-20 w-full rounded-md border border-line px-3 py-2" value={form.scoring_standard ?? ""} onChange={(event) => update("scoring_standard", event.target.value)} /></Field>
        </div>
      </EditSection>
      <EditSection title="创建说明">
        <textarea className="focus-ring min-h-20 w-full rounded-md border border-line px-3 py-2" value={form.reason ?? ""} onChange={(event) => update("reason", event.target.value)} placeholder="例如：补充工具调用基础题" />
      </EditSection>
      {uploadCount > 0 && <p role="status" className="text-sm text-accent">图片正在上传，请等待完成后保存题目。</p>}
      <button className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent" onClick={save} disabled={saving || uploadCount > 0}>
        <Save className="h-4 w-4" />
        {saving ? "保存中…" : "保存题目"}
      </button>
      <AiQuestionParseDialog open={parseOpen} typeOptions={TYPE_OPTIONS} onClose={() => setParseOpen(false)} onApply={applyAiDraft} />
    </div>
  );
}

function EditSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="panel p-5"><h2 className="mb-4 font-semibold">{title}</h2>{children}</section>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1 block text-sm text-muted">{label}</span>{children}</label>;
}

function splitList(value: string) {
  return value.split(/[、,，;；]/).map((item) => item.trim()).filter(Boolean);
}

function nextOptionKey(options: Option[]) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return alphabet[options.length] ?? "Z";
}

function isObjectiveChoice(type: string) {
  return ["single_choice", "multiple_choice"].includes(type);
}

function isObjective(type: string) {
  return ["single_choice", "multiple_choice", "true_false", "fill_blank"].includes(type);
}

function normalizePayload(form: QuestionCreatePayload): QuestionCreatePayload {
  const options = form.type === "true_false" ? [{ key: "A", text: "正确" }, { key: "B", text: "错误" }] : form.options.filter((option) => option.key.trim() || option.text.trim());
  return { ...form, options };
}

function validateForm(question: QuestionCreatePayload) {
  if (!question.stem.trim()) return "题干不能为空";
  if (isObjectiveChoice(question.type) && question.options.filter((option) => option.key.trim() && option.text.trim()).length < 2) return "选择题至少需要 2 个选项";
  if (isObjective(question.type) && !String(question.standard_answer ?? "").trim()) return "客观题标准答案不能为空";
  if (question.type === "single_choice" && !question.options.some((option) => option.key === question.standard_answer)) return "单选题标准答案必须来自已有选项";
  if (question.type === "multiple_choice") {
    const keys = new Set(question.options.map((option) => option.key));
    const answers = String(question.standard_answer ?? "").match(/[A-Z]/gi)?.map((item) => item.toUpperCase()) ?? [];
    if (answers.length === 0 || answers.some((item) => !keys.has(item))) return "多选题标准答案必须来自已有选项";
  }
  if (!isObjective(question.type) && !String(question.standard_answer ?? "").trim()) return "主观题参考答案不能为空";
  if (!isObjective(question.type) && !String(question.scoring_standard ?? "").trim()) return "主观题评分标准不能为空";
  return "";
}
