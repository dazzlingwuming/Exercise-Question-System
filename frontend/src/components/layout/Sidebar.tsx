import { BarChart3, BookOpen, FilePlus2, History, Import, LayoutDashboard, PenLine, Sparkles, Trash2, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Dialog } from "../common/Dialog";
export const navItems = [
  { to: "/", label: "学习首页", icon: LayoutDashboard }, { to: "/practice", label: "开始练习", icon: PenLine },
  { to: "/questions", label: "我的题库", icon: BookOpen }, { to: "/review", label: "错题复习", icon: History },
  { to: "/stats", label: "学习统计", icon: BarChart3 }, { to: "/import", label: "导入题库", icon: Import },
  { to: "/questions/new", label: "新增题目", icon: FilePlus2 }, { to: "/questions/deleted", label: "回收站", icon: Trash2 },
];
function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  return <nav aria-label="主导航" className="space-y-1.5">{navItems.map((item) => <NavLink key={item.to} to={item.to} end={item.to === "/" || item.to === "/questions"} onClick={onNavigate} className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? "bg-accent text-white shadow-sm" : "text-muted hover:bg-blue-50 hover:text-accent"}`}><item.icon className="h-[18px] w-[18px]" />{item.label}</NavLink>)}</nav>;
}
export function Sidebar() {
  return <aside className="sticky top-0 hidden h-screen w-56 shrink-0 border-r border-line bg-white/90 px-4 py-7 md:flex md:flex-col"><div className="mb-9 flex items-center gap-3 px-2"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-white"><Sparkles className="h-5 w-5" /></div><div><div className="font-bold tracking-tight">Agent 题库</div><div className="mt-1 text-[11px] text-muted">每天进步一点点</div></div></div><Navigation /><div className="mt-auto rounded-2xl bg-amber-50 p-4 text-xs leading-6 text-amber-800">把今天的练习，变成明天的底气。</div></aside>;
}
export function MobileNavigation({ open, onClose }: { open: boolean; onClose: () => void }) { return <Dialog open={open} title="学习导航" onClose={onClose}><button className="btn-secondary mb-3" onClick={onClose} aria-label="关闭导航"><X className="h-4 w-4" />关闭</button><Navigation onNavigate={onClose} /></Dialog>; }
