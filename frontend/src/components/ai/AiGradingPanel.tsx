import { BarChart3, RefreshCw, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getLatestAiGrading, gradeSubjectiveAnswer, sendAiGradingMessageStream, type AiConfig, type AiGradingCard, type AiGradingResult, type AiMessage } from "../../api/ai";
import type { Question } from "../../types/question";

const OBJECTIVE_TYPES = new Set(["single_choice", "multiple_choice", "true_false", "fill_blank"]);
const GRADING_MODEL_LABEL = "deepseek-v4-pro";

export function AiGradingPanel({
  question,
  attemptId,
  submitted,
  config,
  onSummaryPendingChange,
}: {
  question: Question | null;
  attemptId?: string;
  submitted: boolean;
  config: AiConfig;
  onSummaryPendingChange?: (pending: boolean) => void;
}) {
  const [grading, setGrading] = useState<AiGradingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [input, setInput] = useState("");
  const [notice, setNotice] = useState("");

  const supported = useMemo(() => Boolean(question && !OBJECTIVE_TYPES.has(question.type)), [question?.id, question?.type]);
  const hasKey = Boolean(config.api_key?.trim());

  useEffect(() => {
    setNotice("");
    setGrading(null);
    if (!attemptId || !supported) return;
    getLatestAiGrading(attemptId).then((response) => {
      if (response.result) setGrading(response);
    }).catch(() => undefined);
  }, [attemptId, supported]);

  useEffect(() => {
    onSummaryPendingChange?.(Boolean(submitted && grading?.messages?.length));
  }, [submitted, grading?.messages?.length, onSummaryPendingChange]);

  if (!question || !supported) return null;

  async function runGrade() {
    if (!question || !attemptId || !hasKey) return;
    setLoading(true);
    setNotice("");
    try {
      const response = await gradeSubjectiveAnswer(question.id, attemptId, config);
      setGrading(response);
    } catch (err) {
      setNotice(readApiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!grading?.grading_id || !input.trim() || !hasKey) return;
    const content = input.trim();
    setInput("");
    setChatLoading(true);
    setNotice("");
    appendStreamingMessages(content);
    try {
      await sendAiGradingMessageStream(grading.grading_id, content, config, handleStreamEvent);
    } catch (err) {
      setNotice(readApiError(err));
    } finally {
      setChatLoading(false);
    }
  }

  function appendStreamingMessages(content: string) {
    const now = new Date().toISOString();
    setGrading((current) => {
      if (!current) return current;
      return {
        ...current,
        messages: [
          ...(current.messages ?? []),
          { role: "user", stage: "grading_chat", content, created_at: `${now}-user` },
          { role: "assistant", stage: "grading_chat", content: "", created_at: `${now}-assistant-streaming` },
        ],
      };
    });
  }

  function handleStreamEvent(event: { type: string; content?: string; message?: string; grading?: AiGradingResult }) {
    if (event.type === "error") {
      setNotice(event.message ?? "AI 评分追问失败");
      setGrading((current) => removeStreamingAssistant(current));
      return;
    }
    if (event.type === "delta" && event.content) {
      setGrading((current) => appendAssistantDelta(current, event.content ?? ""));
      return;
    }
    if (event.type === "done" && event.grading) {
      setGrading(event.grading);
    }
  }

  return (
    <section className="mt-4 border-t border-line pt-4">
      <div className="mb-3 flex items-center gap-2 font-semibold">
        <BarChart3 className="h-4 w-4" />
        AI 主观题评分
      </div>
      {!submitted && <div className="rounded-md bg-surface p-3 text-sm text-muted">请先提交主观题答案，再进行 AI 评分。</div>}
      {submitted && !hasKey && <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">请先在 AI 讲题助手中配置 DeepSeek API Key。</div>}
      {submitted && hasKey && <div className="mb-3 text-xs text-muted">评分模型：{GRADING_MODEL_LABEL}。聊天模型设置不会影响评分模型。</div>}
      {submitted && hasKey && (
        <button className="mb-3 inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm disabled:opacity-50" onClick={runGrade} disabled={loading || !attemptId}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {grading?.result ? "重新评分" : "开始 AI 评分"}
        </button>
      )}
      {notice && <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{notice}</div>}
      {grading?.result && (
        <>
          <AiGradingCardView card={grading.result} createdAt={grading.created_at} model={grading.model} />
          <AiGradingChat messages={grading.messages ?? []} input={input} setInput={setInput} onSend={sendMessage} disabled={!hasKey || chatLoading || !grading.grading_id} loading={chatLoading} />
        </>
      )}
    </section>
  );
}

function AiGradingCardView({ card, createdAt, model }: { card: AiGradingCard; createdAt?: string | null; model?: string | null }) {
  return (
    <div className="space-y-3 rounded-md border border-line bg-white p-4 text-sm">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-xs text-muted">AI 评分卡</div>
          <div className="mt-1 text-2xl font-semibold">{card.score} / {card.max_score}</div>
        </div>
        <span className="rounded-md bg-accent/10 px-2 py-1 text-xs font-medium text-accent">{card.level}</span>
      </div>
      <p className="leading-6 text-muted">{card.summary}</p>
      <MetaLine createdAt={createdAt} model={model} />
      {card.dimension_scores.length > 0 && (
        <div>
          <div className="mb-2 font-medium">维度评分</div>
          <div className="space-y-2">
            {card.dimension_scores.map((item) => (
              <div key={item.name} className="rounded-md bg-surface p-2">
                <div className="flex justify-between gap-3">
                  <span>{item.name}</span>
                  <span>{item.score} / {item.max_score}</span>
                </div>
                {item.comment && <div className="mt-1 text-xs leading-5 text-muted">{item.comment}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
      <PointList title="已覆盖" items={card.matched_points} tone="good" />
      <PointList title="缺失点" items={card.missing_points} tone="warn" />
      <PointList title="错误或不清楚" items={card.wrong_or_unclear_points} tone="bad" />
      {card.improvement_suggestion && <TextBlock title="改进建议" content={card.improvement_suggestion} />}
      {card.better_answer && <TextBlock title="更好的参考表达" content={card.better_answer} />}
    </div>
  );
}

function MetaLine({ createdAt, model }: { createdAt?: string | null; model?: string | null }) {
  const parts = [];
  if (model) parts.push(`模型：${model}`);
  if (createdAt) parts.push(`时间：${new Date(createdAt).toLocaleString()}`);
  if (!parts.length) return null;
  return <div className="text-xs text-muted">{parts.join(" · ")}</div>;
}

function PointList({ title, items, tone }: { title: string; items: string[]; tone: "good" | "warn" | "bad" }) {
  if (!items.length) return null;
  const color = tone === "good" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : "text-red-700";
  return (
    <div>
      <div className="mb-1 font-medium">{title}</div>
      <ul className={`space-y-1 leading-6 ${color}`}>
        {items.map((item, index) => <li key={`${title}-${index}`}>- {item}</li>)}
      </ul>
    </div>
  );
}

function TextBlock({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <div className="mb-1 font-medium">{title}</div>
      <div className="whitespace-pre-wrap rounded-md bg-surface p-2 leading-6">{content}</div>
    </div>
  );
}

function AiGradingChat({
  messages,
  input,
  setInput,
  onSend,
  disabled,
  loading,
}: {
  messages: AiMessage[];
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
  loading: boolean;
}) {
  return (
    <div className="mt-3 rounded-md border border-line bg-white p-3 text-sm">
      <div className="mb-2 font-medium">围绕评分追问</div>
      <div className="mb-3 max-h-80 min-h-32 space-y-3 overflow-auto rounded-md bg-surface p-3">
        {messages.length ? messages.map((message, index) => (
          <div key={`${message.created_at}-${index}`} className={message.role === "assistant" ? "leading-6" : "text-muted"}>
            <div className="mb-1 text-xs text-muted">{message.role === "assistant" ? "AI" : "你"}</div>
            <div className="whitespace-pre-wrap">{message.content}</div>
          </div>
        )) : <div className="text-muted">可以追问为什么扣分、怎么补漏点、如何把答案改到更高分。</div>}
        {loading && <div className="text-muted">AI 正在解释评分...</div>}
      </div>
      <div className="flex items-end gap-2">
        <textarea
          className="min-h-24 min-w-0 flex-1 resize-y rounded-md border border-line px-3 py-2 text-sm leading-6"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) onSend();
          }}
          placeholder="例如：为什么这里扣分？怎样答可以到 9 分？"
          disabled={disabled}
          rows={4}
        />
        <button className="inline-flex h-24 w-12 items-center justify-center rounded-md bg-accent text-white disabled:opacity-50" onClick={onSend} disabled={disabled || !input.trim()} title="发送，Ctrl+Enter">
          <Send className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-1 text-xs text-muted">Ctrl+Enter 发送，Enter 换行。</div>
    </div>
  );
}

function appendAssistantDelta(current: AiGradingResult | null, delta: string): AiGradingResult | null {
  if (!current) return current;
  const messages = [...(current.messages ?? [])];
  let index = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (String(messages[i].created_at ?? "").includes("assistant-streaming")) {
      index = i;
      break;
    }
  }
  if (index >= 0) {
    messages[index] = { ...messages[index], content: messages[index].content + delta };
  }
  return { ...current, messages };
}

function removeStreamingAssistant(current: AiGradingResult | null): AiGradingResult | null {
  if (!current) return current;
  return { ...current, messages: (current.messages ?? []).filter((message) => !String(message.created_at ?? "").includes("assistant-streaming")) };
}

function readApiError(err: unknown) {
  const message = (err as Error).message;
  try {
    const parsed = JSON.parse(message);
    return parsed.detail?.message ?? parsed.detail ?? message;
  } catch {
    return message;
  }
}
