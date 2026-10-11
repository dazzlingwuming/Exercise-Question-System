import { Menu, Sparkles } from "lucide-react";
import { useState } from "react";
import { MobileNavigation } from "./Sidebar";
export function Topbar() {
  const [open, setOpen] = useState(false);
  return <><header className="sticky top-0 z-30 border-b border-line/70 bg-surface/95 px-4 py-3 backdrop-blur md:px-8"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><button className="btn-secondary md:hidden" aria-label="打开导航" aria-expanded={open} onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button><span className="text-sm font-semibold">我的学习空间</span></div><div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs text-muted"><Sparkles className="h-4 w-4 text-amber-500" /><span>一点积累，一点成长</span></div></div></header><MobileNavigation open={open} onClose={() => setOpen(false)} /></>;
}
