import { BarChart3, BookOpen, CheckCircle2, Flame, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStatsSummary } from "../api/stats";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { AccuracyChart } from "../components/stats/AccuracyChart";
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
  const accuracy = stats.accuracy ?? 0;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <p className="eyebrow eyebrow-dot">Learning insights</p>
          <h1 className="hero-display mt-3 text-[clamp(1.9rem,3vw,2.6rem)]">你的学习报告</h1>
        </div>
        <p className="max-w-sm text-xs leading-6 text-muted">
          数据不会说谎：先看正确率，再看错题集中在哪里，最后决定下一次练什么。
        </p>
      </header>

      <div className="bento stagger">
        {/* 正确率主卡 */}
        <section className="bento-card bento-hero grid-lines col-span-12 flex flex-col justify-between gap-6 p-6 sm:flex-row sm:items-center xl:col-span-7">
          <div className="relative z-10">
            <p className="eyebrow">Accuracy</p>
            <div className="mt-3 flex items-end gap-2">
              <span className="hero-display text-[3.6rem] leading-none">{accuracy}</span>
              <span className="mb-1 text-xl font-bold text-muted">%</span>
            </div>
            <p className="mt-3 max-w-[15rem] text-xs leading-6 text-muted">
              最近一次统计的作答正确率。低于 60% 时，建议先复盘错题再开新题。
            </p>
            <Link className="btn-secondary btn-sm mt-4" to="/review">
              去复盘错题
            </Link>
            <div className="mt-6 flex flex-wrap gap-6 border-t border-accent-border/50 pt-4 text-[11px] text-muted">
              <span>已作答 <b className="text-sm text-ink">{stats.answered_count}</b> 题</span>
              <span>错题 <b className="text-sm text-ink">{stats.wrong_count}</b> 道</span>
              <span>待覆盖 <b className="text-sm text-ink">{Math.max(0, stats.total_questions - stats.answered_count)}</b> 题</span>
            </div>
          </div>
          <div className="relative z-10 shrink-0 self-center">
            <Ring value={accuracy} />
          </div>
        </section>

        {/* 三个数字 */}
        <div className="col-span-12 flex flex-col gap-3 xl:col-span-5">
        <section className="bento-card dot-grid flex-1 p-5">
          <div className="relative z-10 flex items-center justify-between text-[11px] text-muted">
            题库总量
            <BookOpen className="h-4 w-4 text-accent/80" aria-hidden="true" />
          </div>
          <div className="figure-xl relative z-10 mt-3">{stats.total_questions}</div>
          <p className="relative z-10 mt-1 text-[11px] text-muted">道题在库里</p>
        </section>
        <section className="bento-card dot-grid flex-1 p-5">
          <div className="relative z-10 flex items-center justify-between text-[11px] text-muted">
            已练习
            <Target className="h-4 w-4 text-accent/80" aria-hidden="true" />
          </div>
          <div className="figure-xl relative z-10 mt-3">{stats.answered_count}</div>
          <p className="relative z-10 mt-1 text-[11px] text-muted">
            覆盖 {stats.total_questions ? Math.round((stats.answered_count / stats.total_questions) * 100) : 0}%
          </p>
        </section>
        <section className="bento-card dot-grid flex-1 p-5">
          <div className="relative z-10 flex items-center justify-between text-[11px] text-muted">
            待复习
            <Flame className="h-4 w-4 text-accent/80" aria-hidden="true" />
          </div>
          <div className="figure-xl relative z-10 mt-3">{stats.wrong_count}</div>
          <p className="relative z-10 mt-1 text-[11px] text-muted">道错题等你</p>
        </section>
        </div>

        {/* 图表 */}
        <section className="bento-card col-span-12 p-5 sm:p-6 lg:col-span-6">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="eyebrow">Distribution</p>
              <h2 className="mt-1.5 text-base font-bold tracking-tight">题型分布</h2>
            </div>
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted">Type</span>
          </div>
          <TypeDistributionChart data={stats.type_distribution} />
        </section>

        <section className="bento-card col-span-12 p-5 sm:p-6 lg:col-span-6">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="eyebrow">Difficulty</p>
              <h2 className="mt-1.5 text-base font-bold tracking-tight">难度分布</h2>
              <p className="mt-0.5 text-[11px] text-muted">横轴 1 最易 → 5 最难</p>
            </div>
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted">Level</span>
          </div>
          <AccuracyChart data={stats.difficulty_distribution} />
        </section>

        {/* 高频错误 */}
        <section className="bento-card col-span-12 p-5 sm:p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <div>
              <p className="eyebrow">Weak spots</p>
              <h2 className="mt-1.5 text-base font-bold tracking-tight">高频错误考察点</h2>
            </div>
            <Link className="text-[11px] font-medium text-accent hover:underline" to="/review">
              去复习 →
            </Link>
          </div>
          {stats.frequent_error_points.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line bg-panel-2/60 p-6 text-center text-sm text-muted">
              暂无错题数据，继续保持。
            </p>
          ) : (
            <ul className="grid gap-x-8 gap-y-4 md:grid-cols-2">
              {stats.frequent_error_points.map((item, index) => (
                <li key={item.point} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="w-5 shrink-0 text-[11px] font-bold tabular-nums text-muted/70">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="truncate text-ink">{item.point}</span>
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold tabular-nums text-bad">错 {item.count} 次</span>
                  </div>
                  <div className="progress-track ml-7">
                    <div className="progress-fill" style={{ width: `${Math.round((item.count / maxErrorCount) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 行动 */}
        <section className="bento-card col-span-12 flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-3">
            <span className="stat-icon">
              <BarChart3 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-bold tracking-tight">下一步练什么？</h2>
              <p className="mt-0.5 text-xs text-muted">让错题决定顺序，比随机刷更有效。</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="btn-primary" to="/practice?mode=wrong">
              练错题
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link className="btn-secondary" to="/practice">
              继续新题
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function Ring({ value }: { value: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="relative grid h-32 w-32 place-items-center">
      <svg viewBox="0 0 104 104" className="h-full w-full -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id="stats-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgb(var(--c-accent))" />
            <stop offset="100%" stopColor="rgb(var(--c-accent-2))" />
          </linearGradient>
        </defs>
        <circle cx="52" cy="52" r={radius} fill="none" stroke="rgb(var(--c-accent) / 0.12)" strokeWidth="8" />
        <circle
          cx="52"
          cy="52"
          r={radius}
          fill="none"
          stroke="url(#stats-ring)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
        />
      </svg>
      <span className="absolute text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/80">acc</span>
    </div>
  );
}
