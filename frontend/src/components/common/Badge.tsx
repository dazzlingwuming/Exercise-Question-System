import type { ReactNode } from "react";

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "bad" | "accent" }) {
  const tones = {
    neutral: "border-line bg-white text-muted",
    good: "border-emerald-200 bg-emerald-50 text-emerald-700",
    bad: "border-red-200 bg-red-50 text-red-700",
    accent: "border-blue-200 bg-blue-50 text-accent",
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}
