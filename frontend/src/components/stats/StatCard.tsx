import type { ReactNode } from "react";

export function StatCard({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <div className="panel p-4 sm:p-5">
      <div className="flex items-center justify-between text-sm text-muted">
        {label}
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight">{value}</div>
    </div>
  );
}
