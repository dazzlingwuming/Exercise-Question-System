import { API_BASE } from "./client";
export const MANAGED_IMAGE_PATH = /^\/api\/media\/images\/[a-f0-9]{32}$/;
export type ManagedImage = { id: string; url: string; mime_type: string; size_bytes: number; width: number; height: number };
export function managedImageUrl(path: string) { return MANAGED_IMAGE_PATH.test(path) ? new URL(path, new URL(API_BASE, window.location.href)).href : ""; }
export async function uploadImage(file: File): Promise<ManagedImage> {
  const body = new FormData(); body.append("file", file);
  const response = await fetch(`${API_BASE}/media/images`, { method: "POST", body });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail?.message || "图片上传失败，请重试。");
  if (!MANAGED_IMAGE_PATH.test(data.url)) throw new Error("服务返回了无效的图片路径。");
  return data;
}
