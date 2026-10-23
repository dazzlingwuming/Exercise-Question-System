import { Save, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getQuestion, updateQuestion } from "../api/questions";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { AnswerEditor } from "../components/question/AnswerEditor";
import type { Option, Question, QuestionUpdatePayload } from "../types/question";

import { MarkdownEditor } from "../components/content/MarkdownEditor";
import { PageHeader } from "../components/common/PageHeader";

const TYPE_OPTIONS = [
  ["single_choice", "单选题"],
  ["multiple_choice", "多选题"],
  ["true_false", "判断题"],
  ["fill_blank", "填空题"],
  ["short_answer", "简答题"],
  ["interview", "面试题"],
  ["system_design", "系统设计题"],
  ["debug_analysis", "Debug / 日志分析题"],
  ["code_reading", "代码阅读 / 伪代码设计题"],
  ["project_follow_up", "项目追问模拟"],
  ["mock_interview", "模拟面试套卷"],
];

export function QuestionEditPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("return_to"));
  const [form, setForm] = useState<Question | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const onUploadingChange = useCallback((active: boolean) => setUploadCount((count) => Math.max(0, count + (active ? 1 : -1))), []);

  useEffect(() => {
    getQuestion(id).then(setForm).catch((err) => setError(err.message));
  }, [id]);

  if (error && !form) return <ErrorState message={error} />;
  if (!form) return <LoadingState />;
  if (form.is_deleted) {
    return (
      <div className="space-y-5">
        <ErrorState message="题目已删除，需先恢复再编辑。" />
        <div className="flex gap-2">
          <Link className="btn-secondary" to={`/questions/${form.id}`}>返回详情</Link>
          <Link className="btn-secondary" to="/questions/deleted">查看回收站</Link>
        </div>
      </div>
    );
  }

  const update = <K extends keyof Question>(key: K, value: Question[K]) => setForm({ ...form, [key]: value });
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
    setError(""); setSaving(true);
    const payload: QuestionUpdatePayload = {
      title: form.title,
      type: form.type,
      type_label: form.type_label,
      difficulty: form.difficulty,
      tags: form.tags,
      directions: form.directions,
      stem: form.stem,
      material: form.material,
      options: form.options,
      standard_answer: form.standard_answer,
      explanation: form.explanation,
      exam_points: form.exam_points,
      common_mistakes: form.common_mistakes,
      follow_up_question: form.follow_up_question,
      scoring_standard: form.scoring_standard,
      reason,
    };
    try {
      const updated = await updateQuestion(form.id, payload);
      setForm(updated);
      setMessage(`保存成功，题目已更新到 v${updated.version}`);
      setTimeout(() => navigate(returnTo || `/questions/${updated.id}`), 700);
    } catch (err) {
      setError((err as Error).message);
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        eyebrow="EDIT QUESTION"
        title="编辑题目"
        description={`${form.title || form.id} · v${form.version} · 每次保存都会留下一个版本`}
        actions={<Link className="btn-secondary" to={returnTo || `/questions/${form.id}`}>取消</Link>}
      />

      {error && <ErrorState message={error} />}
      {message && (
        <div className="rounded-2xl border border-good-border bg-good-soft p-3 text-sm font-medium text-good">
          {message}
        </div>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          <EditSection index="01" title="题干" hint="必填">
            <MarkdownEditor onUploadingChange={onUploadingChange} label="题干" hideLabel value={form.stem} onChange={(value) => update("stem", value)} />
          </EditSection>

          <EditSection index="02" title="材料" hint="可选">
            <MarkdownEditor onUploadingChange={onUploadingChange} label="材料" hideLabel value={form.material ?? ""} onChange={(value) => update("material", value)} />
          </EditSection>

          {form.options.length > 0 && (
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

          <EditSection index="04" title="标准答案" hint="必填">
            <AnswerEditor onUploadingChange={onUploadingChange} type={form.type} options={form.options} value={form.standard_answer} onChange={(value) => update("standard_answer", value)} />
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
              <Field label="短标题" hint="详情页展示">
                <input
                  className="field"
                  value={form.title ?? ""}
                  onChange={(event) => update("title", event.target.value)}
                  placeholder="例如：标准 VLM 的流式感知瓶颈"
                />
              </Field>
              <Field label="题型">
                <select
                  className="field"
                  value={form.type}
                  onChange={(event) => {
                    const label = TYPE_OPTIONS.find(([value]) => value === event.target.value)?.[1] ?? form.type_label;
                    setForm({ ...form, type: event.target.value, type_label: label });
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
                <input className="field" value={form.directions.join("、")} onChange={(event) => update("directions", splitList(event.target.value))} placeholder="工作流 Agent、可观测性" />
              </Field>
            </div>
          </EditSection>

          <EditSection title="修改原因">
            <textarea className="field" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="例如：原标准答案有误，修正为 B" />
            <p className="mt-2 text-xs leading-5 text-muted">会写入版本历史，方便日后回溯。</p>
          </EditSection>
        </aside>
      </div>

      <div className="action-bar">
        <p className="hidden text-xs text-muted sm:block">
          {uploadCount > 0 ? "图片正在上传，请稍候…" : "保存后自动跳回题目详情。"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link className="btn-secondary btn-sm" to={returnTo || `/questions/${form.id}`}>取消</Link>
          <button className="btn-primary btn-sm" onClick={save} disabled={saving || uploadCount > 0}>
            <Save className="h-4 w-4" aria-hidden="true" />
            {saving ? "保存中…" : "保存修改"}
          </button>
        </div>
      </div>
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
        {hint && <span>{hint}</span>}
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

function validateForm(question: Question) {
  if (!question.stem.trim()) return "题干不能为空";
  if (["single_choice", "multiple_choice", "true_false", "fill_blank"].includes(question.type) && !String(question.standard_answer ?? "").trim()) return "客观题标准答案不能为空";
  if (question.type === "single_choice" && !question.options.some((option) => option.key === question.standard_answer)) return "单选题标准答案必须来自已有选项";
  if (question.type === "multiple_choice") {
    const keys = new Set(question.options.map((option) => option.key));
    const answers = String(question.standard_answer ?? "").match(/[A-Z]/gi)?.map((item) => item.toUpperCase()) ?? [];
    if (answers.length === 0 || answers.some((item) => !keys.has(item))) return "多选题标准答案必须来自已有选项";
  }
  if (!["single_choice", "multiple_choice", "true_false", "fill_blank"].includes(question.type) && !String(question.standard_answer ?? "").trim()) return "主观题参考答案不能为空";
  if (!["single_choice", "multiple_choice", "true_false", "fill_blank"].includes(question.type) && !String(question.scoring_standard ?? "").trim()) return "主观题评分标准不能为空";
  return "";
}

function safeReturnTo(value: string | null) {
  if (!value) return "";
  if (!value.startsWith("/") || value.startsWith("//")) return "";
  return value;
}
