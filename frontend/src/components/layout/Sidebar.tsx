import { BarChart3, BookOpen, FilePlus2, History, Import, LayoutDashboard, PenLine, Trash2 } from "lucide-react";
import { NavLink } from "react-router-dom";

const items = [
  { to: "/", label: "首页", icon: LayoutDashboard },
  { to: "/import", label: "题库导入", icon: Import },
  { to: "/questions", label: "题库", icon: BookOpen },
  { to: "/questions/new", label: "新增题目", icon: FilePlus2 },
  { to: "/questions/deleted", label: "回收站", icon: Trash2 },
  { to: "/practice", label: "刷题", icon: PenLine },
  { to: "/review", label: "错题", icon: History },
  { to: "/stats", label: "统计", icon: BarChart3 },
];

export function Sidebar() {
  return (
    <aside className="hidden h-screen w-64 shrink-0 border-r border-line bg-white px-4 py-5 md:block">
      <div className="mb-8">
        <div className="text-lg font-semibold tracking-tight">Agent 题库</div>
        <div className="mt-1 text-xs text-muted">本地刷题工作台</div>
      </div>
      <nav className="space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                isActive ? "bg-accent text-white" : "text-muted hover:bg-surface hover:text-ink"
              }`
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
