import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, RotateCcw, Send, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { finalizeAiSummaryStream, type AiConfig } from "../api/ai";
import { listQuestionStates, selfReview } from "../api/attempts";
import { deleteQuestion, getFilterOptions } from "../api/questions";
import { getCollectionTree } from "../api/collections";
import { CollectionPicker, findNode } from "../components/collection/CollectionPicker";
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
import type { FilterOptions, PracticeQuestion } from "../types/question";
import type { CollectionNode } from "../types/collection";
import { aiConfigForRole, loadStoredAiConfig } from "../utils/aiConfigStorage";

import { Dialog } from "../components/common/Dialog";
import { PageHeader } from "../components/common/PageHeader";
import { HeroScene } from "../components/layout/HeroScene";
import { useTheme } from "../theme/ThemeProvider";
import { getDraft, saveDraft, removeDraft, clearSessionDrafts } from "../utils/practiceDrafts";

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
  const { theme } = useTheme();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [filters, setFilters] = useState<FilterOptions | null>(null);
  const [mode, setMode] = useState(searchParams.get("mode") ?? "random");
  const [type, setType] = useState(searchParams.get("type") ?? "");
  const [difficulty, setDifficulty] = useState(searchParams.get("difficulty") ?? "");
  const [examPoint, setExamPoint] = useState(searchParams.get("exam_point") ?? "");
  const [direction, setDirection] = useState(searchParams.get("direction") ?? "");
  const [collectionId, setCollectionId] = useState<string | null>(searchParams.get("collection_id"));
  const [includeDescendants, setIncludeDescendants] = useState(searchParams.get("include_descendants") !== "false");
  const [collectionTree, setCollectionTree] = useState<CollectionNode[]>([]);
  const [order, setOrder] = useState(searchParams.get("order") ?? (searchParams.get("mode") === "random" ? "random" : "import_order"));
  const [pageSize, setPageSize] = useState(20);
  const [sessionId, setSessionId] = useState("");
  const [currentGroup, setCurrentGroup] = useState<PracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [groupStart, setGroupStart] = useState(0);
  const [groupEnd, setGroupEnd] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasNextGroup, setHasNextGroup] = useState(false);
  const [hasPreviousGroup, setHasPreviousGroup] = useState(false);
  const [groupFinished, setGroupFinished] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [answer, setAnswerState] = useState<string | string[]>("");
  const [result, setResult] = useState<SubmitAnswerResponse | null>(null);
  const [questionStates, setQuestionStates] = useState<Record<string, QuestionState>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [aiTutorSummaryPending, setAiTutorSummaryPending] = useState(false);
  const [aiGradingSummaryPending, setAiGradingSummaryPending] = useState(false);
  const [aiSummaryRunning, setAiSummaryRunning] = useState(false);
  const [aiConfig, setAiConfig] = useState<AiConfig>(() => loadStoredAiConfig());
  const [busy, setBusy] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  const actionLock = useRef(false);
  async function perform(action: () => Promise<void>) {
    if (actionLock.current) return;
    actionLock.current = true; setBusy(true); setError("");
    try { await action(); } catch (err) { setError((err as Error).message); }
    finally { actionLock.current = false; setBusy(false); }
  }
  function setAnswer(value: string | string[]) { setAnswerState(value); if (question && !result) saveDraft(sessionId, question.id, value); }
  function requestStart() { if (sessionId) setRestartOpen(true); else void perform(() => startPractice()); }
  const aiSummaryPending = aiTutorSummaryPending || aiGradingSummaryPending;

  useEffect(() => {
    getFilterOptions().then(setFilters).catch((err) => setError(err.message));
    getCollectionTree().then(setCollectionTree).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    const existingSessionId = searchParams.get("session_id");
    const startQuestionId = searchParams.get("start_question_id");
    if (existingSessionId) {
      void perform(() => restoreSession(existingSessionId));
      return;
    }
    if (startQuestionId || searchParams.get("mode")) void perform(() => startPractice(startQuestionId ?? undefined));
  }, []);

  const question = currentGroup[currentIndex - groupStart] ?? null;
  const questionState = question ? questionStates[question.id] : undefined;
  const collectionName = findNode(collectionTree, collectionId)?.path ?? "";
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
    if (collectionName) parts.push(`集合：${collectionName}${includeDescendants ? "（含子集合）" : ""}`);
    return parts;
  }, [mode, order, pageSize, total, question, currentIndex, groupStart, groupEnd, currentGroup, questionStates, type, difficulty, examPoint, direction, collectionName, includeDescendants]);

  useEffect(() => {
    if (!question) return;
    const cached = loadCachedPracticeAnswer(sessionId, question.id);
    if (cached) {
      setAnswerState(cached.answer);
      setResult(cached.result);
      return;
    }
    setAnswerState(getDraft(sessionId, question.id));
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
      throw err;
    } finally {
      setAiSummaryRunning(false);
    }
  }

  async function restoreSession(id: string) {
    setError("");
    setNotice("");
    try {
      const response = await getPracticeSession(id);
      applySessionState(response);
    } catch (err) {
      setError(`暂时无法恢复练习：${(err as Error).message}。请稍后重试；草稿仍保留在当前标签页。`);
      if (!sessionId) navigate("/practice", { replace: true });
    }
  }

  async function startPractice(startQuestionId?: string) {
    await finalizeCurrentAiSummary();
    setError("");
    setNotice("");
    try {
      const response = await createPracticeSession({
        mode,
        type: type || undefined,
        difficulty: difficulty || undefined,
        exam_point: examPoint || undefined,
        direction: direction || undefined,
        collection_id: collectionId || undefined,
        include_descendants: collectionId ? includeDescendants : undefined,
        page_size: pageSize,
        start_question_id: startQuestionId,
        order: mode === "random" ? "random" : order,
        allow_answered: mode === "all_practice" || mode === "wrong" || mode === "due_review",
      });
      if (sessionId) { clearCachedPracticeSession(sessionId); clearSessionDrafts(sessionId); }
      setResult(null); setAnswerState(""); setConfigOpen(false);
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
    const filterText = (value: string | number | boolean | null | undefined) => value == null ? "" : String(value);
    const restoredCollectionId = response.filters.collection_id;
    const restoredIncludeDescendants = response.filters.include_descendants;
    setSessionId(response.session_id);
    setMode(response.mode);
    setPageSize(response.page_size);
    setOrder(response.order || "import_order");
    setType(filterText(response.filters.type));
    setDifficulty(filterText(response.filters.difficulty));
    setExamPoint(filterText(response.filters.exam_point));
    setDirection(filterText(response.filters.direction));
    setCollectionId(typeof restoredCollectionId === "string" ? restoredCollectionId : null);
    setIncludeDescendants(restoredIncludeDescendants !== false && restoredIncludeDescendants !== "false");
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

  async function refreshQuestionStates(items: PracticeQuestion[]) {
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
      removeDraft(sessionId, question.id);
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
      setAnswerState("");
      setNotice("题目已删除，已从当前练习中跳过。");
      if (sessionId) await restoreSession(sessionId);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function review(status: "correct" | "partial" | "wrong") {
    if (!result) return;
    await selfReview(result.attempt_id, status);
    const reviewed = { ...result, requires_self_review: false };
    setResult(reviewed);
    if (question) saveCachedPracticeAnswer(sessionId, question.id, { answer, result: reviewed });
    await refreshQuestionStates(currentGroup);
    await goNext();
  }

  async function goNext() {
    if (!sessionId) return;
    await finalizeCurrentAiSummary();
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
    const response = await movePracticePrevious(sessionId);
    setGroupFinished(false); setSessionFinished(false);
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
    const response = await movePracticeNextGroup(sessionId);
    applySessionResponse(response);
  }

  async function endPractice() {
    await finalizeCurrentAiSummary();
    // Keep unfinished drafts available if this session is reopened.
    setSessionId("");
    setCurrentGroup([]);
    setCurrentIndex(0);
    setGroupStart(0);
    setGroupEnd(0);
    setTotal(0);
    setGroupFinished(false);
    setSessionFinished(false);
    setResult(null);
    setAnswerState("");
    navigate("/practice", { replace: true });
  }

  return (
    <div className={`practice-layout ${assistantOpen ? "has-assistant" : ""}`}>
      <div className="practice-main mx-auto w-full max-w-[1000px] space-y-5">
        <PageHeader eyebrow="PRACTICE TIME" title="专注这一题" description="慢慢想，大胆答。每一次练习都算数。" actions={<button className="btn-secondary" aria-expanded={assistantOpen} onClick={() => setAssistantOpen(!assistantOpen)}><Sparkles className="h-4 w-4 text-accent" />{assistantOpen ? "收起 AI 助手" : "展开 AI 助手"}</button>} />
        {sessionId && (
          <section className="bento-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="figure-lg">{currentIndex + 1}</span>
                  <span className="text-sm text-muted">/ {total} 题</span>
                  <span className="chip ml-1 border-accent-border bg-accent-soft text-accent">{MODE_LABELS[mode]}</span>
                </div>
                <div className="mt-1.5 text-xs text-muted">{collectionName || "全部题库"} · 每组 {pageSize} 题 · {ORDER_LABELS[order]}</div>
              </div>
              <button className="btn-secondary btn-sm" onClick={() => setConfigOpen(!configOpen)} aria-expanded={configOpen}>
                练习配置
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${configOpen ? "rotate-180" : ""}`} />
              </button>
            </div>
            <div className="progress-track mt-4">
              <div className="progress-fill" style={{ width: `${total ? ((currentIndex + 1) / total) * 100 : 0}%` }} />
            </div>
          </section>
        )}
        {(!sessionId || configOpen) && <section className="bento-card">
          <div className="grid lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside
              className="relative hidden flex-col justify-between overflow-hidden border-r border-line p-5 lg:flex"
              style={{ background: "linear-gradient(165deg, rgb(var(--c-accent-soft)), rgb(var(--c-panel)) 70%)" }}
            >
              <div>
                {theme === "whale" ? (
                  <img
                    src="/mascot/xiaojing.png"
                    alt="小鲸"
                    className="mx-auto h-52 w-auto drop-shadow-[0_16px_30px_rgba(30,58,138,0.2)]"
                  />
                ) : (
                  <HeroScene className="mx-auto max-w-[9.5rem]" />
                )}
                <p className="mt-2 text-center text-sm font-bold tracking-tight">准备好了吗？</p>
                <p className="mt-1 text-center text-xs leading-5 text-muted">
                  选好范围，小鲸陪你把这组题刷完。
                </p>
              </div>
              <ul className="mt-5 space-y-2 text-xs leading-5 text-muted">
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />先做会做的，再回头啃难点</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />答错会自动进入错题复习</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />草稿会保留，随时可以切题</li>
              </ul>
            </aside>
            <div className="p-5">
              <div className="mb-5 flex items-start gap-3">
                <span className="stat-icon shrink-0"><Sparkles className="h-5 w-5" aria-hidden="true" /></span>
                <div>
                  <h2 className="text-lg font-bold tracking-tight">准备一组练习</h2>
                  <p className="mt-0.5 text-xs text-muted">选好范围与节奏，剩下的交给专注。</p>
                </div>
              </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Select label="练习模式" value={mode} onChange={setMode} options={Object.entries(MODE_LABELS).map(([value, label]) => ({ value, label }))} />
            <label className="block"><span className="mb-1 block text-sm text-muted">集合</span><CollectionPicker tree={collectionTree} selectedId={collectionId} onSelect={setCollectionId} allowUnfiled allowEmpty emptyLabel="全部题库" /></label>
            <Select label="题型" value={type} onChange={setType} options={(filters?.types ?? []).map((value) => ({ value, label: value }))} empty="全部题型" />
            <Select label="难度" value={difficulty} onChange={setDifficulty} options={(filters?.difficulties ?? []).map((value) => ({ value, label: value }))} empty="全部难度" />
            <Select label="每组题数" value={String(pageSize)} onChange={(value) => setPageSize(Number(value))} options={[10, 20, 50].map((value) => ({ value: String(value), label: `${value} 题` }))} />
            <Select label="题目顺序" value={mode === "random" ? "random" : order} onChange={setOrder} options={Object.entries(ORDER_LABELS).map(([value, label]) => ({ value, label }))} />
            <Select label="考察点" value={examPoint} onChange={setExamPoint} options={(filters?.exam_points ?? []).map((value) => ({ value, label: value }))} empty="全部考察点" />
            <Select label="方向" value={direction} onChange={setDirection} options={(filters?.directions ?? []).map((value) => ({ value, label: value }))} empty="全部方向" />
          </div>
          {collectionId && <label className="mt-3 inline-flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={includeDescendants} onChange={(event) => setIncludeDescendants(event.target.checked)} />包含子集合题目</label>}
          <p className="mt-4 rounded-xl border border-line bg-panel-2/60 p-3 text-xs leading-6 text-muted">每次加载多少道题，刷完后可以继续下一组。题目顺序选择“随机打乱”时，会在创建练习会话时一次性打乱，后续上一题、下一组和刷新恢复都保持同一顺序。</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-primary" onClick={requestStart} disabled={busy}>开始练习</button>
            {sessionId && (
              <>
                <button className="btn-secondary" onClick={requestStart} disabled={busy}>
                  <RotateCcw className="h-4 w-4" />
                  重新开始本模式
                </button>
                <button className="btn-secondary" onClick={() => void perform(endPractice)} disabled={busy}>结束练习</button>
              </>
            )}
          </div>
            </div>
          </div>
        </section>}
        {error && <ErrorState message={error} />}
        {notice && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-good-border bg-good-soft p-3.5 text-sm leading-6 text-good">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0">{notice}</span>
          </div>
        )}
        {groupFinished && hasNextGroup && (
          <section className="panel flex flex-col items-start gap-3 p-6">
            <span className="stat-icon"><CheckCircle2 className="h-5 w-5" aria-hidden="true" /></span>
            <div>
              <h2 className="text-lg font-bold tracking-tight">当前组已完成</h2>
              <p className="mt-1 text-sm text-muted">已完成 {groupEnd} / {total} 题，下一组继续。</p>
            </div>
            <button className="btn-primary" onClick={() => void perform(continueNextGroup)} disabled={busy}>继续下一组</button>
          </section>
        )}
        {sessionFinished && (
          <section className="panel flex flex-col items-start gap-3 p-6">
            <span className="stat-icon"><Sparkles className="h-5 w-5" aria-hidden="true" /></span>
            <div>
              <h2 className="text-lg font-bold tracking-tight">这一轮练习完成</h2>
              <p className="mt-1 text-sm text-muted">辛苦了，去统计页看看今天的变化。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="btn-primary" to="/stats">查看学习统计</Link>
              <Link className="btn-secondary" to="/review">复习错题</Link>
            </div>
          </section>
        )}
        {sessionId && total > 0 && !question && !groupFinished && !sessionFinished && (
          <section className="bento-card p-6">
            <h2 className="text-lg font-bold tracking-tight">当前题目不可用</h2>
            <p className="mt-2 text-sm text-muted">当前练习中的题目已被删除或不可用，请重新创建练习。</p>
            <button className="btn-primary mt-4" onClick={requestStart} disabled={busy}>重新开始本模式</button>
          </section>
        )}
        {question && !groupFinished && !sessionFinished && (
          <>
            <div className="glass-bar flex items-center justify-between gap-3 px-3 py-2">
              <button className="btn-secondary btn-sm" onClick={() => void perform(goPrev)} disabled={currentIndex === 0 || busy || aiSummaryRunning}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                上一题
              </button>
              <div className="flex flex-col items-center leading-tight">
                <span className="text-[9px] uppercase tracking-[0.18em] text-muted">Progress</span>
                <span className="text-sm font-bold tabular-nums">{currentIndex + 1} / {total}</span>
              </div>
              <button className="btn-primary btn-sm" onClick={() => void perform(goNext)} disabled={busy || aiSummaryRunning}>
                下一题
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <QuestionCard question={question} />
            {questionState && questionState.attempt_count > 0 && !result && (
              <div className="rounded-md border border-warn-border bg-warn-soft p-3 text-sm text-warn">
                这道题之前已答过 {questionState.attempt_count} 次，{stateStatusText(questionState)}。本次练习不会预填历史答案，提交后才显示解析。
              </div>
            )}
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="mr-auto text-xs text-muted">题目有误？可以直接修正。</span>
              <Link className="btn-ghost btn-sm" to={editQuestionPath(question.id, returnTo)}>
                编辑题目
              </Link>
              <button className="btn-ghost btn-sm text-bad hover:bg-bad-soft hover:text-bad" onClick={() => setDeleteOpen(true)} disabled={busy}>
                <Trash2 className="h-4 w-4" />
                删除题目
              </button>
            </div>
            <section className="bento-card">
              <div className="flex items-center justify-between gap-2 border-b border-line/60 bg-panel-2/40 px-5 py-4 sm:px-7">
                <div>
                  <p className="eyebrow">Your answer</p>
                  <h2 className="mt-1 text-base font-bold tracking-tight">你的作答</h2>
                </div>
                <span className="text-xs text-muted">提交后显示解析</span>
              </div>
              <div className="p-5 sm:p-7">
                <fieldset disabled={busy || Boolean(result)} className="min-w-0">
                  <legend className="sr-only">你的作答</legend>
                  <QuestionRenderer question={question} answer={answer} setAnswer={setAnswer} />
                </fieldset>
                {!result && <p className="mt-3 text-xs text-muted">草稿会保留在当前浏览器标签页中，切题和刷新均可恢复。</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="btn-primary" onClick={() => void perform(submit)} disabled={busy || Boolean(result) || (Array.isArray(answer) ? answer.length === 0 : !answer.trim())}>
                    <Send className="h-4 w-4" aria-hidden="true" />
                    {busy ? "处理中…" : result ? "已提交答案" : "提交答案"}
                  </button>
                  {result && <button className="btn-secondary" disabled={busy} onClick={() => void perform(async () => { await finalizeCurrentAiSummary(); removeCachedPracticeAnswer(sessionId, question.id); saveDraft(sessionId, question.id, answer); setResult(null); })}>重新作答</button>}
                </div>
              </div>
            </section>
            {result && (
              <>
                <ExplanationPanel result={result} />
                <Link className="btn-secondary btn-sm" to={editQuestionPath(question.id, returnTo)}>
                  发现题目有误？编辑题目
                </Link>
              </>
            )}
            {result?.requires_self_review && (
              <div className="flex gap-2">
                <button className="rounded-md bg-accent px-4 py-2 text-sm text-on-accent" onClick={() => void perform(() => review("correct"))} disabled={busy}>我答对了</button>
                <button className="btn-secondary" onClick={() => void perform(() => review("partial"))} disabled={busy}>部分答对</button>
                <button className="btn-danger" onClick={() => void perform(() => review("wrong"))} disabled={busy}>我答错了</button>
              </div>
            )}
          </>
        )}
      </div>
      <aside hidden={!assistantOpen} className="practice-assistant panel p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold tracking-tight">练习上下文</h2>
          <span className="chip">实时</span>
        </div>
        <div className="space-y-1.5 rounded-xl border border-line bg-panel-2/60 p-3.5 text-xs leading-5 text-muted">
          {contextText.map((item) => <p key={item}>{item}</p>)}
        </div>
        {hasPreviousGroup && <p className="mt-2.5 text-xs text-muted">上一题可回到上一组内容。</p>}
        {hasNextGroup && <p className="mt-1 text-xs text-muted">当前组刷完后可继续下一组。</p>}
        <AiTutorPanel key={`tutor:${question?.id ?? "none"}:${result?.attempt_id ?? "unsubmitted"}`} question={question} attemptId={result?.attempt_id} submitted={Boolean(result)} onSummaryPendingChange={setAiTutorSummaryPending} onConfigChange={setAiConfig} />
        <AiGradingPanel key={`grading:${question?.id ?? "none"}:${result?.attempt_id ?? "unsubmitted"}`} question={question} attemptId={result?.attempt_id} submitted={Boolean(result)} config={aiConfig} onSummaryPendingChange={setAiGradingSummaryPending} />
      </aside>
      <Dialog open={restartOpen} title="重新开始练习？" onClose={() => setRestartOpen(false)} busy={busy}><p className="text-sm leading-6 text-muted">重新开始会创建新会话，并清除当前会话的未提交草稿。已经保存的答题记录会保留。</p><div className="mt-5 flex justify-end gap-2"><button className="btn-secondary" onClick={() => setRestartOpen(false)} disabled={busy}>继续当前练习</button><button className="btn-primary" disabled={busy} onClick={() => { setRestartOpen(false); void perform(() => startPractice()); }}>确认重新开始</button></div></Dialog>
      <DeleteQuestionDialog open={deleteOpen} onCancel={() => setDeleteOpen(false)} onConfirm={(reason) => void perform(() => deleteCurrentQuestion(reason))} />
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
      <select className="w-full rounded-md border border-line bg-panel px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)}>
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
  try { sessionStorage.setItem(PRACTICE_ANSWER_CACHE_KEY, JSON.stringify(cache)); } catch { /* Keep active answer in memory. */ }
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
