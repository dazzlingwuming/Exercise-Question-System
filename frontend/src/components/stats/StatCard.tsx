import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: string;
}) {
  return (
    <div className="panel panel-hover group relative overflow-hidden p-4 sm:p-5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-accent/10 blur-2xl transition-opacity duration-300 group-hover:opacity-80"
      />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-medium tracking-wide text-muted">{label}</div>
          <div className="stat-value mt-2 text-[1.9rem] font-extrabold leading-none tracking-tight text-ink sm:text-[2.1rem]">
            {value}
          </div>
          {hint && <p className="mt-1.5 text-xs leading-4 text-muted">{hint}</p>}
        </div>
        <span className="stat-icon shrink-0">{icon}</span>
      </div>
    </div>
  );
}
