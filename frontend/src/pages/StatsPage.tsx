import { useEffect, useState } from "react";
import { getStatsSummary } from "../api/stats";
import { AccuracyChart } from "../components/stats/AccuracyChart";
import { TypeDistributionChart } from "../components/stats/TypeDistributionChart";
import type { StatsSummary } from "../types/stats";

export function StatsPage() {
  const [stats, setStats] = useState<StatsSummary | null>(null);
  useEffect(() => {
    getStatsSummary().then(setStats);
  }, []);
  if (!stats) return null;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">统计</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel rounded-lg p-5">
          <h2 className="font-semibold">题型数量</h2>
          <TypeDistributionChart data={stats.type_distribution} />
        </section>
        <section className="panel rounded-lg p-5">
          <h2 className="font-semibold">难度数量</h2>
          <AccuracyChart data={stats.difficulty_distribution} />
        </section>
      </div>
      <section className="panel rounded-lg p-5">
        <h2 className="mb-3 font-semibold">高频错误考察点</h2>
        <div className="space-y-2 text-sm">
          {stats.frequent_error_points.length === 0
            ? "暂无错题数据"
            : stats.frequent_error_points.map((item) => (
                <div className="flex justify-between rounded-md bg-surface p-2" key={item.point}>
                  <span>{item.point}</span>
                  <span>{item.count}</span>
                </div>
              ))}
        </div>
      </section>
    </div>
  );
}
