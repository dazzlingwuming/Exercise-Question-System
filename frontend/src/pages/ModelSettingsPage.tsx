import { Check, ChevronRight, CircleHelp, KeyRound, LoaderCircle, Plus, Radio, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { checkConnection } from "../api/studio";
import { AiConfigFields } from "../components/ai/AiConfigFields";
import { loadStoredAiConfig, saveStoredAiConfig } from "../utils/aiConfigStorage";
import { connectionPayload, loadConnections, saveConnections, type ModelProfile } from "../utils/modelConnections";

export function ModelSettingsPage() {
  const [store, setStore] = useState(loadConnections);
  const [selected, setSelected] = useState(store.activeId);
  const [draft, setDraft] = useState<ModelProfile>(() => store.profiles.find(p => p.id === selected)!);
  const [legacy, setLegacy] = useState(loadStoredAiConfig);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [testing, setTesting] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(store.profiles.find(p => p.id === selected));
  const update = (change: Partial<ModelProfile>) => { setDraft({ ...draft, ...change }); setNotice(""); setError(""); };
  function switchTo(profile: ModelProfile) { setDraft(profile); setSelected(profile.id); setError(""); setNotice(""); }
  function save(makeDefault = false) {
    setError(""); setNotice("");
    if (!draft.name.trim() || !draft.model.trim()) { setError("请填写连接名称和模型名称。"); return; }
    try {
      const value = { ...draft, ...connectionPayload(draft), name: draft.name.trim() };
      const url = new URL(value.base_url);
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || value.base_url.endsWith("/chat/completions")) throw new Error("请填写不含 /chat/completions、密钥或查询参数的 http/https 基础地址。");
      const profiles = store.profiles.some(p => p.id === selected) ? store.profiles.map(p => p.id === selected ? value : p) : [...store.profiles, value];
      const next = { profiles, activeId: makeDefault ? selected : store.activeId };
      saveConnections(next); setStore(next); setDraft(value); setNotice(makeDefault ? "已保存并设为工作台默认连接。" : "连接已保存。");
    } catch (err) { setError((err as Error).message); }
  }
  async function test() {
    setError(""); setNotice(""); setTesting(true);
    try { await checkConnection(connectionPayload(draft)); setNotice("文本连接成功。图片能力请按服务商说明勾选，并在讨论中实际验证。"); }
    catch (err) { setError((err as Error).message); }
    finally { setTesting(false); }
  }
  function remove() {
    const profiles = store.profiles.filter(p => p.id !== selected);
    if (!profiles.length) { setError("请至少保留一个连接。"); return; }
    try { const next = { profiles, activeId: store.activeId === selected ? profiles[0].id : store.activeId }; saveConnections(next); setStore(next); switchTo(profiles[0]); }
    catch (err) { setError((err as Error).message); }
  }
  return <div className="connection-page">
    <header className="studio-page-heading"><div><p className="section-kicker">CONNECTIONS</p><h1>连接你的 AI</h1><p>填写一次，在工作台随时切换模型。</p></div><Link className="btn-secondary" to="/studio">打开工作台 <ChevronRight size={16} /></Link></header>
    <div className="connection-layout">
      <aside className="connection-list" aria-label="模型连接列表">
        {store.profiles.map(profile => <button disabled={testing || (dirty && selected !== profile.id)} key={profile.id} className={selected === profile.id ? "is-active" : ""} onClick={() => switchTo(profile)}><Radio size={17} /><span><strong>{profile.name}</strong><small>{profile.model}</small></span>{store.activeId === profile.id && <Check size={15} aria-label="默认连接" />}</button>)}
        <button disabled={testing || dirty} onClick={() => switchTo({ id: crypto.randomUUID(), name: "新的连接", base_url: "", api_key: "", model: "", supports_images: false })}><Plus size={17} />添加连接</button>
        {dirty && <p className="text-xs text-muted leading-6">有未保存的修改。<button className="text-accent underline" disabled={testing} onClick={() => switchTo(store.profiles.find(p => p.id === selected) || store.profiles[0])}>放弃修改</button></p>}
      </aside>
      <section className="connection-editor">
        <div className="section-heading"><h2>{draft.name || "新的连接"}</h2><span>Chat Completions 兼容接口</span></div>
        <fieldset disabled={testing} className="connection-fields">
          <label>连接名称<input maxLength={60} value={draft.name} onChange={e => update({ name: e.target.value })} placeholder="例如：日常学习" /></label>
          <label>API 基础地址<input autoComplete="off" spellCheck={false} value={draft.base_url} onChange={e => update({ base_url: e.target.value })} placeholder="https://api.deepseek.com" /><small>使用服务商给出的基础地址；部分服务需要以 /v1 结尾。</small></label>
          <label>API Key<input type="password" autoComplete="off" spellCheck={false} value={draft.api_key} onChange={e => update({ api_key: e.target.value })} placeholder="本地免密服务可留空" /></label>
          <label>模型名称<input autoComplete="off" spellCheck={false} maxLength={120} value={draft.model} onChange={e => update({ model: e.target.value })} placeholder="deepseek-flash" /></label>
          <label className="connection-checkbox"><input type="checkbox" checked={draft.supports_images} onChange={e => update({ supports_images: e.target.checked })} /><span>这个模型支持图片输入<small>仅在模型和接口均支持 image_url 时开启。</small></span></label>
        </fieldset>
        <div className="connection-actions"><button className="btn-primary" disabled={testing} onClick={() => save(true)}><Save size={16} />保存并使用</button><button className="btn-secondary" disabled={testing || !draft.base_url.trim() || !draft.model.trim()} onClick={() => void test()}>{testing ? <LoaderCircle size={16} className="animate-spin" /> : <Radio size={16} />}测试连接</button><button className="btn-ghost" disabled={testing || store.profiles.length === 1 || dirty} onClick={remove}><Trash2 size={15} />移除</button></div>
        {error && <p role="alert" className="text-sm text-bad mt-4">{error}</p>}{notice && <p role="status" className="text-sm text-good mt-4">{notice}</p>}
        <div className="connection-help"><KeyRound size={18} /><p>连接密钥保存在当前浏览器；发送请求时经本地后端转发到所填地址，不会写入聊天记录或导出文件。测试连接会发送一条很短的文本请求。</p></div>
        <details className="connection-advanced"><summary><CircleHelp size={16} />题库 AI 的任务配置</summary><p className="text-sm text-muted my-4">讲题、评分与生成题目可以继续使用不同模型。这里修改后会同步到题库内的 AI 设置。</p><AiConfigFields config={legacy} onChange={setLegacy} showSearch /><button className="btn-secondary mt-4" onClick={() => { saveStoredAiConfig(legacy); setNotice("题库 AI 配置已保存。"); }}>保存题库配置</button></details>
      </section>
    </div>
  </div>;
}
