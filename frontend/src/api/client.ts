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
    const message = await response.text();
    throw new Error(message || `API 请求失败：${response.status}`);
  }
  return response.json() as Promise<T>;
}
