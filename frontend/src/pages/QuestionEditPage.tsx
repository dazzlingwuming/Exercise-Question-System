import { Save, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getQuestion, updateQuestion } from "../api/questions";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { AnswerEditor } from "../components/question/AnswerEditor";
import type { Option, Question, QuestionUpdatePayload } from "../types/question";

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

  useEffect(() => {
    getQuestion(id).then(setForm).catch((err) => setError(err.message));
  }, [id]);

  if (error) return <ErrorState message={error} />;
  if (!form) return <LoadingState />;
  if (form.is_deleted) {
    return (
      <div className="space-y-5">
        <ErrorState message="题目已删除，需先恢复再编辑。" />
        <div className="flex gap-2">
          <Link className="rounded-md border border-line bg-white px-3 py-2 text-sm" to={`/questions/${form.id}`}>返回详情</Link>
          <Link className="rounded-md border border-line bg-white px-3 py-2 text-sm" to="/questions/deleted">查看回收站</Link>
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
    const validation = validateForm(form);
    if (validation) {
      setError(validation);
      return;
    }
    setError("");
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
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">编辑题目</h1>
          <p className="mt-1 text-sm text-muted">{form.part_id ?? form.id} · v{form.version}</p>
        </div>
        <Link className="rounded-md border border-line bg-white px-3 py-2 text-sm" to={returnTo || `/questions/${form.id}`}>取消</Link>
      </div>
      {error && <ErrorState message={error} />}
      {message && <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
      <EditSection title="基础信息">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="题型">
            <select
              className="focus-ring w-full rounded-md border border-line px-3 py-2"
              value={form.type}
              onChange={(event) => {
                const label = TYPE_OPTIONS.find(([value]) => value === event.target.value)?.[1] ?? form.type_label;
                setForm({ ...form, type: event.target.value, type_label: label });
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
            <input className="focus-ring w-full rounded-md border border-line px-3 py-2" value={form.directions.join("、")} onChange={(event) => update("directions", splitList(event.target.value))} placeholder="工作流 Agent、可观测性" />
          </Field>
        </div>
      </EditSection>
      <EditSection title="题干内容">
        <textarea className="focus-ring min-h-32 w-full rounded-md border border-line px-3 py-2 leading-7" value={form.stem} onChange={(event) => update("stem", event.target.value)} />
      </EditSection>
      <EditSection title="选项设置">
        <div className="space-y-2">
          {form.options.map((option, index) => (
            <div key={`${option.key}-${index}`} className="grid gap-2 md:grid-cols-[80px_1fr_40px]">
              <input className="focus-ring rounded-md border border-line px-2 py-2" value={option.key} onChange={(event) => updateOption(index, { key: event.target.value.toUpperCase() })} />
              <input className="focus-ring rounded-md border border-line px-3 py-2" value={option.text} onChange={(event) => updateOption(index, { text: event.target.value })} />
              <button className="rounded-md border border-line bg-white p-2" type="button" onClick={() => removeOption(index)}><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <button className="rounded-md border border-line bg-white px-3 py-2 text-sm" type="button" onClick={addOption}>新增选项</button>
        </div>
      </EditSection>
      <EditSection title="标准答案">
        <AnswerEditor type={form.type} options={form.options} value={form.standard_answer} onChange={(value) => update("standard_answer", value)} />
      </EditSection>
      <EditSection title="解析与考察点">
        <div className="grid gap-3">
          <Field label="详细解析"><textarea className="focus-ring min-h-28 w-full rounded-md border border-line px-3 py-2 leading-7" value={form.explanation ?? ""} onChange={(event) => update("explanation", event.target.value)} /></Field>
          <Field label="考察点"><input className="focus-ring w-full rounded-md border border-line px-3 py-2" value={form.exam_points.join("、")} onChange={(event) => update("exam_points", splitList(event.target.value))} /></Field>
          <Field label="常见错误"><textarea className="focus-ring min-h-20 w-full rounded-md border border-line px-3 py-2" value={form.common_mistakes ?? ""} onChange={(event) => update("common_mistakes", event.target.value)} /></Field>
          <Field label="面试延伸追问"><textarea className="focus-ring min-h-20 w-full rounded-md border border-line px-3 py-2" value={form.follow_up_question ?? ""} onChange={(event) => update("follow_up_question", event.target.value)} /></Field>
          <Field label="评分标准"><textarea className="focus-ring min-h-20 w-full rounded-md border border-line px-3 py-2" value={form.scoring_standard ?? ""} onChange={(event) => update("scoring_standard", event.target.value)} /></Field>
        </div>
      </EditSection>
      <EditSection title="修改原因">
        <textarea className="focus-ring min-h-20 w-full rounded-md border border-line px-3 py-2" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="例如：原标准答案有误，修正为 B" />
      </EditSection>
      <button className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white" onClick={save}>
        <Save className="h-4 w-4" />
        保存修改
      </button>
    </div>
  );
}

function EditSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="panel rounded-lg p-5"><h2 className="mb-4 font-semibold">{title}</h2>{children}</section>;
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

function validateForm(question: Question) {
  if (!question.stem.trim()) return "题干不能为空";
  if (["single_choice", "multiple_choice", "true_false", "fill_blank"].includes(question.type) && !String(question.standard_answer ?? "").trim()) return "客观题标准答案不能为空";
  if (question.type === "single_choice" && !question.options.some((option) => option.key === question.standard_answer)) return "单选题标准答案必须来自已有选项";
  if (question.type === "multiple_choice") {
    const keys = new Set(question.options.map((option) => option.key));
    const answers = String(question.standard_answer ?? "").match(/[A-Z]/gi)?.map((item) => item.toUpperCase()) ?? [];
    if (answers.length === 0 || answers.some((item) => !keys.has(item))) return "多选题标准答案必须来自已有选项";
  }
  return "";
}

function safeReturnTo(value: string | null) {
  if (!value) return "";
  if (!value.startsWith("/") || value.startsWith("//")) return "";
  return value;
}
