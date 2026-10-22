import { ArrowRight, ArrowUpRight, BookOpen, CheckCircle2, History, Sparkles, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStatsSummary } from "../api/stats";
import { Badge } from "../components/common/Badge";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { HeroScene } from "../components/layout/HeroScene";
import { MascotStage } from "../components/mascot/MascotStage";
import { StatCard } from "../components/stats/StatCard";
import { TypeDistributionChart } from "../components/stats/TypeDistributionChart";
import { useTheme } from "../theme/ThemeProvider";
import type { StatsSummary } from "../types/stats";

const PRACTICE_MODES = [
  { to: "sequential", title: "按顺序练习", note: "循序渐进，稳稳积累", icon: BookOpen },
  { to: "wrong", title: "攻克错题", note: "给薄弱处多一点关注", icon: History },
  { to: "direction", title: "专项练习", note: "专注一个方向的成长", icon: Target },
  { to: "unanswered", title: "探索新题", note: "今天再多懂一点", icon: Sparkles },
];

export function DashboardPage() {
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [error, setError] = useState("");
  const { theme, meta } = useTheme();

  useEffect(() => {
    let active = true;
    getStatsSummary()
      .then((value) => {
        if (active) setStats(value);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!stats) return <LoadingState />;

  const progress = stats.total_questions ? Math.round((stats.answered_count / stats.total_questions) * 100) : 0;

  return (
    <div className="space-y-6">
      <section className="hero-panel grain flex flex-col items-start gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:p-10">
        <div className="relative z-10 max-w-xl">
          <p className="page-eyebrow">LET&apos;S LEARN SOMETHING</p>
          <h1 className="display-title text-3xl sm:text-4xl lg:text-[2.9rem]">
            今天，也<span className="gradient-text">向前一步</span>。
          </h1>
          <p className="mt-3 max-w-md text-sm leading-7 text-muted">
            从一道题开始，让知识变成自己的能力。你的练习、复盘与每一点进步，都在这里被看见。
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link className="btn-primary" to="/practice">
              开始练习
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link className="btn-secondary" to="/questions">
              看看我的题库
            </Link>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <ProgressRing value={progress} />
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">学习覆盖</p>
              <p className="text-2xl font-extrabold tracking-tight stat-value">
                {progress}
                <span className="ml-0.5 text-base font-bold text-muted">%</span>
              </p>
              <p className="text-xs text-muted">
                已练习 {stats.answered_count} / {stats.total_questions} 道题
              </p>
            </div>
            <div className="hidden h-12 w-px bg-line sm:block" aria-hidden="true" />
            <div className="hidden sm:block">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">当前主题</p>
              <p className="mt-1 text-sm font-semibold">{meta.name}</p>
              <p className="mt-0.5 text-xs text-muted">{meta.tagline}</p>
            </div>
          </div>
        </div>

        <div className="relative z-0 w-full max-w-[16rem] self-center sm:max-w-[19rem] lg:self-auto">
          {theme === "whale" ? <MascotStage /> : <HeroScene className="mx-auto" />}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4 stagger">
        <StatCard label="题库总量" value={stats.total_questions} icon={<BookOpen className="h-5 w-5" />} />
        <StatCard label="已练习题目" value={stats.answered_count} icon={<Target className="h-5 w-5" />} />
        <StatCard
          label="作答正确率"
          value={stats.accuracy === null ? "—" : `${stats.accuracy}%`}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <StatCard label="待复习错题" value={stats.wrong_count} icon={<History className="h-5 w-5" />} />
      </section>

      <section className="panel p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold tracking-tight">选一种方式，进入状态</h2>
            <p className="mt-1 text-xs text-muted">四种入口，对应四种不同的学习节奏。</p>
          </div>
          <span className="chip">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            练习覆盖 {progress}%
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {PRACTICE_MODES.map(({ to, title, note, icon: Icon }) => (
            <Link
              key={to}
              to={`/practice?mode=${to}`}
              className="group relative overflow-hidden rounded-2xl border border-line bg-panel p-4 transition duration-200 hover:-translate-y-1 hover:border-accent/45 hover:shadow-lift"
            >
              <span className="stat-icon mb-3">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{title}</span>
                <ArrowUpRight className="h-4 w-4 -translate-x-1 text-accent opacity-0 transition duration-200 group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true" />
              </div>
              <p className="mt-1 text-xs leading-5 text-muted">{note}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.05fr_1fr]">
        <div className="panel p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight">我的知识版图</h2>
            <Link className="text-xs font-medium text-accent hover:underline" to="/stats">
              查看统计 →
            </Link>
          </div>
          {stats.total_questions ? (
            <TypeDistributionChart data={stats.type_distribution} />
          ) : (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="w-40">
                <HeroScene />
              </div>
              <p className="my-3 text-sm text-muted">先收集一些好题，开始你的学习旅程。</p>
              <Link className="btn-secondary btn-sm" to="/import">
                导入第一份题库
              </Link>
            </div>
          )}
        </div>

        <div className="panel p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight">最近的练习足迹</h2>
            <Link className="text-xs font-medium text-accent hover:underline" to="/review">
              去复习 →
            </Link>
          </div>
          {stats.recent_attempts.length ? (
            <div className="space-y-2">
              {stats.recent_attempts.map((item) => {
                const correct = item.is_correct === true;
                const wrong = item.is_correct === false;
                return (
                  <Link
                    key={String(item.id)}
                    to={`/questions/${String(item.question_id)}`}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-transparent bg-panel-2 px-3 py-2.5 text-sm transition hover:border-accent/35 hover:bg-accent-soft"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className={`h-2 w-2 shrink-0 rounded-full ${correct ? "bg-good" : wrong ? "bg-warn" : "bg-accent-muted"}`}
                      />
                      <span className="truncate">题目 {String(item.question_id).slice(0, 8)}</span>
                    </span>
                    <Badge tone={correct ? "good" : wrong ? "bad" : "neutral"}>
                      {correct ? "答对啦" : wrong ? "继续巩固" : "待自评"}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-line bg-panel-2/60 p-8 text-center">
              <p className="text-sm text-muted">还没有练习足迹，第一步随时可以开始。</p>
              <Link className="btn-primary btn-sm mt-4" to="/practice">
                去练一道题
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="relative grid h-20 w-20 place-items-center">
      <svg viewBox="0 0 64 64" className="h-20 w-20 -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id="dashboard-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgb(var(--c-accent))" />
            <stop offset="100%" stopColor="rgb(var(--c-accent-2))" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r={radius} fill="none" stroke="rgb(var(--c-accent) / 0.16)" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="url(#dashboard-ring)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
    </div>
  );
}
