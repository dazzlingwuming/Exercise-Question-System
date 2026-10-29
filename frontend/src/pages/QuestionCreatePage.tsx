import { Save, Sparkles, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { recommendCollectionPlacements, type AiParseIssue } from "../api/ai";
import { getCollectionTree } from "../api/collections";
import { createQuestion } from "../api/questions";
import { getStudioQuestionDraft } from "../api/studio";
import { LoadingState } from "../components/common/LoadingState";
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
  const studioMessage = searchParams.get("studio_message");
  const [draftLoading, setDraftLoading] = useState(Boolean(studioMessage));
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
  const [parseOpen, setParseOpen] = useState(searchParams.get("parse") === "1");
  const [aiParseIssues, setAiParseIssues] = useState<AiParseIssue[]>([]);
  const [collectionTree, setCollectionTree] = useState<CollectionNode[]>([]);
  const [collectionId, setCollectionId] = useState<string | null>(requestedCollectionId && requestedCollectionId !== ROOT_COLLECTION_ID ? requestedCollectionId : null);
  const [placementConfirmed, setPlacementConfirmed] = useState(Boolean(requestedCollectionId && requestedCollectionId !== ROOT_COLLECTION_ID));
  const [recommendation, setRecommendation] = useState<CollectionRecommendation | null>(null);
  const [placementLoading, setPlacementLoading] = useState(false);

  useEffect(() => {
    getCollectionTree().then(setCollectionTree).catch((err) => setError((err as Error).message));
  }, []);

  useEffect(() => {
    if (!studioMessage) return;
    let active = true;
    setDraftLoading(true);
    getStudioQuestionDraft(studioMessage).then(value => { if (active) setForm(value); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setDraftLoading(false); });
    return () => { active = false; };
  }, [studioMessage]);

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

  if (draftLoading) return <LoadingState />;
  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        eyebrow="NEW QUESTION"
        title="收集一道好题"
        description="题干、材料和解析都支持 Markdown 与图片；保存后自动进入题目详情。"
        actions={
          <>
            <button className="btn-secondary" type="button" onClick={() => setParseOpen(true)}>
              <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
              从文字或图片识别
            </button>
            <Link className="btn-secondary" to="/questions">取消</Link>
          </>
        }
      />

      {error && <ErrorState message={error} />}
      {studioMessage && <p className="rounded-lg border border-line bg-panel p-4 text-sm leading-7 text-muted">已从讨论整理为草稿。参考答案来自 AI，请核对题干和答案、补充评分标准，再选择归档位置保存。</p>}

      {aiParseIssues.length > 0 && (
        <section className="rounded-2xl border border-warn-border bg-warn-soft p-4 text-sm text-warn">
          <div className="font-semibold">AI 解析待核对</div>
          <div className="mt-2 space-y-1 leading-6">
            {aiParseIssues.map((issue, index) => (
              <div key={`${issue.code}-${index}`}>
                {issue.severity === "error" ? "需处理" : "提示"}
                {issue.field ? ` · ${issue.field}` : ""}：{issue.message}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          <EditSection index="01" title="题干" hint="必填">
            <MarkdownEditor onUploadingChange={onUploadingChange} label="题干" hideLabel value={form.stem} onChange={(value) => update("stem", value)} />
          </EditSection>

          <EditSection index="02" title="材料" hint="可选">
            <MarkdownEditor onUploadingChange={onUploadingChange} label="材料" hideLabel value={form.material ?? ""} onChange={(value) => update("material", value)} />
          </EditSection>

          {isChoice && (
            <EditSection index="03" title="选项" hint={`${form.options.length} 个`}>
              <div className="space-y-2.5">
                {form.options.map((option, index) => (
                  <div key={`${option.key}-${index}`} className="grid items-start gap-2 sm:grid-cols-[3.5rem_minmax(0,1fr)_2.25rem]">
                    <input
                      aria-label={`选项 ${index + 1} 编号`}
                      className="field text-center font-bold uppercase"
                      value={option.key}
                      onChange={(event) => updateOption(index, { key: event.target.value.toUpperCase() })}
                    />
                    <MarkdownEditor
                      onUploadingChange={onUploadingChange}
                      label={`选项 ${option.key}`}
                      rows={2}
                      value={option.text}
                      onChange={(value) => updateOption(index, { text: value })}
                    />
                    <button
                      aria-label={`删除选项 ${option.key}`}
                      className="grid h-10 w-9 place-items-center rounded-xl border border-line text-muted transition hover:border-bad-border hover:bg-bad-soft hover:text-bad"
                      type="button"
                      onClick={() => removeOption(index)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
                <button className="btn-secondary btn-sm" type="button" onClick={addOption}>新增选项</button>
              </div>
            </EditSection>
          )}

          {isTrueFalse && (
            <EditSection index="03" title="判断选项">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-panel-2/60 p-3 text-sm font-medium">A. 正确</div>
                <div className="rounded-xl border border-line bg-panel-2/60 p-3 text-sm font-medium">B. 错误</div>
              </div>
            </EditSection>
          )}

          <EditSection index="04" title={isObjective(form.type) ? "标准答案" : "参考答案"} hint="必填">
            <AnswerEditor
              onUploadingChange={onUploadingChange}
              type={form.type}
              options={form.options}
              value={form.standard_answer}
              onChange={(value) => update("standard_answer", value)}
            />
          </EditSection>

          <EditSection index="05" title="解析与考察点">
            <div className="grid gap-3">
              <MarkdownEditor onUploadingChange={onUploadingChange} label="详细解析" value={form.explanation ?? ""} onChange={(value) => update("explanation", value)} />
              <Field label="考察点" hint="用顿号分隔">
                <input className="field" value={form.exam_points.join("、")} onChange={(event) => update("exam_points", splitList(event.target.value))} />
              </Field>
              <Field label="常见错误">
                <textarea className="field" value={form.common_mistakes ?? ""} onChange={(event) => update("common_mistakes", event.target.value)} />
              </Field>
              <Field label="面试延伸追问">
                <textarea className="field" value={form.follow_up_question ?? ""} onChange={(event) => update("follow_up_question", event.target.value)} />
              </Field>
              <Field label="评分标准">
                <textarea className="field" value={form.scoring_standard ?? ""} onChange={(event) => update("scoring_standard", event.target.value)} />
              </Field>
            </div>
          </EditSection>
        </div>

        <aside className="space-y-4">
          <EditSection title="基础信息">
            <div className="grid gap-3">
              <Field label="题型">
                <select
                  className="field"
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
              <Field label="难度" hint="1–5">
                <input className="field" value={form.difficulty ?? ""} onChange={(event) => update("difficulty", event.target.value)} />
              </Field>
              <Field label="标签" hint="用顿号分隔">
                <input className="field" value={form.tags.join("、")} onChange={(event) => update("tags", splitList(event.target.value))} />
              </Field>
              <Field label="题目方向" hint="用顿号分隔">
                <input className="field" value={form.directions.join("、")} onChange={(event) => update("directions", splitList(event.target.value))} placeholder="Tool Calling、Agent 基础" />
              </Field>
            </div>
          </EditSection>

          <EditSection title="归档集合" hint="必选">
            <AiCollectionPlacement
              bare
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

          <EditSection title="创建说明">
            <textarea className="field" value={form.reason ?? ""} onChange={(event) => update("reason", event.target.value)} placeholder="例如：补充工具调用基础题" />
          </EditSection>
        </aside>
      </div>

      <div className="action-bar">
        <p className="hidden text-xs text-muted sm:block">
          {uploadCount > 0 ? "图片正在上传，请稍候…" : "保存前请确认归档集合与标准答案。"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link className="btn-secondary btn-sm" to="/questions">取消</Link>
          <button className="btn-primary btn-sm" onClick={save} disabled={saving || uploadCount > 0}>
            <Save className="h-4 w-4" aria-hidden="true" />
            {saving ? "保存中…" : "保存题目"}
          </button>
        </div>
      </div>

      <AiQuestionParseDialog open={parseOpen} typeOptions={TYPE_OPTIONS} onClose={() => setParseOpen(false)} onApply={applyAiDraft} />
    </div>
  );
}

function EditSection({ index, title, hint, children }: { index?: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="bento-card p-5 sm:p-6">
      <div className="mb-4 flex items-baseline gap-2.5">
        {index && (
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-accent-soft text-xs font-bold tabular-nums text-accent">
            {index}
          </span>
        )}
        <h2 className="text-sm font-bold tracking-tight">{title}</h2>
        {hint && <span className="ml-auto text-xs text-muted">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="field-label">
        <span>{label}</span>
        {hint && <span className="font-normal text-muted/80">{hint}</span>}
      </span>
      {children}
    </label>
  );
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
