import { useEffect, useRef, useState } from "react";
import { Dialog } from "../common/Dialog";
import { managedImageUrl, uploadImage, type ManagedImage } from "../../api/media";

type Area = { x: number; y: number; width: number; height: number };
export function ImageCropDialog({ asset, maxBytes = 5 * 1024 * 1024, onClose, onSave, onBusyChange }: {
  asset: ManagedImage; maxBytes?: number; onClose: () => void; onSave: (image: ManagedImage) => void; onBusyChange: (busy: boolean) => void;
}) {
  const image = useRef<HTMLImageElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const lock = useRef(false);
  const [area, setArea] = useState<Area>({ x: 0, y: 0, width: 100, height: 100 });
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    // Thumbnails may already be cached without CORS headers. Fetch fresh bytes
    // and use a local object URL so drawing on canvas remains origin-clean.
    fetch(managedImageUrl(asset.url), { cache: "reload", signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error("原图加载失败，请关闭后重试。"); return response.blob(); })
      .then(blob => { if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(blob); setSourceUrl(objectUrl); } })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [asset.url]);
  function point(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)), y: Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100)) };
  }
  function change(key: keyof Area, value: number) {
    setArea(current => {
      const next = { ...current, [key]: value };
      next.width = Math.max(1, Math.min(next.width, 100 - next.x));
      next.height = Math.max(1, Math.min(next.height, 100 - next.y));
      return next;
    });
  }
  async function save() {
    if (!image.current || !loaded || lock.current) return;
    lock.current = true; setBusy(true); onBusyChange(true); setError("");
    try {
      const source = image.current;
      const x = Math.round(area.x / 100 * source.naturalWidth);
      const y = Math.round(area.y / 100 * source.naturalHeight);
      const width = Math.max(1, Math.min(source.naturalWidth - x, Math.round(area.width / 100 * source.naturalWidth)));
      const height = Math.max(1, Math.min(source.naturalHeight - y, Math.round(area.height / 100 * source.naturalHeight)));
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("当前浏览器不支持裁剪图片。");
      context.drawImage(source, x, y, width, height, 0, 0, width, height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("裁剪失败，请重试。")), "image/png"));
      if (blob.size > maxBytes) throw new Error("裁剪后超过图片大小限制，请缩小保留区域，或移除其他附件后重试。");
      const cropped = await uploadImage(new File([blob], "学习图片-裁剪.png", { type: "image/png" }));
      onSave(cropped);
    } catch (err) { setError((err as Error).message); }
    finally { lock.current = false; setBusy(false); onBusyChange(false); }
  }
  return <Dialog open title="裁剪图片" className="max-w-2xl" busy={busy} onClose={onClose}>
    <p className="mb-4 text-sm leading-6 text-muted">拖动框选要保留的区域，或用下方滑块调整。可去掉答案、姓名和无关内容。</p>
    <div className="crop-stage" onPointerDown={event => { if (busy || !loaded) return; event.preventDefault(); start.current = point(event); event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={event => { if (!start.current) return; const end = point(event); const origin = start.current; setArea({ x: Math.min(99, origin.x, end.x), y: Math.min(99, origin.y, end.y), width: Math.max(1, Math.abs(end.x - origin.x)), height: Math.max(1, Math.abs(end.y - origin.y)) }); }}
      onPointerUp={() => { start.current = null; }} onPointerCancel={() => { start.current = null; }}>
      {sourceUrl ? <img ref={image} src={sourceUrl} alt="待裁剪原图" draggable={false} onLoad={() => setLoaded(true)} onError={() => setError("原图加载失败，请关闭后重试。")} /> : <p className="p-6 text-sm text-muted" role="status">正在载入原图…</p>}
      {loaded && <div className="crop-selection" style={{ left: `${area.x}%`, top: `${area.y}%`, width: `${area.width}%`, height: `${area.height}%` }} />}
    </div>
    <fieldset disabled={busy} className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3"><legend className="sr-only">裁剪区域百分比</legend>
      {([["x", "左边距", 0, 99], ["y", "上边距", 0, 99], ["width", "保留宽度", 1, 100 - area.x], ["height", "保留高度", 1, 100 - area.y]] as const).map(([key, label, min, max]) => <label key={key} className="text-xs text-muted">{label} {Math.round(area[key])}%<input className="mt-2 block min-h-8 w-full accent-accent" type="range" min={min} max={max} value={area[key]} onChange={event => change(key, Number(event.target.value))} /></label>)}
    </fieldset>
    {error && <p role="alert" className="mt-3 text-sm text-bad">{error}</p>}
    <div className="mt-5 flex flex-wrap justify-end gap-2"><button className="btn-ghost" disabled={busy} onClick={() => setArea({ x: 0, y: 0, width: 100, height: 100 })}>重置选区</button><button className="btn-secondary" disabled={busy} onClick={onClose}>取消</button><button className="btn-primary" disabled={busy || !loaded} onClick={() => void save()}>{busy ? "保存中…" : "使用裁剪图片"}</button></div>
  </Dialog>;
}
