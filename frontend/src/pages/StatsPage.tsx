import { BarChart3, BookOpen, CheckCircle2, Flame } from "lucide-react";
import { useEffect, useState } from "react";
import { getStatsSummary } from "../api/stats";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { PageHeader } from "../components/common/PageHeader";
import { AccuracyChart } from "../components/stats/AccuracyChart";
import { StatCard } from "../components/stats/StatCard";
import { TypeDistributionChart } from "../components/stats/TypeDistributionChart";
import type { StatsSummary } from "../types/stats";

export function StatsPage() {
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getStatsSummary()
      .then((value) => {
        if (active) setStats(value);
      })
      .catch((err) => {
        if (active) setError((err as Error).message);
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!stats) return <LoadingState text="正在汇总学习数据…" />;

  const maxErrorCount = Math.max(1, ...stats.frequent_error_points.map((item) => item.count));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="LEARNING INSIGHTS"
        title="学习统计"
        description="看清题型与难度的分布，找到最值得投入的复习方向。"
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="题库总量" value={stats.total_questions} icon={<BookOpen className="h-5 w-5" />} />
        <StatCard label="已练习" value={stats.answered_count} icon={<BarChart3 className="h-5 w-5" />} />
        <StatCard
          label="正确率"
          value={stats.accuracy === null ? "—" : `${stats.accuracy}%`}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <StatCard label="待复习错题" value={stats.wrong_count} icon={<Flame className="h-5 w-5" />} />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="panel p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-base font-bold tracking-tight">题型分布</h2>
            <span className="text-[11px] uppercase tracking-wider text-muted">Type</span>
          </div>
          <TypeDistributionChart data={stats.type_distribution} />
        </section>
        <section className="panel p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-base font-bold tracking-tight">难度分布</h2>
            <span className="text-[11px] uppercase tracking-wider text-muted">Difficulty</span>
          </div>
          <AccuracyChart data={stats.difficulty_distribution} />
        </section>
      </div>

      <section className="panel p-5 sm:p-6">
        <div className="mb-4 flex items-baseline justify-between gap-2">
          <h2 className="text-base font-bold tracking-tight">高频错误考察点</h2>
          <span className="text-[11px] uppercase tracking-wider text-muted">Weak spots</span>
        </div>
        {stats.frequent_error_points.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-panel-2/60 p-6 text-center text-sm text-muted">
            暂无错题数据，继续保持。
          </p>
        ) : (
          <ul className="space-y-3">
            {stats.frequent_error_points.map((item, index) => (
              <li key={item.point} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-5 shrink-0 text-[11px] font-bold tabular-nums text-muted">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate text-ink">{item.point}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-bad">错 {item.count} 次</span>
                </div>
                <div className="progress-track ml-7">
                  <div className="progress-fill" style={{ width: `${Math.round((item.count / maxErrorCount) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
