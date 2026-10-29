import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { managedImageUrl, uploadImage, type ManagedImage } from "../../api/media";
import { ImageCropDialog } from "./ImageCropDialog";

/** Shared by question extraction and chat: paste, drop or choose managed images. */
export function ImageAttachments({ images, onChange, disabled = false, onBusyChange, children }: {
  images: ManagedImage[];
  onChange: (images: ManagedImage[]) => void;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  children?: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const active = useRef(true);
  const busyCallback = useRef(onBusyChange);
  busyCallback.current = onBusyChange;
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; if (busyRef.current) busyCallback.current?.(false); };
  }, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [cropping, setCropping] = useState<ManagedImage | null>(null);

  async function add(files: File[]) {
    if (disabled || busyRef.current || !files.length) return;
    setError("");
    if (images.length + files.length > 6) { setError("一次最多附 6 张图片。"); return; }
    if (files.some(file => !["image/png", "image/jpeg", "image/webp"].includes(file.type))) {
      setError("请选择 PNG、JPEG 或 WebP 图片。"); return;
    }
    if (files.some(file => file.size > 5 * 1024 * 1024)) { setError("单张图片不能超过 5 MiB。"); return; }
    if (images.reduce((sum, file) => sum + file.size_bytes, 0) + files.reduce((sum, file) => sum + file.size, 0) > 20 * 1024 * 1024) {
      setError("图片合计不能超过 20 MiB。"); return;
    }
    busyRef.current = true; setBusy(true); onBusyChange?.(true);
    const uploaded = [...images];
    try {
      for (const file of files) {
        uploaded.push(await uploadImage(file));
        if (!active.current) return;
        onChange([...uploaded]);
      }
    } catch (err) { if (active.current) setError((err as Error).message); }
    finally { busyRef.current = false; if (active.current) { setBusy(false); busyCallback.current?.(false); } }
  }

  return <div className={`image-composer ${dragging ? "is-dragging" : ""}`}
    onDragOver={event => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); setDragging(true); } }}
    onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
    onDrop={event => { event.preventDefault(); setDragging(false); void add(Array.from(event.dataTransfer.files)); }}
    onPaste={event => {
      const files = Array.from(event.clipboardData.files);
      if (files.length) { event.preventDefault(); void add(files); }
    }}>
    {children}
    {images.length > 0 && <div className="attachment-strip">
      {images.map((asset, index) => <figure key={asset.id} className="attachment-thumb">
        <a href={managedImageUrl(asset.url)} target="_blank" rel="noopener noreferrer" aria-label={`查看附图 ${index + 1}`}>
          <img src={managedImageUrl(asset.url)} alt={`附图 ${index + 1}`} width={80} height={64} />
        </a>
        <button type="button" aria-label={`移除附图 ${index + 1}`} disabled={disabled || busy}
          onClick={() => onChange(images.filter(item => item.id !== asset.id))}><X size={14} /></button>
        <figcaption>图 {index + 1}<button type="button" className="attachment-crop" disabled={disabled || busy} aria-label={`裁剪附图 ${index + 1}`} onClick={() => setCropping(asset)}>裁剪</button></figcaption>
      </figure>)}
    </div>}
    <div className="attachment-toolbar">
      <button type="button" className="btn-ghost btn-sm" onClick={() => input.current?.click()} disabled={disabled || busy || images.length >= 6}>
        {busy ? <LoaderCircle size={16} className="animate-spin" /> : <ImagePlus size={16} />}
        {busy ? "正在上传…" : "添加图片"}
      </button>
      <span className="text-xs text-muted">粘贴截图或拖入图片 · 最多 6 张</span>
      <input ref={input} className="sr-only" tabIndex={-1} type="file" accept="image/png,image/jpeg,image/webp" multiple
        aria-label="添加图片附件" disabled={disabled || busy} onChange={event => { void add(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
    </div>
    {error && <p role="alert" className="px-3 pb-3 text-sm text-bad">{error}</p>}
    {cropping && <ImageCropDialog key={cropping.id} asset={cropping} onClose={() => setCropping(null)}
      maxBytes={Math.min(5 * 1024 * 1024, 20 * 1024 * 1024 - images.filter(item => item.id !== cropping.id).reduce((sum, item) => sum + item.size_bytes, 0))}
      onBusyChange={value => { busyRef.current = value; setBusy(value); busyCallback.current?.(value); }}
      onSave={asset => { onChange(images.map(item => item.id === cropping.id ? asset : item)); setCropping(null); }} />}
  </div>;
}
