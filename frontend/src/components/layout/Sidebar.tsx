import {
  BarChart3,
  BookOpen,
  FilePlus2,
  History,
  Import,
  LayoutDashboard,
  PenLine,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import type { CSSProperties } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { Dialog } from "../common/Dialog";
import { BrandMark } from "./BrandMark";

export const navItems = [
  { to: "/", label: "学习首页", icon: LayoutDashboard, group: "学习" },
  { to: "/practice", label: "开始练习", icon: PenLine, group: "学习" },
  { to: "/questions", label: "我的题库", icon: BookOpen, group: "学习" },
  { to: "/review", label: "错题复习", icon: History, group: "学习" },
  { to: "/stats", label: "学习统计", icon: BarChart3, group: "学习" },
  { to: "/import", label: "导入题库", icon: Import, group: "管理" },
  { to: "/questions/new", label: "新增题目", icon: FilePlus2, group: "管理" },
  { to: "/questions/deleted", label: "回收站", icon: Trash2, group: "管理" },
];

const GROUPS = ["学习", "管理"] as const;

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="主导航" className="space-y-0.5">
      {GROUPS.map((group) => (
        <div key={group}>
          <p className="nav-group-label">{group}</p>
          <div className="space-y-1">
            {navItems
              .filter((item) => item.group === group)
              .map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/" || item.to === "/questions"}
                  onClick={onNavigate}
                  className={({ isActive }) => `nav-link ${isActive ? "is-active" : ""}`}
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar() {
  const { meta } = useTheme();
  return (
    <aside
      className="sticky top-0 hidden h-screen w-[272px] shrink-0 flex-col overflow-hidden border-r px-4 py-6 md:flex"
      style={{
        background: "rgb(var(--c-sidebar))",
        borderColor: "rgb(var(--c-sidebar-line))",
        color: "rgb(var(--c-sidebar-ink))",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full opacity-70 blur-3xl"
        style={{ background: "radial-gradient(circle, rgb(var(--c-accent) / 0.4), transparent 68%)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -right-16 h-64 w-64 rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, rgb(var(--c-accent-2) / 0.35), transparent 70%)" }}
      />

      <div className="relative mb-6 flex items-center gap-3 px-1">
        <BrandMark size={44} />
        <div className="min-w-0">
          <div className="truncate text-[0.95rem] font-bold tracking-tight">Agent 题库</div>
          <div className="mt-0.5 flex items-center gap-1 text-[11px]" style={{ color: "rgb(var(--c-sidebar-muted))" }}>
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            每天进步一点点
          </div>
        </div>
      </div>

      <div className="relative flex-1 overflow-y-auto pr-0.5">
        <Navigation />
      </div>

      <div
        className="relative mt-4 overflow-hidden rounded-2xl border p-4"
        style={{
          borderColor: "rgb(var(--c-sidebar-line))",
          background: "linear-gradient(160deg, rgb(var(--c-accent) / 0.18), rgb(var(--c-accent-2) / 0.08))",
        }}
      >
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em]" style={{ color: "rgb(var(--c-sidebar-muted))" }}>
          Today
        </p>
        <p className="mt-1.5 text-[0.82rem] leading-6">把今天的练习，变成明天的底气。</p>
        <div className="mt-3 flex items-center justify-between text-[10px]" style={{ color: "rgb(var(--c-sidebar-muted))" }}>
          <span>当前主题</span>
          <span className="font-medium">{meta.name}</span>
        </div>
      </div>
    </aside>
  );
}

export function MobileNavigation({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} title="学习导航" onClose={onClose}>
      <button className="btn-secondary mb-3" onClick={onClose} aria-label="关闭导航">
        <X className="h-4 w-4" aria-hidden="true" />
        关闭
      </button>
      <div
        className="-mx-1 rounded-2xl border border-line bg-panel-2 p-3"
        style={
          {
            "--c-sidebar-ink": "rgb(var(--c-ink))",
            "--c-sidebar-muted": "rgb(var(--c-muted))",
          } as CSSProperties
        }
      >
        <Navigation onNavigate={onClose} />
      </div>
    </Dialog>
  );
}
