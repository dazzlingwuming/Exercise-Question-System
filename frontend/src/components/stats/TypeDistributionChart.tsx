import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = [1, 2, 3, 4, 5, 6].map((index) => `rgb(var(--chart-${index}))`);

export function TypeDistributionChart({ data }: { data: Record<string, number> }) {
  const rows = Object.entries(data).map(([name, value]) => ({ name, value }));
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  if (!rows.length) {
    return <p className="py-10 text-center text-sm text-muted">还没有题型数据。</p>;
  }

  return (
    <div className="mt-2">
      <div className="relative h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3} cornerRadius={6} stroke="none">
              {rows.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "rgb(var(--c-panel))",
                border: "1px solid rgb(var(--c-line))",
                borderRadius: 12,
                boxShadow: "var(--shadow-1)",
                fontSize: 12,
                color: "rgb(var(--c-ink))",
              }}
              itemStyle={{ color: "rgb(var(--c-ink))" }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="stat-value text-2xl font-extrabold tracking-tight">{total}</span>
          <span className="text-[11px] tracking-wide text-muted">题目总数</span>
        </div>
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
        {rows.map((row, index) => (
          <li key={row.name} className="flex min-w-0 items-center gap-2 text-xs text-muted">
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="truncate text-ink">{row.name}</span>
            <span className="ml-auto shrink-0 font-medium tabular-nums">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
