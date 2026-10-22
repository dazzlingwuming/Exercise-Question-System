import type { ReactNode } from "react";

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "bad" | "accent" }) {
  const tones = {
    neutral: "border-line bg-panel-2 text-muted",
    good: "border-good-border bg-good-soft text-good",
    bad: "border-bad-border bg-bad-soft text-bad",
    accent: "border-accent-border bg-accent-soft text-accent",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-5 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
