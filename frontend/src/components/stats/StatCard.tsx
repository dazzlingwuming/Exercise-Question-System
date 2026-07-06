import type { ReactNode } from "react";

export function StatCard({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <div className="panel rounded-lg p-4">
      <div className="flex items-center justify-between text-sm text-muted">
        {label}
        {icon}
      </div>
      <div className="mt-3 text-3xl font-semibold">{value}</div>
    </div>
  );
}
