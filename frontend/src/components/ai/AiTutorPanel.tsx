import { Bot, KeyRound, Send, Settings, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { generateAiQuestions, getAiThread, runAiActionStream, sendAiMessageStream, testAiConnection, type AiConfig, type AiMessage, type AiThread } from "../../api/ai";
import type { Question } from "../../types/question";
import { aiConfigForRole, loadStoredAiConfig, saveStoredAiConfig } from "../../utils/aiConfigStorage";

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

const TYPE_OPTIONS = [
  ["single_choice", "单选题"],
  ["multiple_choice", "多选题"],
  ["true_false", "判断题"],
  ["fill_blank", "填空题"],
  ["short_answer", "简答题"],
  ["concept_analysis", "概念辨析题"],
  ["scenario_analysis", "场景分析题"],
  ["interview", "面试题"],
  ["debug_analysis", "Debug / 日志分析题"],
  ["code_reading", "代码阅读 / 伪代码设计题"],
  ["system_design", "系统设计题"],
  ["project_follow_up", "项目追问模拟"],
] as const;

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
  const navigate = useNavigate();
  const location = useLocation();
  const [thread, setThread] = useState<AiThread | null>(null);
  const [config, setConfig] = useState<AiConfig>(() => loadStoredAiConfig());
  const [showSettings, setShowSettings] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState("");
  const [notice, setNotice] = useState("");
  const [showGenerationPanel, setShowGenerationPanel] = useState(false);
  const [generationMessage, setGenerationMessage] = useState<AiMessage | null>(null);
  const [generationForm, setGenerationForm] = useState({ target_type: question?.type ?? "short_answer", count: "1", difficulty_strategy: "keep", generation_direction: "", use_web_search: false });

  const hasKey = Boolean(config.api_key?.trim());
  const placeholder = submitted ? "继续追问这道题的原理、错因、工程场景或面试回答。" : "可以问概念、思路、题干含义，但 AI 不会直接告诉你答案。";

  useEffect(() => {
    setNotice("");
    setShowGenerationPanel(false);
    setGenerationMessage(null);
    setGenerationForm((current) => ({ ...current, target_type: question?.type ?? "short_answer" }));
    if (!question) {
      setThread(null);
      return;
    }
    getAiThread(question.id, attemptId).then(setThread).catch((err) => setNotice(err.message));
  }, [question?.id, attemptId]);

  useEffect(() => {
    saveStoredAiConfig(config);
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
      await runAiActionStream(question.id, action, aiConfigForRole(config, "tutor"), attemptId, handleStreamEvent);
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
      await sendAiMessageStream(question.id, content, aiConfigForRole(config, "tutor"), attemptId, handleStreamEvent);
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
      const response = await testAiConnection(aiConfigForRole(config, "tutor"));
      setNotice(response.message);
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setLoading("");
    }
  }

  async function generateQuestions() {
    if (!question || !hasKey) return;
    setLoading("question_generation");
    setNotice(generationForm.use_web_search ? "正在联网搜索并基于当前题目的完整作答上下文生成候选题..." : "正在基于当前题目的完整作答上下文生成候选题...");
    try {
      const response = await generateAiQuestions({
        question_id: question.id,
        attempt_id: attemptId,
        clicked_ai_message: generationMessage?.content,
        target_type: generationForm.target_type,
        count: Number(generationForm.count),
        difficulty_strategy: generationForm.difficulty_strategy as "keep" | "lower" | "higher",
        generation_direction: generationForm.generation_direction.trim() || undefined,
        use_web_search: generationForm.use_web_search,
        ...aiConfigForRole(config, "generation"),
      });
      setShowGenerationPanel(false);
      setGenerationMessage(null);
      const returnTo = `${location.pathname}${location.search}`;
      navigate(`/ai/question-generation/${response.generation_id}?${new URLSearchParams({ return_to: returnTo }).toString()}`);
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
          <div className="grid gap-2">
            <label className="block">
              <span className="mb-1 block text-xs text-muted">AI 讲题助手模型</span>
              <input className="w-full rounded-md border border-line px-3 py-2 text-sm" value={config.tutor_model ?? config.model ?? ""} onChange={(event) => setConfig({ ...config, tutor_model: event.target.value, model: event.target.value })} placeholder="deepseek-chat" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted">AI 主观题评分模型</span>
              <input className="w-full rounded-md border border-line px-3 py-2 text-sm" value={config.grading_model ?? ""} onChange={(event) => setConfig({ ...config, grading_model: event.target.value })} placeholder="deepseek-v4-pro" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted">AI 生成题目模型</span>
              <input className="w-full rounded-md border border-line px-3 py-2 text-sm" value={config.generation_model ?? ""} onChange={(event) => setConfig({ ...config, generation_model: event.target.value })} placeholder="deepseek-v4-pro" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted">AnySearch Endpoint</span>
              <input className="w-full rounded-md border border-line px-3 py-2 text-sm" value={config.anysearch_endpoint ?? ""} onChange={(event) => setConfig({ ...config, anysearch_endpoint: event.target.value })} placeholder="https://api.anysearch.com/mcp" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted">AnySearch API Key</span>
              <input className="w-full rounded-md border border-line px-3 py-2 text-sm" type="password" value={config.anysearch_api_key ?? ""} onChange={(event) => setConfig({ ...config, anysearch_api_key: event.target.value })} placeholder="可选，不填则使用匿名额度或后端环境变量" />
            </label>
          </div>
          <button className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm" onClick={testConnection} disabled={!hasKey || loading === "test"}>
            <KeyRound className="h-4 w-4" />
            测试连接
          </button>
        </div>
      )}
      {!hasKey && <div className="mb-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">请先配置 DeepSeek API Key 后使用 AI 讲题助手。API Key 仅保存在本机浏览器 localStorage，不会写入后端数据库。</div>}
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
      <div className="mb-3">
        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-line bg-white px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!question || !hasKey || Boolean(loading)}
          onClick={() => {
            setGenerationMessage(null);
            setShowGenerationPanel(true);
          }}
        >
          <Sparkles className="h-4 w-4" />
          生成题目
        </button>
        <p className="mt-1 text-xs text-muted">基于当前题目、用户答案、AI 讲题对话、AI 评分与评分追问的完整上下文生成。</p>
      </div>
      <div className="max-h-[34rem] min-h-72 space-y-4 overflow-auto rounded-md border border-line bg-white p-4">
        {thread?.messages.length ? thread.messages.map((message, index) => (
          <div key={`${message.created_at}-${index}`} className={message.role === "assistant" ? "text-[15px] leading-7" : "text-sm leading-6 text-muted"}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted">
              <span>{message.role === "assistant" ? "AI" : "你"} · {stageLabel(message.stage)}</span>
              {message.role === "assistant" && message.content.trim() && !String(message.created_at ?? "").includes("assistant-streaming") && (
                <button className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-xs text-foreground" onClick={() => { setGenerationMessage(message); setShowGenerationPanel(true); }} disabled={!hasKey || Boolean(loading)}>
                  <Sparkles className="h-3 w-3" />
                  生成题目
                </button>
              )}
            </div>
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
      {showGenerationPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-xl rounded-lg bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">AI 生成候选题</h3>
                <p className="mt-1 text-sm text-muted">基于当前题目、作答记录、AI 对话和评分上下文生成，生成后需要人工确认入库。</p>
              </div>
              <button className="rounded-md border border-line bg-white p-2" onClick={() => { setShowGenerationPanel(false); setGenerationMessage(null); }}><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm text-muted">题型</span>
                <select className="w-full rounded-md border border-line px-3 py-2" value={generationForm.target_type} onChange={(event) => setGenerationForm({ ...generationForm, target_type: event.target.value })}>
                  {TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm text-muted">生成数量</span>
                  <select className="w-full rounded-md border border-line px-3 py-2" value={generationForm.count} onChange={(event) => setGenerationForm({ ...generationForm, count: event.target.value })}>
                    {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} 道</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-muted">难度</span>
                  <select className="w-full rounded-md border border-line px-3 py-2" value={generationForm.difficulty_strategy} onChange={(event) => setGenerationForm({ ...generationForm, difficulty_strategy: event.target.value })}>
                    <option value="keep">保持原难度</option>
                    <option value="lower">降低难度</option>
                    <option value="higher">提高难度</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-sm text-muted">生成方向</span>
                <textarea className="min-h-24 w-full rounded-md border border-line px-3 py-2 text-sm leading-6" value={generationForm.generation_direction} onChange={(event) => setGenerationForm({ ...generationForm, generation_direction: event.target.value })} placeholder="例如：重点加强 tool_result 写回状态，留空则根据缺失点和 AI 对话自动生成。" />
              </label>
              <label className="flex items-start gap-2 rounded-md border border-line bg-surface p-3 text-sm">
                <input
                  className="mt-1"
                  type="checkbox"
                  checked={generationForm.use_web_search}
                  onChange={(event) => setGenerationForm({ ...generationForm, use_web_search: event.target.checked })}
                />
                <span>
                  <span className="block font-medium">联网搜索增强</span>
                  <span className="mt-1 block text-xs leading-5 text-muted">启用后会先让模型生成搜索句，再搜索并提取相关网页片段辅助出题。AnySearch Key 可在 AI 设置里配置，联网资料仅作参考。</span>
                </span>
              </label>
              {generationMessage ? (
                <div className="rounded-md bg-surface p-3 text-xs leading-6 text-muted">
                  重点参考的 AI 回复片段：{generationMessage.content.slice(0, 160)}{generationMessage.content.length > 160 ? "..." : ""}
                </div>
              ) : (
                <div className="rounded-md bg-surface p-3 text-xs leading-6 text-muted">
                  未指定重点 AI 回复，将使用本题当前所有可用上下文生成。
                </div>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button className="rounded-md border border-line bg-white px-4 py-2 text-sm" onClick={() => { setShowGenerationPanel(false); setGenerationMessage(null); }}>取消</button>
              <button className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50" onClick={generateQuestions} disabled={!hasKey || loading === "question_generation"}>
                <Sparkles className="h-4 w-4" />
                {loading === "question_generation" ? "生成中..." : "生成候选题"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
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
