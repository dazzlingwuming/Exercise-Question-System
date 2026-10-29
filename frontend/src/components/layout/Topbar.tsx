import { ChevronRight, Menu, Plus, Search } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { ThemeSwitcher } from "./ThemeSwitcher";

const ROUTE_TITLES: Array<[RegExp, string]> = [
  [/^\/$/, "学习概览"],
  [/^\/studio/, "AI 工作台"],
  [/^\/settings/, "模型连接"],
  [/^\/practice/, "开始练习"],
  [/^\/questions\/new/, "新增题目"],
  [/^\/questions\/deleted/, "回收站"],
  [/^\/questions\/[^/]+\/edit/, "编辑题目"],
  [/^\/questions\/[^/]+\/revisions/, "修改历史"],
  [/^\/questions\/[^/]+/, "题目详情"],
  [/^\/questions/, "我的题库"],
  [/^\/review/, "错题复习"],
  [/^\/stats/, "学习统计"],
  [/^\/import/, "题库导入"],
  [/^\/ai\//, "AI 生成题目"],
];

function usePageTitle() {
  const { pathname } = useLocation();
  return ROUTE_TITLES.find(([pattern]) => pattern.test(pathname))?.[1] ?? "学习空间";
}

export function Topbar({ onOpenPalette, onOpenMenu }: { onOpenPalette: () => void; onOpenMenu: () => void }) {
  const title = usePageTitle();

  return (
    <header className="workspace-topbar sticky top-0 z-30 border-b border-line bg-panel">
      <div className="mx-auto flex h-16 w-full items-center justify-between gap-3 px-4 md:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <button className="icon-btn lg:hidden" aria-label="打开导航" onClick={onOpenMenu}><Menu size={19} /></button>
          <span className="hidden text-xs font-medium tracking-wide text-muted sm:inline">工作台</span>
          <ChevronRight className="hidden h-3 w-3 text-muted/70 sm:inline" aria-hidden="true" />
          <span className="truncate text-[13px] font-semibold tracking-tight text-ink">{title}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenPalette}
            className="group flex h-9 items-center gap-2 rounded-full border border-line bg-panel/70 px-3 text-xs text-muted transition hover:border-accent/40 hover:text-accent"
            aria-label="打开命令面板"
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">搜索</span>
            <kbd className="hidden rounded border border-line bg-panel-2 px-1.5 py-0.5 text-[11px] text-muted group-hover:border-accent/30 sm:block">
              Ctrl K
            </kbd>
          </button>
          <span className="hidden sm:inline-flex"><Link to="/questions/new" className="btn-secondary btn-sm"><Plus size={15} />新增题目</Link></span>
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
