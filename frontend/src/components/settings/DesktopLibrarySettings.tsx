import { Archive, FolderOpen, FolderInput, LoaderCircle, Monitor } from "lucide-react";
import { useEffect, useState } from "react";

export function DesktopLibrarySettings() {
  const bridge = window.xiaojingDesktop;
  const [version, setVersion] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { bridge?.version().then(setVersion).catch(() => undefined); }, [bridge]);
  if (!bridge) return null;
  async function run(action: "backup" | "import" | "open") {
    if (!bridge) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (action === "open") { const message = await bridge.openLibrary(); if (message) throw new Error(message); }
      else if (action === "backup") { const result = await bridge.backupLibrary(); if (!result.canceled) setNotice(`备份完成：${result.path}`); }
      else await bridge.importLibrary();
    } catch (err) { setError((err as Error).message.replace(/^Error invoking remote method '[^']+': Error: /, "")); }
    finally { setBusy(false); }
  }
  return <section className="connection-editor mt-6" aria-label="桌面资料库">
    <div className="section-heading"><h2 className="flex items-center gap-2"><Monitor size={18} />这台电脑上的学习空间</h2><span>桌面版 {version}</span></div>
    <p className="text-sm text-muted leading-7 mt-4">题目、练习记录、讨论和图片保存在本机，升级客户端后仍可使用。备份可迁移到另一台电脑，也可导入之前网页版的完整资料库。</p>
    <div className="connection-actions mt-4"><button className="btn-primary" disabled={busy} onClick={() => void run("backup")}>{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Archive size={16} />}备份资料库</button><button className="btn-secondary" disabled={busy} onClick={() => void run("import")}><FolderInput size={16} />导入已有资料库</button><button className="btn-ghost" disabled={busy} onClick={() => void run("open")}><FolderOpen size={16} />打开所在文件夹</button></div>
    <p className="text-xs text-muted leading-6 mt-3">备份包含已保存的学习内容和图片；模型密钥、未发送的草稿和界面偏好不包含在内。导入会切换资料库，请先结束当前生成并保存内容。</p>
    {notice && <p role="status" className="text-sm text-good mt-3 break-all">{notice}</p>}{error && <p role="alert" className="text-sm text-bad mt-3">{error}</p>}
  </section>;
}
