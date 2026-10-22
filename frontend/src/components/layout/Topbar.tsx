import { Menu, Sparkles } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { MobileNavigation } from "./Sidebar";
import { ThemeSwitcher } from "./ThemeSwitcher";

const ROUTE_TITLES: Array<[RegExp, string]> = [
  [/^\/$/, "学习首页"],
  [/^\/practice/, "开始练习"],
  [/^\/questions\/new/, "新增题目"],
  [/^\/questions\/deleted/, "回收站"],
  [/^\/questions\/[^/]+\/edit/, "编辑题目"],
  [/^\/questions\/[^/]+\/revisions/, "修改历史"],
  [/^\/questions\/[^/]+/, "题目详情"],
  [/^\/questions/, "我的题库"],
  [/^\/review/, "错题复习"],
  [/^\/stats/, "学习统计"],
  [/^\/import/, "导入题库"],
  [/^\/ai\//, "AI 生成题目"],
];

function usePageTitle() {
  const { pathname } = useLocation();
  return ROUTE_TITLES.find(([pattern]) => pattern.test(pathname))?.[1] ?? "学习空间";
}

export function Topbar() {
  const [open, setOpen] = useState(false);
  const title = usePageTitle();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line/60 glass">
        <div className="mx-auto flex h-16 w-full max-w-[1680px] items-center justify-between gap-3 px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="icon-btn md:hidden"
              aria-label="打开导航"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">我的学习空间</p>
              <p className="truncate text-sm font-semibold tracking-tight">{title}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-line bg-panel/70 px-3 py-1.5 text-xs text-muted xl:flex">
              <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              一点积累，一点成长
            </span>
            <ThemeSwitcher />
          </div>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -bottom-px h-px"
          style={{ backgroundImage: "linear-gradient(90deg, transparent, rgb(var(--c-accent) / 0.35), transparent)" }}
        />
      </header>
      <MobileNavigation open={open} onClose={() => setOpen(false)} />
    </>
  );
}
