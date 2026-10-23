import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// 难度是递进关系，用同一主色的深浅表达强度，而不是五种互不相关的颜色。
const RAMP = [0.28, 0.44, 0.62, 0.8, 1];
const fillFor = (index: number) => `rgb(var(--c-accent-2) / ${RAMP[index % RAMP.length]})`;

export function AccuracyChart({ data }: { data: Record<string, number> }) {
  const rows = Object.entries(data).map(([name, value]) => ({ name, value }));

  if (!rows.length) {
    return <p className="py-10 text-center text-sm text-muted">还没有难度数据。</p>;
  }

  return (
    <div className="mt-4 h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 22, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 6" stroke="rgb(var(--c-line))" vertical={false} />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "rgb(var(--c-muted))", fontSize: 12 }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "rgb(var(--c-muted))", fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: "rgb(var(--c-accent) / 0.08)" }}
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
          <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={54}>
            {rows.map((_, index) => (
              <Cell key={index} fill={fillFor(index)} />
            ))}
            <LabelList dataKey="value" position="top" fill="rgb(var(--c-muted))" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
