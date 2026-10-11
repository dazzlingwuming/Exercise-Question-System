import { ImagePlus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { uploadImage } from "../../api/media";
import { RichContent } from "./RichContent";
export function MarkdownEditor({ value, onChange, label, rows = 5, onUploadingChange, placeholder = "支持 Markdown、公式与图片" }: { value: string; onChange: (value: string) => void; label: string; rows?: number; onUploadingChange?: (uploading: boolean) => void; placeholder?: string }) {
  const id = useId(); const textarea = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const latest = useRef(value); latest.current = value;
  const change = useRef(onChange); change.current = onChange;
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => { if (!busy) return; onUploadingChange?.(true); return () => onUploadingChange?.(false); }, [busy, onUploadingChange]);
  async function upload(file?: File) {
    if (!file || busy) return;
    if (!["image/png","image/jpeg","image/webp"].includes(file.type)) { setError("请选择 PNG、JPEG 或 WebP 图片。"); return; }
    if (file.size > 5 * 1024 * 1024) { setError("图片不能超过 5 MiB。"); return; }
    setBusy(true); setError("");
    const start = textarea.current?.selectionStart ?? value.length; const end = textarea.current?.selectionEnd ?? start; const original = value;
    try { const image = await uploadImage(file); const markdown = `\n![${file.name.replace(/[\[\]\\\n]/g, "").replace(/\.[^.]+$/, "").slice(0,80) || "图片"}](${image.url})\n`; const current = latest.current; if (!active.current) return; change.current(current === original ? current.slice(0,start) + markdown + current.slice(end) : current + markdown); }
    catch(err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  return <div className="min-w-0 space-y-2"><div className="flex flex-wrap items-center justify-between gap-2"><label htmlFor={id} className="text-sm font-medium">{label}</label><div className="flex items-center gap-2"><label className="btn-secondary cursor-pointer text-xs"><ImagePlus className="h-4 w-4" />{busy ? "上传中…" : "插入图片"}<input aria-label={`${label}上传图片`} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>{void upload(e.target.files?.[0]); e.target.value="";}} /></label><button type="button" className="btn-secondary text-xs" aria-pressed={preview} onClick={()=>setPreview(!preview)}>{preview ? "继续编辑" : "预览"}</button></div></div>{preview ? <div className="min-h-28 rounded-xl border border-line bg-surface/40 p-4"><RichContent content={value || "暂无内容，先写一点吧。"} /></div> : <textarea ref={textarea} id={id} className="focus-ring w-full rounded-xl border border-line px-3 py-2 text-sm leading-7" rows={rows} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} /> }<p className="text-xs leading-5 text-muted">PNG / JPEG / WebP，最大 5 MiB。单边最大 8192 像素，总像素最多 1600 万。上传后插入本地资源 Markdown 路径；图片仅在保存题目后关联。外部图片不会加载。</p>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}</div>;
}
