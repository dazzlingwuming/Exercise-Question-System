import { Bot, KeyRound, Send, Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getAiThread, runAiActionStream, sendAiMessageStream, testAiConnection, type AiConfig, type AiMessage, type AiThread } from "../../api/ai";
import type { Question } from "../../types/question";

const STORAGE_KEY = "ai_tutor_deepseek_config";

const ACTIONS = [
  { key: "hint", label: "给我提示" },
  { key: "explanation", label: "讲解与错因分析" },
  { key: "engineering_example", label: "工程例子" },
  { key: "interview_followup", label: "面试追问" },
] as const;

const ACTION_USER_TEXT: Record<string, string> = {
  hint: "请给我提示。",
  explanation: "请讲解这道题，并分析我的答案。",
  engineering_example: "请给出一个工程例子。",
  interview_followup: "请生成面试追问。",
};

export function AiTutorPanel({
  question,
  attemptId,
  submitted,
  onSummaryPendingChange,
  onConfigChange,
}: {
  question: Question | null;
  attemptId?: string;
  submitted: boolean;
  onSummaryPendingChange?: (pending: boolean) => void;
  onConfigChange?: (config: AiConfig) => void;
}) {
  const [thread, setThread] = useState<AiThread | null>(null);
  const [config, setConfig] = useState<AiConfig>(() => loadConfig());
  const [showSettings, setShowSettings] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState("");
  const [notice, setNotice] = useState("");

  const hasKey = Boolean(config.api_key?.trim());
  const placeholder = submitted ? "继续追问这道题的原理、错因、工程场景或面试回答。" : "可以问概念、思路、题干含义，但 AI 不会直接告诉你答案。";

  useEffect(() => {
    setNotice("");
    if (!question) {
      setThread(null);
      return;
    }
    getAiThread(question.id, attemptId).then(setThread).catch((err) => setNotice(err.message));
  }, [question?.id, attemptId]);

  useEffect(() => {
    saveConfig(config);
    onConfigChange?.(config);
  }, [config]);

  useEffect(() => {
    const pending = Boolean(submitted && thread?.has_previous_ai_history && !thread.previous_summary);
    onSummaryPendingChange?.(pending);
  }, [submitted, thread?.has_previous_ai_history, thread?.previous_summary, onSummaryPendingChange]);

  const statusText = useMemo(() => {
    if (!question) return "未选择题目";
    if (!submitted) return "答题中";
    if (thread?.has_explanation) return "已讲解";
    return "已提交";
  }, [question, submitted, thread]);

  async function triggerAction(action: string) {
    if (!question || !hasKey) return;
    setLoading(action);
    setNotice("");
    try {
      appendStreamingMessages(action, ACTION_USER_TEXT[action] ?? action);
      await runAiActionStream(question.id, action, config, attemptId, handleStreamEvent);
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setLoading("");
    }
  }

  async function send() {
    if (!question || !input.trim() || !hasKey) return;
    const content = input.trim();
    setInput("");
    setLoading("message");
    setNotice("");
    try {
      appendStreamingMessages("free_chat", content);
      await sendAiMessageStream(question.id, content, config, attemptId, handleStreamEvent);
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setLoading("");
    }
  }


  function appendStreamingMessages(stage: string, userContent: string) {
    const now = new Date().toISOString();
    const optimisticMessages: AiMessage[] = [
      { role: "user", stage, content: userContent, created_at: `${now}-user` },
      { role: "assistant", stage, content: "", created_at: `${now}-assistant-streaming` },
    ];
    setThread((current) => current ? { ...current, messages: [...current.messages, ...optimisticMessages] } : current);
  }

  function handleStreamEvent(event: { type: string; content?: string; message?: string; thread?: AiThread }) {
    if (event.type === "error") {
      setNotice(event.message ?? "AI 调用失败");
      setThread((current) => current ? { ...current, messages: current.messages.filter((message) => !String(message.created_at ?? "").includes("assistant-streaming")) } : current);
      return;
    }
    if (event.type === "delta" && event.content) {
      setThread((current) => {
        if (!current) return current;
        const messages = [...current.messages];
        let index = -1;
        for (let i = messages.length - 1; i >= 0; i -= 1) {
          if (String(messages[i].created_at ?? "").includes("assistant-streaming")) {
            index = i;
            break;
          }
        }
        if (index >= 0) messages[index] = { ...messages[index], content: messages[index].content + event.content };
        return { ...current, messages };
      });
      return;
    }
    if (event.type === "done" && event.thread) {
      setThread(event.thread);
    }
  }


  async function testConnection() {
    setLoading("test");
    setNotice("");
    try {
      const response = await testAiConnection(config);
      setNotice(response.message);
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setLoading("");
    }
  }

  return (
    <section className="mt-4 border-t border-line pt-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold">
          <Bot className="h-4 w-4" />
          AI 讲题助手（调用大模型）
        </div>
        <button className="rounded-md border border-line bg-white p-2" onClick={() => setShowSettings((value) => !value)} title="AI 设置">
          <Settings className="h-4 w-4" />
        </button>
      </div>
      <div className="mb-3 text-sm text-muted">状态：{statusText}</div>
      {showSettings && (
        <div className="mb-3 space-y-2 rounded-md border border-line bg-surface p-3">
          <input className="w-full rounded-md border border-line px-3 py-2 text-sm" value={config.base_url ?? ""} onChange={(event) => setConfig({ ...config, base_url: event.target.value })} placeholder="https://api.deepseek.com" />
          <input className="w-full rounded-md border border-line px-3 py-2 text-sm" type="password" value={config.api_key ?? ""} onChange={(event) => setConfig({ ...config, api_key: event.target.value })} placeholder="DeepSeek API Key" />
          <input className="w-full rounded-md border border-line px-3 py-2 text-sm" value={config.model ?? ""} onChange={(event) => setConfig({ ...config, model: event.target.value })} placeholder="deepseek-chat" />
          <button className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm" onClick={testConnection} disabled={!hasKey || loading === "test"}>
            <KeyRound className="h-4 w-4" />
            测试连接
          </button>
        </div>
      )}
      {!hasKey && <div className="mb-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">请先配置 DeepSeek API Key 后使用 AI 讲题助手。API Key 仅保存在本浏览器 sessionStorage。</div>}
      {notice && <div className="mb-3 rounded-md bg-surface p-3 text-sm text-muted">{notice}</div>}
      {submitted && thread?.has_previous_ai_history && !thread.previous_summary && (
        <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          离开本题前会自动总结本题 AI 对话；总结完成后原始聊天记录会被删除。生成中请不要直接关闭页面。
        </div>
      )}
      {submitted && thread?.previous_summary && (
        <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          <div className="mb-1 font-medium">AI 学习摘要</div>
          <div className="whitespace-pre-wrap">{thread.previous_summary}</div>
        </div>
      )}
      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        {ACTIONS.map((action) => {
          const allowed = action.key === "hint" ? true : Boolean(thread?.allowed_actions[action.key]);
          return (
            <button key={action.key} className="rounded-md border border-line bg-white px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50" disabled={!question || !hasKey || !allowed || Boolean(loading)} onClick={() => triggerAction(action.key)}>
              {loading === action.key ? "生成中..." : action.label}
            </button>
          );
        })}
      </div>
      <div className="max-h-[34rem] min-h-72 space-y-4 overflow-auto rounded-md border border-line bg-white p-4">
        {thread?.messages.length ? thread.messages.map((message, index) => (
          <div key={`${message.created_at}-${index}`} className={message.role === "assistant" ? "text-[15px] leading-7" : "text-sm leading-6 text-muted"}>
            <div className="mb-1 text-xs text-muted">{message.role === "assistant" ? "AI" : "你"} · {stageLabel(message.stage)}</div>
            <div className="whitespace-pre-wrap">{message.content}</div>
          </div>
        )) : <div className="text-sm text-muted">暂无 AI 对话。</div>}
      </div>
      <div className="mt-3 flex items-end gap-2">
        <textarea
          className="min-h-20 min-w-0 flex-1 resize-y rounded-md border border-line px-3 py-2 text-sm leading-6"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) void send();
          }}
          placeholder={placeholder}
          rows={3}
        />
        <button className="inline-flex h-20 w-12 items-center justify-center rounded-md bg-accent text-sm text-white disabled:opacity-50" onClick={send} disabled={!question || !hasKey || !input.trim() || Boolean(loading)} title="发送，Ctrl+Enter">
          <Send className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-1 text-xs text-muted">Ctrl+Enter 发送，Enter 换行。</div>
    </section>
  );
}

function loadConfig(): AiConfig {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    return {};
  }
  return { provider: "deepseek", base_url: "https://api.deepseek.com", model: "deepseek-chat" };
}

function saveConfig(config: AiConfig) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ provider: "deepseek", base_url: config.base_url || "https://api.deepseek.com", api_key: config.api_key || "", model: config.model || "deepseek-chat" }));
}

function stageLabel(stage: string) {
  return {
    hint: "提示",
    explanation: "讲解",
    engineering_example: "工程例子",
    interview_followup: "面试追问",
    free_chat: "追问",
    guardrail: "防泄露提示",
  }[stage] ?? stage;
}
