import { BookOpen, CheckCircle2, History, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStatsSummary } from "../api/stats";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { StatCard } from "../components/stats/StatCard";
import { TypeDistributionChart } from "../components/stats/TypeDistributionChart";
import type { StatsSummary } from "../types/stats";

export function DashboardPage() {
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getStatsSummary().then(setStats).catch((err) => setError(err.message));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!stats) return <LoadingState />;

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">练习概览</h1>
          <p className="mt-2 text-sm text-muted">题库导入后，可以从这里快速进入刷题和复盘。</p>
        </div>
        <div className="flex gap-2">
          <Link className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white" to="/practice">
            开始刷题
          </Link>
          <Link className="rounded-md border border-line bg-white px-4 py-2 text-sm font-medium" to="/import">
            导入题库
          </Link>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="总题数" value={stats.total_questions} icon={<BookOpen className="h-4 w-4" />} />
        <StatCard label="已答题数" value={stats.answered_count} icon={<Target className="h-4 w-4" />} />
        <StatCard label="正确率" value={stats.accuracy === null ? "-" : `${stats.accuracy}%`} icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard label="错题数" value={stats.wrong_count} icon={<History className="h-4 w-4" />} />
      </section>
      <section className="panel rounded-lg p-4">
        <h2 className="mb-3 font-semibold">快捷练习</h2>
        <div className="flex flex-wrap gap-2">
          <Link className="rounded-md border border-line bg-white px-3 py-2 text-sm" to="/practice?mode=sequential">按导入顺序继续刷题</Link>
          <Link className="rounded-md border border-line bg-white px-3 py-2 text-sm" to="/practice?mode=wrong">错题专项练习</Link>
          <Link className="rounded-md border border-line bg-white px-3 py-2 text-sm" to="/practice?mode=direction">按方向专项练习</Link>
          <Link className="rounded-md border border-line bg-white px-3 py-2 text-sm" to="/practice?mode=unanswered">未答题练习</Link>
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="panel rounded-lg p-5">
          <h2 className="mb-2 font-semibold">题型分布</h2>
          <TypeDistributionChart data={stats.type_distribution} />
        </div>
        <div className="panel rounded-lg p-5">
          <h2 className="mb-4 font-semibold">最近练习</h2>
          <div className="space-y-2 text-sm">
            {stats.recent_attempts.length === 0 ? "暂无答题记录" : stats.recent_attempts.map((item) => <div className="rounded-md bg-surface p-2" key={String(item.id)}>{String(item.question_id)} · {String(item.is_correct)}</div>)}
          </div>
        </div>
      </section>
    </div>
  );
}
