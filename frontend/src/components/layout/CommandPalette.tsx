import {
  BarChart3,
  BookOpen,
  FilePlus2,
  History,
  Import,
  LayoutDashboard,
  Palette,
  PenLine,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../theme/ThemeProvider";
import { THEMES, type ThemeId } from "../../theme/themes";

type Action = {
  id: string;
  label: string;
  group: string;
  keywords: string;
  icon: ComponentType<{ className?: string }>;
  to?: string;
  theme?: ThemeId;
};

const BASE_ACTIONS: Action[] = [
  { id: "practice", label: "开始练习", group: "去练习", keywords: "practice 刷题 随机", icon: PenLine, to: "/practice" },
  { id: "wrong", label: "练错题", group: "去练习", keywords: "wrong 错题", icon: History, to: "/practice?mode=wrong" },
  { id: "unanswered", label: "探索新题", group: "去练习", keywords: "new 未答", icon: RotateCcw, to: "/practice?mode=unanswered" },
  { id: "bank", label: "我的题库", group: "浏览", keywords: "questions 题库 集合", icon: BookOpen, to: "/questions" },
  { id: "review", label: "错题复习", group: "浏览", keywords: "review 复习", icon: RotateCcw, to: "/review" },
  { id: "stats", label: "学习统计", group: "浏览", keywords: "stats 报告 数据", icon: BarChart3, to: "/stats" },
  { id: "home", label: "学习首页", group: "浏览", keywords: "home dashboard 首页", icon: LayoutDashboard, to: "/" },
  { id: "import", label: "导入题库", group: "管理", keywords: "import markdown 导入", icon: Import, to: "/import" },
  { id: "new", label: "新增题目", group: "管理", keywords: "new 新建 题目", icon: FilePlus2, to: "/questions/new" },
  { id: "deleted", label: "回收站", group: "管理", keywords: "deleted 删除 回收", icon: Trash2, to: "/questions/deleted" },
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const actions = useMemo<Action[]>(
    () => [
      ...BASE_ACTIONS,
      ...THEMES.map((theme) => ({
        id: `theme-${theme.id}`,
        label: `切换到「${theme.name}」`,
        group: "切换主题",
        keywords: `${theme.en} ${theme.tagline} 主题 皮肤 theme`,
        icon: Palette,
        theme: theme.id,
      })),
    ],
    [],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((action) => `${action.label} ${action.keywords}`.toLowerCase().includes(q));
  }, [actions, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((index) => Math.min(results.length - 1, index + 1));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((index) => Math.max(0, index - 1));
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const action = results[active];
        if (!action) return;
        if (action.theme) setTheme(action.theme);
        if (action.to) navigate(action.to);
        onClose();
      }
      if (event.key === "Tab") {
        const nodes = [...(panelRef.current?.querySelectorAll<HTMLElement>("input, button, [href]") ?? [])].filter(
          (node) => !node.hasAttribute("disabled"),
        );
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, results, active, navigate, setTheme, onClose]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  let lastGroup = "";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-scrim/40 px-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="命令面板"
        className="w-full max-w-xl overflow-hidden rounded-3xl border border-line bg-panel shadow-lift rise-in"
      >
        <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
          <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索页面、动作或主题…"
            aria-label="搜索命令"
            style={{ boxShadow: "none" }}
            className="h-7 w-full border-0 bg-transparent px-0 text-sm outline-none"
          />
          <kbd className="hidden shrink-0 rounded-md border border-line bg-panel-2 px-1.5 py-0.5 text-[11px] text-muted sm:block">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
          {results.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted">没有匹配的命令</p>}
          {results.map((action, index) => {
            const showGroup = action.group !== lastGroup;
            lastGroup = action.group;
            const Icon = action.icon;
            return (
              <div key={action.id}>
                {showGroup && (
                  <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{action.group}</p>
                )}
                <button
                  type="button"
                  data-index={index}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => {
                    if (action.theme) setTheme(action.theme);
                    if (action.to) navigate(action.to);
                    onClose();
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                    index === active ? "bg-accent-soft text-accent" : "text-ink hover:bg-panel-2"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{action.label}</span>
                  {action.to && <span className="shrink-0 text-[11px] text-muted">{action.to}</span>}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-2.5 text-[11px] text-muted">
          <span>↑↓ 选择 · Enter 执行 · Esc 关闭</span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-line bg-panel-2 px-1 py-0.5">⌘</kbd>
            <kbd className="rounded border border-line bg-panel-2 px-1 py-0.5">K</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}
