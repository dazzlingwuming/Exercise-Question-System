import { BarChart3, BookOpen, FilePlus2, History, Import, LayoutDashboard, MessageSquare, PenLine, Settings2, Trash2 } from "lucide-react";
import { NavLink } from "react-router-dom";
import { BrandMark } from "./BrandMark";

export const navItems = [
  { to: "/", label: "学习概览", icon: LayoutDashboard },
  { to: "/studio", label: "AI 工作台", icon: MessageSquare },
  { to: "/practice", label: "开始练习", icon: PenLine },
  { to: "/questions", label: "我的题库", icon: BookOpen },
  { to: "/review", label: "错题复习", icon: History },
  { to: "/stats", label: "学习统计", icon: BarChart3 },
  { to: "/import", label: "导入题库", icon: Import },
  { to: "/questions/new", label: "新增题目", icon: FilePlus2 },
  { to: "/questions/deleted", label: "回收站", icon: Trash2 },
  { to: "/settings", label: "模型连接", icon: Settings2 },
];

export function Dock({ onNavigate }: { onNavigate?: () => void }) {
  return <aside className="workspace-sidebar">
    <NavLink to="/" className="workspace-brand" onClick={onNavigate}>
      <BrandMark size={36} /><span><strong>小鲸题库</strong><small>个人学习空间</small></span>
    </NavLink>
    <nav aria-label="主导航" className="workspace-nav">
      <p className="nav-section-label">学习</p>
      {navItems.map((item, index) => <div key={item.to}>
        {index === 6 && <p className="nav-section-label mt-7">管理</p>}
        <NavLink to={item.to} onClick={onNavigate} end={item.to === "/" || item.to === "/questions"}
          className={({ isActive }) => `workspace-nav-item ${isActive ? "is-active" : ""}`}>
          <item.icon size={18} strokeWidth={1.7} aria-hidden="true" /><span>{item.label}</span>
        </NavLink>
      </div>)}
    </nav>
    <div className="sidebar-note"><span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" /> 本地学习空间<p>题目、练习记录，持续积累。</p></div>
  </aside>;
}
