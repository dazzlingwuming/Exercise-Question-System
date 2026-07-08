import { CheckCircle2, Edit3, Save, Sparkles, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { acceptAiQuestionCandidate, getAiQuestionGeneration, rejectAiQuestionCandidate, updateAiQuestionCandidate, type AiGeneratedQuestionCandidate, type AiQuestionGeneration } from "../api/ai";
import { ErrorState } from "../components/common/ErrorState";
import { AnswerEditor } from "../components/question/AnswerEditor";
import type { Option, QuestionCreatePayload } from "../types/question";

export function AiQuestionGenerationPage() {
  const { generationId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const returnTo = searchParams.get("return_to");
  const currentPath = `${location.pathname}${location.search}`;
  const [generation, setGeneration] = useState<AiQuestionGeneration | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loadingId, setLoadingId] = useState("");
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!generationId) return;
    getAiQuestionGeneration(generationId).then(setGeneration).catch((err) => setError((err as Error).message));
  }, [generationId]);

  async function accept(candidate: AiGeneratedQuestionCandidate) {
    setLoadingId(candidate.candidate_id);
    setError("");
    setNotice("");
    try {
      const response = await acceptAiQuestionCandidate(candidate.candidate_id);
      if (response.question_id) {
        navigate(withReturnTo(`/questions/${response.question_id}`, returnTo || "/questions"), { replace: true });
        return;
      }
      navigate(returnTo || "/questions", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingId("");
    }
  }

  async function reject(candidate: AiGeneratedQuestionCandidate) {
    setLoadingId(candidate.candidate_id);
    setError("");
    setNotice("");
    try {
      const response = await rejectAiQuestionCandidate(candidate.candidate_id, "用户取消");
      setGeneration((current) => {
        if (!current) return current;
        const remaining = current.candidates.filter((item) => item.candidate_id !== response.candidate_id);
        if (remaining.length === 0) {
          setTimeout(() => navigate(returnTo || "/practice", { replace: true }), 0);
        }
        return { ...current, candidates: remaining };
      });
      setNotice("候选题已取消。");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingId("");
    }
  }

  async function saveCandidate(candidateId: string, question: QuestionCreatePayload) {
    setLoadingId(candidateId);
    setError("");
    setNotice("");
    try {
      const updated = await updateAiQuestionCandidate(candidateId, question);
      setGeneration((current) => current ? {
        ...current,
        candidates: current.candidates.map((item) => item.candidate_id === candidateId ? updated : item),
      } : current);
      setNotice("候选题修改已保存。");
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoadingId("");
    }
  }

  if (!generation && !error) return <div className="panel rounded-lg p-5 text-sm text-muted">正在加载 AI 候选题...</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Sparkles className="h-5 w-5" />
            AI 候选题确认
          </h1>
          <p className="mt-1 text-sm text-muted">AI 生成的题目不会自动入库，需要你逐题确认。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {returnTo && <Link className="rounded-md bg-accent px-3 py-2 text-sm text-white" to={returnTo}>返回刷题</Link>}
          {generation?.source_question_id && <Link className="rounded-md border border-line bg-white px-3 py-2 text-sm" to={withReturnTo(`/questions/${generation.source_question_id}`, currentPath)}>查看来源题目</Link>}
        </div>
      </div>
      {error && <ErrorState message={error} />}
      {notice && <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}
      <div className="space-y-4">
        {generation?.candidates.map((candidate, index) => (
          <CandidateCard
            key={candidate.candidate_id}
            candidate={candidate}
            index={index}
            loading={loadingId === candidate.candidate_id}
            revealed={revealedIds.has(candidate.candidate_id) || candidate.status === "accepted"}
            onReveal={() => setRevealedIds((current) => new Set([...current, candidate.candidate_id]))}
            onSave={saveCandidate}
            onAccept={() => accept(candidate)}
            onReject={() => reject(candidate)}
            returnTo={currentPath}
          />
        ))}
      </div>
    </div>
  );
}

function CandidateCard({
  candidate,
  index,
  loading,
  revealed,
  onReveal,
  onSave,
  onAccept,
  onReject,
  returnTo,
}: {
  candidate: AiGeneratedQuestionCandidate;
  index: number;
  loading: boolean;
  revealed: boolean;
  onReveal: () => void;
  onSave: (candidateId: string, question: QuestionCreatePayload) => Promise<void>;
  onAccept: () => void;
  onReject: () => void;
  returnTo: string;
}) {
  const question = candidate.question;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<QuestionCreatePayload>(question);
  const [editError, setEditError] = useState("");
  const hasQualityRisk = !candidate.ai_validation.is_consistent || candidate.ai_validation.quality_score < 7;
  const staleSkippedQualityCheck = candidate.structure_validation.ok && candidate.ai_validation.problems.some((item) => item.includes("结构校验未通过"));
  const canAccept = candidate.status === "pending" && candidate.structure_validation.ok && revealed;
  useEffect(() => {
    setDraft(question);
  }, [candidate.candidate_id, question]);
  const updateDraft = <K extends keyof QuestionCreatePayload>(key: K, value: QuestionCreatePayload[K]) => setDraft({ ...draft, [key]: value });
  const updateOption = (index: number, value: Partial<Option>) => {
    const options = [...(draft.options ?? [])];
    options[index] = { ...options[index], ...value };
    updateDraft("options", options);
  };
  const addOption = () => updateDraft("options", [...(draft.options ?? []), { key: nextOptionKey(draft.options ?? []), text: "" }]);
  const removeOption = (index: number) => updateDraft("options", (draft.options ?? []).filter((_, itemIndex) => itemIndex !== index));
  async function saveEdit() {
    const validation = validateDraft(draft);
    if (validation) {
      setEditError(validation);
      return;
    }
    setEditError("");
    await onSave(candidate.candidate_id, normalizeDraft(draft));
    setEditing(false);
  }
  return (
    <section className="panel rounded-lg p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">候选题 {index + 1}</span>
            <span className="rounded-md bg-surface px-2 py-1">{question.type_label || question.type}</span>
            {question.difficulty && <span className="rounded-md bg-surface px-2 py-1">难度：{question.difficulty}</span>}
            <span className="rounded-md bg-surface px-2 py-1">状态：{statusText(candidate.status)}</span>
          </div>
          <h2 className="text-lg font-semibold leading-8">{question.stem}</h2>
        </div>
        {candidate.accepted_question_id && <Link className="rounded-md border border-line bg-white px-3 py-2 text-sm" to={withReturnTo(`/questions/${candidate.accepted_question_id}`, returnTo)}>查看入库题目</Link>}
      </div>

      {editing ? (
        <section className="mt-4 rounded-md border border-line bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-medium">编辑候选题</h3>
            <button className="rounded-md border border-line bg-white px-3 py-2 text-sm" onClick={() => { setDraft(question); setEditing(false); setEditError(""); }}>取消编辑</button>
          </div>
          {editError && <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{editError}</div>}
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="题型"><input className="w-full rounded-md border border-line px-3 py-2" value={draft.type_label ?? draft.type} onChange={(event) => updateDraft("type_label", event.target.value)} /></Field>
            <Field label="难度"><input className="w-full rounded-md border border-line px-3 py-2" value={draft.difficulty ?? ""} onChange={(event) => updateDraft("difficulty", event.target.value)} /></Field>
            <Field label="标签"><input className="w-full rounded-md border border-line px-3 py-2" value={(draft.tags ?? []).join("、")} onChange={(event) => updateDraft("tags", splitList(event.target.value))} /></Field>
            <Field label="方向"><input className="w-full rounded-md border border-line px-3 py-2" value={(draft.directions ?? []).join("、")} onChange={(event) => updateDraft("directions", splitList(event.target.value))} /></Field>
            <Field label="考察点"><input className="w-full rounded-md border border-line px-3 py-2" value={(draft.exam_points ?? []).join("、")} onChange={(event) => updateDraft("exam_points", splitList(event.target.value))} /></Field>
          </div>
          <Field label="题干"><textarea className="min-h-28 w-full rounded-md border border-line px-3 py-2 leading-7" value={draft.stem} onChange={(event) => updateDraft("stem", event.target.value)} /></Field>
          <div className="mt-3 space-y-2">
            <div className="text-sm text-muted">选项</div>
            {(draft.options ?? []).map((option, optionIndex) => (
              <div key={`${option.key}-${optionIndex}`} className="grid gap-2 md:grid-cols-[80px_1fr_44px]">
                <input className="rounded-md border border-line px-2 py-2" value={option.key} onChange={(event) => updateOption(optionIndex, { key: event.target.value.toUpperCase() })} />
                <input className="rounded-md border border-line px-3 py-2" value={option.text} onChange={(event) => updateOption(optionIndex, { text: event.target.value })} />
                <button className="rounded-md border border-line bg-white p-2" onClick={() => removeOption(optionIndex)}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <button className="rounded-md border border-line bg-white px-3 py-2 text-sm" onClick={addOption}>新增选项</button>
          </div>
          <Field label={isObjective(draft.type) ? "标准答案" : "参考答案"}>
            <AnswerEditor type={draft.type} options={draft.options ?? []} value={draft.standard_answer} onChange={(value) => updateDraft("standard_answer", value)} />
          </Field>
          <Field label="解析"><textarea className="min-h-24 w-full rounded-md border border-line px-3 py-2 leading-7" value={draft.explanation ?? ""} onChange={(event) => updateDraft("explanation", event.target.value)} /></Field>
          <Field label="常见错误"><textarea className="min-h-20 w-full rounded-md border border-line px-3 py-2" value={draft.common_mistakes ?? ""} onChange={(event) => updateDraft("common_mistakes", event.target.value)} /></Field>
          <Field label="面试追问"><textarea className="min-h-20 w-full rounded-md border border-line px-3 py-2" value={draft.follow_up_question ?? ""} onChange={(event) => updateDraft("follow_up_question", event.target.value)} /></Field>
          <Field label="评分标准"><textarea className="min-h-20 w-full rounded-md border border-line px-3 py-2" value={draft.scoring_standard ?? ""} onChange={(event) => updateDraft("scoring_standard", event.target.value)} /></Field>
          <button className="mt-3 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50" onClick={saveEdit} disabled={loading}>
            <Save className="h-4 w-4" />
            保存候选题修改
          </button>
        </section>
      ) : question.options?.length > 0 && (
        <div className="mb-4 grid gap-2">
          {question.options.map((option) => <div key={option.key} className="rounded-md border border-line bg-white px-3 py-2 text-sm">{option.key}. {option.text}</div>)}
        </div>
      )}

      {!revealed ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          先审核题干和选项是否清楚、是否有独立作答价值。通过初审后再查看标准答案、解析、常见错误和面试追问。
        </div>
      ) : (
        <>
          <InfoBlock title={isObjective(question.type) ? "标准答案" : "参考答案"} content={formatValue(question.standard_answer)} />
          {question.explanation && <InfoBlock title="解析" content={question.explanation} />}
          {question.scoring_standard && <InfoBlock title="评分点" content={question.scoring_standard} />}
          {question.exam_points?.length > 0 && <InfoBlock title="考察点" content={question.exam_points.join("、")} />}
          {question.common_mistakes && <InfoBlock title="常见错误" content={question.common_mistakes} />}
          {question.follow_up_question && <InfoBlock title="面试追问" content={question.follow_up_question} />}
        </>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className={`rounded-md border p-3 text-sm ${candidate.structure_validation.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
          <div className="mb-1 font-medium">结构校验：{candidate.structure_validation.ok ? "通过" : "未通过"}</div>
          {candidate.structure_validation.errors.map((item) => <p key={item}>问题：{item}</p>)}
          {candidate.structure_validation.warnings.map((item) => <p key={item}>提示：{item}</p>)}
        </div>
        <div className={`rounded-md border p-3 text-sm ${candidate.ai_validation.is_consistent ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          {staleSkippedQualityCheck ? (
            <>
              <div className="mb-1 font-medium">AI 质量校验：未重新校验</div>
              <p>当前结构校验已通过，但这条候选题的 AI 质量校验是在旧结构失败时跳过的。请以人工判断为准，或重新生成候选题。</p>
            </>
          ) : (
            <>
              <div className="mb-1 font-medium">AI 质量校验：{candidate.ai_validation.quality_score.toFixed(1)} / 10</div>
              <p>一致性：{candidate.ai_validation.is_consistent ? "较好" : "需谨慎"}</p>
              {candidate.ai_validation.problems.map((item) => <p key={item}>问题：{item}</p>)}
              {candidate.ai_validation.suggestions.map((item) => <p key={item}>建议：{item}</p>)}
            </>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-md border border-line bg-white p-3 text-sm">
        <div className="mb-2 font-medium">题干相似度最高的 3 道已有题</div>
        <div className="space-y-2">
          {candidate.similar_questions.map((item) => (
            <div key={item.question_id} className="rounded-md bg-surface p-2">
              <div className="mb-1 text-xs text-muted">相似度：{item.similarity_score.toFixed(2)}%</div>
              <Link className="text-sm hover:text-accent" to={`/questions/${item.question_id}`}>{item.stem}</Link>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">系统只根据题干文本相似度做轻量检测，最终是否入库由你判断。</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {candidate.status === "pending" && !editing && (
          <button className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-sm disabled:opacity-50" onClick={() => setEditing(true)} disabled={loading}>
            <Edit3 className="h-4 w-4" />
            编辑候选题
          </button>
        )}
        {hasQualityRisk && candidate.status === "pending" && (
          <div className="w-full rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            AI 质量校验提示这道题可能存在风险。是否入库由你最终判断；建议先查看答案与解析后再决定。
          </div>
        )}
        {candidate.status === "pending" && !revealed && (
          <button className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50" onClick={onReveal} disabled={loading}>
            <CheckCircle2 className="h-4 w-4" />
            通过初审，查看答案与解析
          </button>
        )}
        <button className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50" onClick={onAccept} disabled={!canAccept || loading}>
          <CheckCircle2 className="h-4 w-4" />
          {loading ? "处理中..." : "加入题库"}
        </button>
        {candidate.status === "pending" && (
          <button className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-sm disabled:opacity-50" onClick={onReject} disabled={loading}>
            <Trash2 className="h-4 w-4" />
            取消这道
          </button>
        )}
      </div>
    </section>
  );
}

function InfoBlock({ title, content }: { title: string; content: string }) {
  return (
    <div className="mt-3 rounded-md bg-surface p-3 text-sm leading-6">
      <div className="mb-1 font-medium">{title}</div>
      <div className="whitespace-pre-wrap">{content}</div>
    </div>
  );
}

function formatValue(value: unknown) {
  if (Array.isArray(value)) return value.join("、");
  if (typeof value === "object" && value !== null) return JSON.stringify(value, null, 2);
  return String(value ?? "");
}

function isObjective(type: string) {
  return ["single_choice", "multiple_choice", "true_false", "fill_blank"].includes(type);
}

function statusText(status: string) {
  if (status === "accepted") return "已入库";
  if (status === "rejected") return "已取消";
  return "待确认";
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="mt-3 block"><span className="mb-1 block text-sm text-muted">{label}</span>{children}</label>;
}

function splitList(value: string) {
  return value.split(/[、,，;；]/).map((item) => item.trim()).filter(Boolean);
}

function nextOptionKey(options: Option[]) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return alphabet[options.length] ?? "Z";
}

function normalizeDraft(question: QuestionCreatePayload): QuestionCreatePayload {
  return { ...question, options: (question.options ?? []).filter((option) => option.key.trim() || option.text.trim()) };
}

function validateDraft(question: QuestionCreatePayload) {
  if (!question.stem.trim()) return "题干不能为空";
  if (["single_choice", "multiple_choice"].includes(question.type) && (question.options ?? []).filter((option) => option.key.trim() && option.text.trim()).length < 2) return "选择题至少需要 2 个选项";
  if (isObjective(question.type) && !String(question.standard_answer ?? "").trim()) return "客观题标准答案不能为空";
  return "";
}

function withReturnTo(path: string, returnTo: string) {
  const params = new URLSearchParams({ return_to: returnTo });
  return `${path}?${params.toString()}`;
}
