import { Save, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createQuestion } from "../api/questions";
import { ErrorState } from "../components/common/ErrorState";
import { AnswerEditor } from "../components/question/AnswerEditor";
import type { Option, QuestionCreatePayload } from "../types/question";

const TYPE_OPTIONS = [
  ["single_choice", "单选题"],
  ["multiple_choice", "多选题"],
  ["true_false", "判断题"],
  ["fill_blank", "填空题"],
  ["short_answer", "简答题"],
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

  const update = <K extends keyof QuestionCreatePayload>(key: K, value: QuestionCreatePayload[K]) => setForm({ ...form, [key]: value });
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
    try {
      const created = await createQuestion(normalizePayload(form));
      navigate(`/questions/${created.id}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const isChoice = ["single_choice", "multiple_choice"].includes(form.type);
  const isTrueFalse = form.type === "true_false";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">新增题目</h1>
          <p className="mt-1 text-sm text-muted">保存后会直接进入正式题库，并参与练习和统计。</p>
        </div>
        <Link className="rounded-md border border-line bg-white px-3 py-2 text-sm" to="/questions">取消</Link>
      </div>
      {error && <ErrorState message={error} />}
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
      <EditSection title="题干内容">
        <textarea className="focus-ring min-h-32 w-full rounded-md border border-line px-3 py-2 leading-7" value={form.stem} onChange={(event) => update("stem", event.target.value)} />
      </EditSection>
      {isChoice && (
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
      )}
      {isTrueFalse && (
        <EditSection title="判断选项">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-md border border-line bg-white p-3">A. 正确</div>
            <div className="rounded-md border border-line bg-white p-3">B. 错误</div>
          </div>
        </EditSection>
      )}
      <EditSection title={isObjective(form.type) ? "标准答案" : "参考答案"}>
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
      <EditSection title="创建说明">
        <textarea className="focus-ring min-h-20 w-full rounded-md border border-line px-3 py-2" value={form.reason ?? ""} onChange={(event) => update("reason", event.target.value)} placeholder="例如：补充工具调用基础题" />
      </EditSection>
      <button className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white" onClick={save}>
        <Save className="h-4 w-4" />
        保存题目
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
  if (!isObjective(question.type) && !String(question.standard_answer ?? "").trim() && !String(question.scoring_standard ?? "").trim()) return "主观题至少需要参考答案或评分标准";
  return "";
}
