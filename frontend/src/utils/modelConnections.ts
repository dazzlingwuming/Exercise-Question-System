import type { Connection } from "../api/studio";
import { loadStoredAiConfig } from "./aiConfigStorage";

export type ModelProfile = Connection & { id: string; name: string };
export type ConnectionStore = { activeId: string; profiles: ModelProfile[] };
const KEY = "xiaojing_model_connections_v1";

export function loadConnections(): ConnectionStore {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "null") as ConnectionStore | null;
    if (data?.profiles?.length && data.profiles.every(p => typeof p.id === "string" && typeof p.name === "string" && typeof p.base_url === "string" && typeof p.model === "string" && typeof p.api_key === "string" && typeof p.supports_images === "boolean")) {
      return { profiles: data.profiles, activeId: data.profiles.some(p => p.id === data.activeId) ? data.activeId : data.profiles[0].id };
    }
  } catch { /* Recover from old or unavailable storage. */ }
  const old = loadStoredAiConfig();
  const model = old.tutor_model || old.model || "deepseek-flash";
  return { activeId: "initial", profiles: [{ id: "initial", name: "我的 DeepSeek", base_url: old.base_url || "https://api.deepseek.com", api_key: old.api_key || "", model, supports_images: model.includes("flash") }] };
}

export function saveConnections(store: ConnectionStore): void {
  try { localStorage.setItem(KEY, JSON.stringify(store)); }
  catch { throw new Error("浏览器未能保存连接，请检查是否禁用本地存储。密钥尚未保存。"); }
}

export function connectionPayload(profile: ModelProfile): Connection {
  return { base_url: profile.base_url.trim().replace(/\/+$/, ""), api_key: profile.api_key.trim(), model: profile.model.trim(), supports_images: profile.supports_images };
}
