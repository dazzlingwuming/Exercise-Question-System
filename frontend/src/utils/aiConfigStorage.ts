import type { AiConfig } from "../api/ai";

export const AI_CONFIG_STORAGE_KEY = "ai_tutor_deepseek_config";

const DEFAULT_AI_CONFIG: AiConfig = {
  provider: "deepseek",
  base_url: "https://api.deepseek.com",
  model: "deepseek-chat",
  tutor_model: "deepseek-chat",
  grading_model: "deepseek-v4-pro",
  generation_model: "deepseek-v4-pro",
};

export function loadStoredAiConfig(): AiConfig {
  const localConfig = readConfig(localStorage);
  if (localConfig) return normalizeConfig(localConfig);

  const sessionConfig = readConfig(sessionStorage);
  if (sessionConfig) {
    const normalized = normalizeConfig(sessionConfig);
    writeConfig(localStorage, normalized);
    return normalized;
  }

  return { ...DEFAULT_AI_CONFIG };
}

export function saveStoredAiConfig(config: AiConfig): AiConfig {
  const normalized = normalizeConfig(config);
  writeConfig(localStorage, normalized);
  writeConfig(sessionStorage, normalized);
  return normalized;
}

export function aiConfigForRole(config: AiConfig, role: "tutor" | "grading" | "generation"): AiConfig {
  const normalized = normalizeConfig(config);
  const model = role === "tutor"
    ? (normalized.tutor_model || normalized.model || "deepseek-chat")
    : role === "grading"
      ? (normalized.grading_model || "deepseek-v4-pro")
      : (normalized.generation_model || "deepseek-v4-pro");
  return { ...normalized, model };
}

function normalizeConfig(config: AiConfig): AiConfig {
  const legacyModel = config.model || DEFAULT_AI_CONFIG.model;
  return {
    provider: "deepseek",
    base_url: config.base_url || DEFAULT_AI_CONFIG.base_url,
    api_key: config.api_key || "",
    model: legacyModel,
    tutor_model: config.tutor_model || legacyModel || DEFAULT_AI_CONFIG.tutor_model,
    grading_model: config.grading_model || DEFAULT_AI_CONFIG.grading_model,
    generation_model: config.generation_model || DEFAULT_AI_CONFIG.generation_model,
    stream: config.stream,
  };
}

function readConfig(storage: Storage): AiConfig | null {
  try {
    const raw = storage.getItem(AI_CONFIG_STORAGE_KEY);
    return raw ? JSON.parse(raw) as AiConfig : null;
  } catch {
    return null;
  }
}

function writeConfig(storage: Storage, config: AiConfig) {
  try {
    storage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // 浏览器禁用存储时不阻断答题流程，只是无法持久化 AI 配置。
  }
}
