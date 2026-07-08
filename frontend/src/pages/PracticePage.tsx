import { ArrowLeft, ArrowRight, RotateCcw, Send, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { finalizeAiSummaryStream, type AiConfig } from "../api/ai";
import { listQuestionStates, selfReview } from "../api/attempts";
import { deleteQuestion, getFilterOptions } from "../api/questions";
import {
  createPracticeSession,
  getPracticeSession,
  movePracticeNext,
  movePracticeNextGroup,
  movePracticePrevious,
  type PracticeSessionResponse,
  type PracticeSessionState,
} from "../api/practice";
import { submitAnswer } from "../api/questions";
import { ErrorState } from "../components/common/ErrorState";
import { AiTutorPanel } from "../components/ai/AiTutorPanel";
import { AiGradingPanel } from "../components/ai/AiGradingPanel";
import { ExplanationPanel } from "../components/question/ExplanationPanel";
import { DeleteQuestionDialog } from "../components/question/DeleteQuestionDialog";
import { QuestionCard } from "../components/question/QuestionCard";
import { QuestionRenderer } from "../components/question/QuestionRenderer";
import type { QuestionState, SubmitAnswerResponse } from "../types/attempt";
import type { FilterOptions, Question } from "../types/question";
import { aiConfigForRole, loadStoredAiConfig } from "../utils/aiConfigStorage";

const MODE_LABELS: Record<string, string> = {
  random: "随机未答题",
  sequential: "顺序未答题",
  wrong: "错题专项",
  due_review: "到期复习",
  all_practice: "全量练习",
  unanswered: "未答题",
  type: "按题型",
  difficulty: "按难度",
  exam_point: "按考察点",
  direction: "按方向",
};

const ORDER_LABELS: Record<string, string> = {
  import_order: "按导入顺序",
  random: "随机打乱",
};

const PRACTICE_ANSWER_CACHE_KEY = "practice_session_answer_cache";

type CachedPracticeAnswer = {
  answer: string | string[];
  result: SubmitAnswerResponse;
};

export function PracticePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [filters, setFilters] = useState<FilterOptions | null>(null);
  const [mode, setMode] = useState(searchParams.get("mode") ?? "random");
  const [type, setType] = useState(searchParams.get("type") ?? "");
  const [difficulty, setDifficulty] = useState(searchParams.get("difficulty") ?? "");
  const [examPoint, setExamPoint] = useState(searchParams.get("exam_point") ?? "");
  const [direction, setDirection] = useState(searchParams.get("direction") ?? "");
  const [order, setOrder] = useState(searchParams.get("order") ?? (searchParams.get("mode") === "random" ? "random" : "import_order"));
  const [pageSize, setPageSize] = useState(20);
  const [sessionId, setSessionId] = useState("");
  const [currentGroup, setCurrentGroup] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [groupStart, setGroupStart] = useState(0);
  const [groupEnd, setGroupEnd] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasNextGroup, setHasNextGroup] = useState(false);
  const [hasPreviousGroup, setHasPreviousGroup] = useState(false);
  const [groupFinished, setGroupFinished] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [answer, setAnswer] = useState<string | string[]>("");
  const [result, setResult] = useState<SubmitAnswerResponse | null>(null);
  const [questionStates, setQuestionStates] = useState<Record<string, QuestionState>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [aiTutorSummaryPending, setAiTutorSummaryPending] = useState(false);
  const [aiGradingSummaryPending, setAiGradingSummaryPending] = useState(false);
  const [aiSummaryRunning, setAiSummaryRunning] = useState(false);
  const [aiConfig, setAiConfig] = useState<AiConfig>(() => loadStoredAiConfig());
  const aiSummaryPending = aiTutorSummaryPending || aiGradingSummaryPending;

  useEffect(() => {
    getFilterOptions().then(setFilters).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    const existingSessionId = searchParams.get("session_id");
    const startQuestionId = searchParams.get("start_question_id");
    if (existingSessionId) {
      void restoreSession(existingSessionId);
      return;
    }
    if (startQuestionId || searchParams.get("mode")) void startPractice(startQuestionId ?? undefined);
  }, []);

  const question = currentGroup[currentIndex - groupStart] ?? null;
  const questionState = question ? questionStates[question.id] : undefined;
  const returnTo = `${location.pathname}${location.search}`;
  const contextText = useMemo(() => {
    const progress = total && question ? currentIndex + 1 : 0;
    const parts = [
      `当前模式：${MODE_LABELS[mode] ?? mode}`,
      `题目顺序：${ORDER_LABELS[order] ?? order}`,
      `总题数：${total}`,
      `每组题数：${pageSize}`,
      `当前组：${total ? groupStart + 1 : 0}-${groupEnd}`,
      `当前进度：${progress} / ${total}`,
      `当前组已答：${currentGroup.filter((item) => (questionStates[item.id]?.attempt_count ?? 0) > 0).length} / ${currentGroup.length}`,
    ];
    if (type) parts.push(`题型：${type}`);
    if (difficulty) parts.push(`难度：${difficulty}`);
    if (examPoint) parts.push(`考察点：${examPoint}`);
    if (direction) parts.push(`方向：${direction}`);
    return parts;
  }, [mode, order, pageSize, total, question, currentIndex, groupStart, groupEnd, currentGroup, questionStates, type, difficulty, examPoint, direction]);

  useEffect(() => {
    if (!question) return;
    const cached = loadCachedPracticeAnswer(sessionId, question.id);
    if (cached) {
      setAnswer(cached.answer);
      setResult(cached.result);
      return;
    }
    setAnswer("");
    setResult(null);
  }, [sessionId, question?.id]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!aiSummaryPending && !aiSummaryRunning) return;
      event.preventDefault();
      event.returnValue = "AI 对话摘要尚未生成完成，直接关闭可能丢失本题 AI 学习摘要。";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [aiSummaryPending, aiSummaryRunning]);

  async function finalizeCurrentAiSummary() {
    if (!question || !result?.attempt_id || aiSummaryRunning) return;
    setAiSummaryRunning(true);
    setNotice("正在检查并总结本题 AI 对话，完成后会删除已总结的原始聊天记录...");
    try {
      await finalizeAiSummaryStream(question.id, result.attempt_id, aiConfigForRole(loadStoredAiConfig(), "tutor"), () => undefined);
      setAiTutorSummaryPending(false);
      setAiGradingSummaryPending(false);
      setNotice("本题 AI 学习记录已总结，原始聊天记录已清理。");
    } catch (err) {
      setNotice(`AI 摘要未完成：${(err as Error).message}`);
    } finally {
      setAiSummaryRunning(false);
    }
  }

  async function restoreSession(id: string) {
    setError("");
    setNotice("");
    setResult(null);
    setAnswer("");
    try {
      const response = await getPracticeSession(id);
      applySessionState(response);
    } catch (err) {
      setError("练习会话不存在或已过期，请重新开始练习。");
      navigate("/practice", { replace: true });
    }
  }

  async function startPractice(startQuestionId?: string) {
    await finalizeCurrentAiSummary();
    setError("");
    setNotice("");
    setResult(null);
    setAnswer("");
    setGroupFinished(false);
    setSessionFinished(false);
    try {
      const response = await createPracticeSession({
        mode,
        type: type || undefined,
        difficulty: difficulty || undefined,
        exam_point: examPoint || undefined,
        direction: direction || undefined,
        page_size: pageSize,
        start_question_id: startQuestionId,
        order: mode === "random" ? "random" : order,
        allow_answered: mode === "all_practice" || mode === "wrong" || mode === "due_review",
      });
      applySessionResponse(response);
      navigate(`/practice?session_id=${response.session_id}`, { replace: true });
      if (response.items.length === 0) setError("没有匹配的练习题");
      if (response.shortage_message) setNotice(response.shortage_message);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function applySessionResponse(response: PracticeSessionResponse) {
    setSessionId(response.session_id);
    setMode(response.mode);
    setPageSize(response.page_size);
    setCurrentGroup(response.items);
    setCurrentIndex(response.current_index);
    setGroupStart(response.current_group_start);
    setGroupEnd(response.current_group_end);
    setTotal(response.total);
    setHasNextGroup(response.has_next_group);
    setHasPreviousGroup(response.has_previous_group);
    setGroupFinished(false);
    setSessionFinished(response.total === 0);
    if (response.shortage_message) setNotice(response.shortage_message);
    void refreshQuestionStates(response.items);
  }

  function applySessionState(response: PracticeSessionState) {
    setSessionId(response.session_id);
    setMode(response.mode);
    setPageSize(response.page_size);
    setOrder(response.order || "import_order");
    setType(response.filters.type ?? "");
    setDifficulty(response.filters.difficulty ?? "");
    setExamPoint(response.filters.exam_point ?? "");
    setDirection(response.filters.direction ?? "");
    setCurrentGroup(response.current_group);
    setCurrentIndex(response.current_index);
    setGroupStart(response.current_group_start);
    setGroupEnd(response.current_group_end);
    setTotal(response.total);
    setHasNextGroup(response.has_next_group);
    setHasPreviousGroup(response.has_previous_group);
    setGroupFinished(false);
    setSessionFinished(response.total === 0);
    void refreshQuestionStates(response.current_group);
  }

  async function refreshQuestionStates(items: Question[]) {
    if (items.length === 0) {
      setQuestionStates({});
      return;
    }
    try {
      const states = await listQuestionStates(items.map((item) => item.id));
      setQuestionStates(Object.fromEntries(states.map((state) => [state.question_id, state])));
    } catch {
      setQuestionStates({});
    }
  }

  async function submit() {
    if (!question) return;
    try {
      const response = await submitAnswer(question.id, answer, sessionId || undefined);
      setResult(response);
      if (sessionId) saveCachedPracticeAnswer(sessionId, question.id, { answer, result: response });
      void refreshQuestionStates(currentGroup);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function deleteCurrentQuestion(reason: string) {
    if (!question) return;
    try {
      await deleteQuestion(question.id, { reason });
      if (sessionId) removeCachedPracticeAnswer(sessionId, question.id);
      setDeleteOpen(false);
      setResult(null);
      setAnswer("");
      setNotice("题目已删除，已从当前练习中跳过。");
      if (sessionId) await restoreSession(sessionId);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function review(status: "correct" | "partial" | "wrong") {
    if (!result) return;
    await selfReview(result.attempt_id, status);
    await refreshQuestionStates(currentGroup);
    await goNext();
  }

  async function goNext() {
    if (!sessionId) return;
    await finalizeCurrentAiSummary();
    setResult(null);
    setAnswer("");
    const response = await movePracticeNext(sessionId);
    if (response.status === "group_finished") {
      setGroupFinished(true);
      return;
    }
    if (response.status === "session_finished") {
      setSessionFinished(true);
      return;
    }
    if (typeof response.current_index === "number") setCurrentIndex(response.current_index);
  }

  async function goPrev() {
    if (!sessionId) return;
    await finalizeCurrentAiSummary();
    setResult(null);
    setAnswer("");
    setGroupFinished(false);
    setSessionFinished(false);
    const response = await movePracticePrevious(sessionId);
    if (typeof response.current_index !== "number") return;
    if (response.current_index < groupStart || response.current_index >= groupEnd) {
      await restoreSession(sessionId);
      return;
    }
    setCurrentIndex(response.current_index);
  }

  async function continueNextGroup() {
    if (!sessionId) return;
    await finalizeCurrentAiSummary();
    setResult(null);
    setAnswer("");
    const response = await movePracticeNextGroup(sessionId);
    applySessionResponse(response);
  }

  async function endPractice() {
    await finalizeCurrentAiSummary();
    if (sessionId) clearCachedPracticeSession(sessionId);
    setSessionId("");
    setCurrentGroup([]);
    setCurrentIndex(0);
    setGroupStart(0);
    setGroupEnd(0);
    setTotal(0);
    setGroupFinished(false);
    setSessionFinished(false);
    setResult(null);
    setAnswer("");
    navigate("/practice", { replace: true });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(620px,1fr)_minmax(560px,620px)] 2xl:grid-cols-[minmax(680px,1fr)_minmax(620px,720px)]">
      <div className="space-y-5">
        <section className="panel rounded-lg p-5">
          <h1 className="mb-4 text-2xl font-semibold">练习配置</h1>
          <div className="grid gap-3 md:grid-cols-4">
            <Select label="练习模式" value={mode} onChange={setMode} options={Object.entries(MODE_LABELS).map(([value, label]) => ({ value, label }))} />
            <Select label="题型" value={type} onChange={setType} options={(filters?.types ?? []).map((value) => ({ value, label: value }))} empty="全部题型" />
            <Select label="难度" value={difficulty} onChange={setDifficulty} options={(filters?.difficulties ?? []).map((value) => ({ value, label: value }))} empty="全部难度" />
            <Select label="每组题数" value={String(pageSize)} onChange={(value) => setPageSize(Number(value))} options={[10, 20, 50].map((value) => ({ value: String(value), label: `${value} 题` }))} />
            <Select label="题目顺序" value={mode === "random" ? "random" : order} onChange={setOrder} options={Object.entries(ORDER_LABELS).map(([value, label]) => ({ value, label }))} />
            <Select label="考察点" value={examPoint} onChange={setExamPoint} options={(filters?.exam_points ?? []).map((value) => ({ value, label: value }))} empty="全部考察点" />
            <Select label="方向" value={direction} onChange={setDirection} options={(filters?.directions ?? []).map((value) => ({ value, label: value }))} empty="全部方向" />
          </div>
          <p className="mt-3 text-sm text-muted">每次加载多少道题，刷完后可以继续下一组。题目顺序选择“随机打乱”时，会在创建练习会话时一次性打乱，后续上一题、下一组和刷新恢复都保持同一顺序。</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white" onClick={() => startPractice()}>开始练习</button>
            {sessionId && (
              <>
                <button className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-sm" onClick={() => startPractice()}>
                  <RotateCcw className="h-4 w-4" />
                  重新开始本模式
                </button>
                <button className="rounded-md border border-line bg-white px-4 py-2 text-sm" onClick={endPractice}>结束练习</button>
              </>
            )}
          </div>
        </section>
        {error && <ErrorState message={error} />}
        {notice && <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}
        {groupFinished && hasNextGroup && (
          <section className="panel rounded-lg p-5">
            <h2 className="text-lg font-semibold">当前组已完成</h2>
            <p className="mt-2 text-sm text-muted">已完成 {groupEnd} / {total}</p>
            <button className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white" onClick={continueNextGroup}>继续下一组</button>
          </section>
        )}
        {sessionFinished && (
          <section className="panel rounded-lg p-5">
            <h2 className="text-lg font-semibold">练习完成</h2>
            <p className="mt-2 text-sm text-muted">当前练习已全部完成。</p>
          </section>
        )}
        {sessionId && total > 0 && !question && !groupFinished && !sessionFinished && (
          <section className="panel rounded-lg p-5">
            <h2 className="text-lg font-semibold">当前题目不可用</h2>
            <p className="mt-2 text-sm text-muted">当前练习中的题目已被删除或不可用，请重新创建练习。</p>
            <button className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white" onClick={() => startPractice()}>重新开始本模式</button>
          </section>
        )}
        {question && !groupFinished && !sessionFinished && (
          <>
            <div className="flex items-center justify-between">
              <button className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm" onClick={goPrev} disabled={currentIndex === 0 || aiSummaryRunning}>
                <ArrowLeft className="h-4 w-4" />
                上一题
              </button>
              <button className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm" onClick={goNext} disabled={aiSummaryRunning}>
                下一题
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <QuestionCard question={question} />
            {questionState && questionState.attempt_count > 0 && !result && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                这道题之前已答过 {questionState.attempt_count} 次，{stateStatusText(questionState)}。本次练习不会预填历史答案，提交后才显示解析。
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Link className="inline-flex rounded-md border border-line bg-white px-3 py-2 text-sm" to={editQuestionPath(question.id, returnTo)}>
                编辑题目
              </Link>
              <button className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" />
                删除题目
              </button>
            </div>
            <section className="panel rounded-lg p-5">
              <QuestionRenderer question={question} answer={answer} setAnswer={setAnswer} />
              <button className="mt-4 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white" onClick={submit}>
                <Send className="h-4 w-4" />
                提交答案
              </button>
            </section>
            {result && (
              <>
                <ExplanationPanel result={result} />
                <Link className="inline-flex rounded-md border border-line bg-white px-3 py-2 text-sm" to={editQuestionPath(question.id, returnTo)}>
                  发现题目有误？编辑题目
                </Link>
              </>
            )}
            {result?.requires_self_review && (
              <div className="flex gap-2">
                <button className="rounded-md bg-accent px-4 py-2 text-sm text-white" onClick={() => review("correct")}>我答对了</button>
                <button className="rounded-md border border-line bg-white px-4 py-2 text-sm" onClick={() => review("partial")}>部分答对</button>
                <button className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700" onClick={() => review("wrong")}>我答错了</button>
              </div>
            )}
          </>
        )}
      </div>
      <aside className="panel h-fit rounded-lg p-5 xl:sticky xl:top-20">
        <h2 className="mb-3 font-semibold">练习上下文</h2>
        <div className="space-y-2 text-sm text-muted">
          {contextText.map((item) => <p key={item}>{item}</p>)}
        </div>
        {hasPreviousGroup && <p className="mt-3 text-xs text-muted">上一题可回到上一组内容。</p>}
        {hasNextGroup && <p className="mt-1 text-xs text-muted">当前组刷完后可继续下一组。</p>}
        <AiTutorPanel question={question} attemptId={result?.attempt_id} submitted={Boolean(result)} onSummaryPendingChange={setAiTutorSummaryPending} onConfigChange={setAiConfig} />
        <AiGradingPanel question={question} attemptId={result?.attempt_id} submitted={Boolean(result)} config={aiConfig} onSummaryPendingChange={setAiGradingSummaryPending} />
      </aside>
      <DeleteQuestionDialog open={deleteOpen} onCancel={() => setDeleteOpen(false)} onConfirm={deleteCurrentQuestion} />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  empty,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  empty?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-muted">{label}</span>
      <select className="w-full rounded-md border border-line bg-white px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)}>
        {empty && <option value="">{empty}</option>}
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function editQuestionPath(questionId: string, returnTo: string) {
  const params = new URLSearchParams({ return_to: returnTo });
  return `/questions/${questionId}/edit?${params.toString()}`;
}

function stateStatusText(state: QuestionState) {
  if (state.last_result === "correct") return "上次正确";
  if (state.last_result === "wrong") return "上次错误";
  if (state.last_result === "partial") return "上次部分正确";
  if (state.last_result === "ungraded") return "上次待自评";
  return "已有历史记录";
}

function cacheKey(sessionId: string, questionId: string) {
  return `${sessionId}:${questionId}`;
}

function loadPracticeAnswerCache(): Record<string, CachedPracticeAnswer> {
  try {
    const raw = sessionStorage.getItem(PRACTICE_ANSWER_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePracticeAnswerCache(cache: Record<string, CachedPracticeAnswer>) {
  sessionStorage.setItem(PRACTICE_ANSWER_CACHE_KEY, JSON.stringify(cache));
}

function loadCachedPracticeAnswer(sessionId: string, questionId: string): CachedPracticeAnswer | null {
  if (!sessionId || !questionId) return null;
  return loadPracticeAnswerCache()[cacheKey(sessionId, questionId)] ?? null;
}

function saveCachedPracticeAnswer(sessionId: string, questionId: string, value: CachedPracticeAnswer) {
  const cache = loadPracticeAnswerCache();
  cache[cacheKey(sessionId, questionId)] = value;
  savePracticeAnswerCache(cache);
}

function removeCachedPracticeAnswer(sessionId: string, questionId: string) {
  const cache = loadPracticeAnswerCache();
  delete cache[cacheKey(sessionId, questionId)];
  savePracticeAnswerCache(cache);
}

function clearCachedPracticeSession(sessionId: string) {
  const cache = loadPracticeAnswerCache();
  Object.keys(cache).forEach((key) => {
    if (key.startsWith(`${sessionId}:`)) delete cache[key];
  });
  savePracticeAnswerCache(cache);
}
