import { useTheme } from "../../theme/ThemeProvider";

export function LoadingState({ text = "正在准备学习内容…" }: { text?: string }) {
  const { theme } = useTheme();
  return (
    <div className="panel flex items-center gap-4 p-5 text-sm text-muted" role="status" aria-live="polite">
      {theme === "whale" ? (
        <img
          src="/mascot/xiaojing-avatar.png"
          alt=""
          aria-hidden="true"
          className="h-10 w-10 shrink-0 animate-float rounded-full border border-line bg-panel object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-accent-border border-t-accent"
        />
      )}
      <span className="min-w-0 flex-1">{text}</span>
      <span aria-hidden="true" className="skeleton hidden h-1.5 w-24 rounded-full sm:block" />
    </div>
  );
}
