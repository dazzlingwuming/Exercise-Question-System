import { ChevronRight, Flame } from "lucide-react";
import { useLocation } from "react-router-dom";
import { BrandMark } from "./BrandMark";
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
  [/^\/import/, "题库导入"],
  [/^\/ai\//, "AI 生成题目"],
];

function usePageTitle() {
  const { pathname } = useLocation();
  return ROUTE_TITLES.find(([pattern]) => pattern.test(pathname))?.[1] ?? "学习空间";
}

export function Topbar() {
  const title = usePageTitle();

  return (
    <header className="sticky top-0 z-30 border-b border-line/50 bg-surface/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-[1560px] items-center justify-between gap-3 px-4 md:px-7">
        <div className="flex min-w-0 items-center gap-2">
          <span className="lg:hidden">
            <BrandMark size={28} />
          </span>
          <span className="hidden text-xs font-medium tracking-wide text-muted sm:inline">工作台</span>
          <ChevronRight className="hidden h-3 w-3 text-muted/70 sm:inline" aria-hidden="true" />
          <span className="truncate text-[13px] font-semibold tracking-tight text-ink">{title}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-line bg-panel/70 px-2.5 py-1 text-xs text-muted md:flex">
            <Flame className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            今天也保持手感
          </span>
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
