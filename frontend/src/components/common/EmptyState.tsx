import { BookOpen } from "lucide-react";
import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";

export function EmptyState({
  text,
  title = "这里还空着",
  action,
}: {
  text: string;
  title?: string;
  action?: ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <div className="rounded-2xl border border-dashed border-line bg-panel-2/50 px-6 py-8">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        {theme === "whale" ? (
          <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-panel bg-accent-soft shadow-soft ring-2 ring-accent-border">
            <img src="/mascot/xiaojing-avatar.png" alt="" className="h-full w-full object-cover" />
          </span>
        ) : (
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-accent-border/60 bg-accent-soft text-accent">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 max-w-prose text-xs leading-6 text-muted">{text}</p>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  );
}
