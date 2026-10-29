import type { AiConfig } from "../../api/ai";

const fields: Array<{ key: keyof AiConfig; label: string; placeholder: string; secret?: boolean }> = [
  { key: "base_url", label: "API 地址", placeholder: "https://api.deepseek.com" },
  { key: "api_key", label: "DeepSeek API Key", placeholder: "填写密钥，或使用后端环境变量", secret: true },
  { key: "tutor_model", label: "讲题模型", placeholder: "deepseek-flash" },
  { key: "vision_model", label: "图片理解模型", placeholder: "deepseek-flash" },
  { key: "grading_model", label: "评分模型", placeholder: "deepseek-v4-pro" },
  { key: "generation_model", label: "题目生成与文本解析模型", placeholder: "deepseek-v4-pro" },
];

export function AiConfigFields({ config, onChange, disabled = false, showSearch = false }: {
  config: AiConfig; onChange: (config: AiConfig) => void; disabled?: boolean; showSearch?: boolean;
}) {
  return <fieldset disabled={disabled} className="space-y-3">
    {fields.map(field => <label className="block" key={field.key}>
      <span className="mb-1 block text-xs text-muted">{field.label}</span>
      <input className="w-full rounded-md border border-line bg-panel px-3 py-2 text-sm"
        type={field.secret ? "password" : "text"} autoComplete="off" spellCheck={false}
        value={String(config[field.key] ?? "")} placeholder={field.placeholder}
        onChange={event => onChange({ ...config, [field.key]: event.target.value, ...(field.key === "tutor_model" ? { model: event.target.value } : {}) })} />
    </label>)}
    <p className="text-xs leading-6 text-muted">含图请求自动使用图片理解模型。密钥仅保存在本机浏览器，不写入题库。</p>
    {showSearch && <details><summary className="text-xs text-muted">联网搜索配置</summary>
      <label className="mt-3 block text-xs text-muted">AnySearch Endpoint<input className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm" value={config.anysearch_endpoint ?? ""} onChange={event => onChange({ ...config, anysearch_endpoint: event.target.value })} /></label>
      <label className="mt-3 block text-xs text-muted">AnySearch API Key<input type="password" autoComplete="off" className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm" value={config.anysearch_api_key ?? ""} onChange={event => onChange({ ...config, anysearch_api_key: event.target.value })} /></label>
    </details>}
  </fieldset>;
}
