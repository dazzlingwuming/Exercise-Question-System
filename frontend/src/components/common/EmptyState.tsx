import { BookOpen } from "lucide-react";
import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";

export function EmptyState({ text, action }: { text: string; action?: ReactNode }) {
  const { theme } = useTheme();
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-panel-2/70 px-6 py-10 text-center">
      {theme === "whale" ? (
        <span className="mb-3 grid h-16 w-16 place-items-center overflow-hidden rounded-full border-2 border-panel bg-accent-soft shadow-soft ring-2 ring-accent-border">
          <img src="/mascot/xiaojing-avatar.png" alt="" className="h-full w-full object-cover" />
        </span>
      ) : (
        <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-accent-border/60 bg-accent-soft text-accent">
          <BookOpen className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
      <p className="max-w-sm text-sm leading-6 text-muted">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
