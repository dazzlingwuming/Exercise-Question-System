export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000/api";

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(readApiErrorMessage(body) || `API 请求失败：${response.status}`);
  }
  return response.json() as Promise<T>;
}

function readApiErrorMessage(body: string) {
  if (!body) return "";
  try {
    const parsed = JSON.parse(body) as { detail?: unknown; message?: unknown };
    const detail = parsed.detail ?? parsed.message;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object" && "message" in detail && typeof detail.message === "string") return detail.message;
  } catch {
    // 非 JSON 错误（例如反向代理错误）直接展示原文即可。
  }
  return body;
}
