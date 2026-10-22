import { ArrowRight, ArrowUpRight, BookOpen, CheckCircle2, History, Sparkles, Target, TrendingUp } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { getStatsSummary } from "../api/stats";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { HeroScene } from "../components/layout/HeroScene";
import { TypeDistributionChart } from "../components/stats/TypeDistributionChart";
import { useTheme } from "../theme/ThemeProvider";
import type { StatsSummary } from "../types/stats";

const PRACTICE_MODES = [
  { to: "sequential", title: "按顺序练习", note: "循序渐进，稳稳积累", icon: BookOpen },
  { to: "wrong", title: "攻克错题", note: "给薄弱处多一点注意力", icon: History },
  { to: "direction", title: "专项练习", note: "一段时间只攻一个方向", icon: Target },
  { to: "unanswered", title: "探索新题", note: "今天再多懂一点点", icon: Sparkles },
];

const MARQUEE = [
  "一点积累，一点成长",
  "白米饭要一口一口吃",
  "错题要一道一道过",
  "小鲸会一直陪着你",
  "把今天的练习，变成明天的底气",
];

export function DashboardPage() {
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [error, setError] = useState("");
  const { theme } = useTheme();

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
  const remaining = Math.max(0, stats.total_questions - stats.answered_count);

  return (
    <div className="space-y-4">
      <div className="bento stagger">
        {/* Hero */}
        <section className="bento-card bento-hero grid-lines col-span-12 flex min-h-[19rem] flex-col justify-between gap-6 p-6 sm:p-8 xl:col-span-8 xl:min-h-[21rem] xl:flex-row xl:items-center">
          <div className="relative z-10 max-w-[30rem]">
            <p className="eyebrow eyebrow-dot">Today&apos;s session</p>
            <h1 className="hero-display mt-4">
              今天，也
              <br />
              <span className="gradient-text">向前一步</span>。
            </h1>
            <p className="mt-4 max-w-md text-[0.92rem] leading-7 text-muted">
              从一道题开始，把「看过」变成「讲得清」。你的练习、复盘与每一点进步，都在这里被看见。
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link className="btn-primary" to="/practice">
                开始练习
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link className="btn-secondary" to="/questions">
                翻翻题库
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-accent-border/50 pt-4">
              {[
                { label: "题库", value: stats.total_questions },
                { label: "已练", value: stats.answered_count },
                { label: "正确率", value: stats.accuracy === null ? "—" : `${stats.accuracy}%` },
              ].map((item) => (
                <div key={item.label}>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-muted">{item.label}</div>
                  <div className="mt-0.5 text-lg font-extrabold tabular-nums tracking-tight">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <svg
            aria-hidden="true"
            viewBox="0 0 400 60"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-14 w-full opacity-[0.14]"
          >
            <path d="M0 34c44-22 88-22 132 0s88 22 132 0 92-20 136 0v26H0Z" fill="rgb(var(--c-accent))" />
            <path d="M0 44c52-16 104-16 156 0s104 16 156 0 64-10 88-4v20H0Z" fill="rgb(var(--c-accent-2))" opacity="0.7" />
          </svg>

          <svg
            aria-hidden="true"
            viewBox="0 0 400 60"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-14 w-full opacity-[0.14]"
          >
            <path d="M0 34c44-22 88-22 132 0s88 22 132 0 92-20 136 0v26H0Z" fill="rgb(var(--c-accent))" />
            <path d="M0 44c52-16 104-16 156 0s104 16 156 0 64-10 88-4v20H0Z" fill="rgb(var(--c-accent-2))" opacity="0.7" />
          </svg>

          <div className="relative z-0 flex w-full max-w-[16rem] items-end justify-center self-center xl:max-w-[20rem] xl:self-end">
            {theme === "whale" ? (
              <img
                src="/mascot/xiaojing.png"
                alt="小鲸"
                width={475}
                height={815}
                draggable={false}
                className="h-[14rem] w-auto select-none drop-shadow-[0_22px_40px_rgba(30,58,138,0.24)] sm:h-[17rem] xl:h-[20rem]"
              />
            ) : (
              <HeroScene className="max-w-[15rem]" />
            )}
            <div className="absolute -left-4 -top-3 max-w-[8.5rem] rounded-2xl rounded-bl-md border border-line bg-panel/90 px-3 py-2 text-[11px] font-medium leading-5 shadow-soft backdrop-blur xl:-left-8">
              这一组，也一起刷完吧！
            </div>
          </div>
        </section>

        {/* Progress */}
        <section className="bento-card bento-invert col-span-12 flex flex-col justify-between gap-5 p-6 sm:col-span-6 xl:col-span-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">Learning coverage</p>
              <h2 className="mt-2 text-lg font-bold tracking-tight">学习覆盖</h2>
            </div>
            <span className="stat-icon">
              <TrendingUp className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>

          <div className="flex items-center justify-center py-1">
            <ProgressRing value={progress} light />
          </div>

          <div className="space-y-2">
            <p className="leader">
              <span>已练习</span>
              <span>{stats.answered_count} 题</span>
            </p>
            <p className="leader">
              <span>还没碰过</span>
              <span>{remaining} 题</span>
            </p>
            <p className="leader">
              <span>待复习错题</span>
              <span>{stats.wrong_count} 题</span>
            </p>
          </div>

          <Link className="btn-secondary btn-sm w-full" to="/practice">
            继续这一组
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </section>

        {/* Stats */}
        <StatTile label="题库总量" value={stats.total_questions} caption="道题在库里" icon={<BookOpen className="h-4 w-4" />} />
        <StatTile label="已练习" value={stats.answered_count} caption={`覆盖 ${progress}%`} icon={<Target className="h-4 w-4" />} />
        <StatTile
          label="正确率"
          value={stats.accuracy === null ? "—" : `${stats.accuracy}%`}
          caption="最近一次统计"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatTile label="待复习" value={stats.wrong_count} caption="道错题等你" icon={<History className="h-4 w-4" />} />

        {/* Quick actions */}
        <section className="bento-card col-span-12 p-5 lg:col-span-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight">选一种方式进入状态</h2>
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted">Modes</span>
          </div>
          <div className="space-y-1">
            {PRACTICE_MODES.map(({ to, title, note, icon: Icon }, index) => (
              <Link key={to} to={`/practice?mode=${to}`} className="row-link group">
                <span className="w-6 shrink-0 text-[11px] font-bold tabular-nums text-muted/70">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="stat-icon h-9 w-9 shrink-0 rounded-xl">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{title}</span>
                  <span className="block text-[11px] text-muted">{note}</span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted/50 transition group-hover:text-accent" aria-hidden="true" />
              </Link>
            ))}
          </div>
          <p className="mt-3 rounded-xl border border-dashed border-line bg-panel-2/50 px-3 py-2.5 text-[11px] leading-5 text-muted">
            建议节奏：先刷错题 → 再开新题 → 最后用专项练习收口。
          </p>
        </section>

        {/* Knowledge map */}
        <section className="bento-card col-span-12 p-5 md:col-span-6 lg:col-span-4">
          <div className="mb-1 flex items-baseline justify-between">
            <h2 className="text-base font-bold tracking-tight">知识版图</h2>
            <Link className="text-[11px] font-medium text-accent hover:underline" to="/stats">
              详细 →
            </Link>
          </div>
          {stats.total_questions ? (
            <TypeDistributionChart data={stats.type_distribution} />
          ) : (
            <div className="flex flex-col items-center py-6 text-center">
              <p className="text-sm text-muted">先导入一些题，版图才会亮起来。</p>
              <Link className="btn-secondary btn-sm mt-3" to="/import">
                导入题库
              </Link>
            </div>
          )}
        </section>

        {/* Recent */}
        <section className="bento-card col-span-12 p-5 md:col-span-6 lg:col-span-3">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-base font-bold tracking-tight">最近足迹</h2>
            <Link className="text-[11px] font-medium text-accent hover:underline" to="/review">
              复习 →
            </Link>
          </div>
          {stats.recent_attempts.length ? (
            <ul className="space-y-1">
              {stats.recent_attempts.slice(0, 6).map((item) => {
                const correct = item.is_correct === true;
                const wrong = item.is_correct === false;
                return (
                  <li key={String(item.id)}>
                    <Link to={`/questions/${String(item.question_id)}`} className="row-link py-2">
                      <span
                        aria-hidden="true"
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${correct ? "bg-good" : wrong ? "bg-warn" : "bg-accent-muted"}`}
                      />
                      <span className="min-w-0 flex-1 truncate text-[12px] text-ink">
                        题目 {String(item.question_id).slice(0, 8)}
                      </span>
                      <span className={`shrink-0 text-[10px] font-medium ${correct ? "text-good" : wrong ? "text-warn" : "text-muted"}`}>
                        {correct ? "答对" : wrong ? "巩固" : "待评"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-6 text-center text-xs leading-6 text-muted">还没有足迹，第一步随时可以开始。</p>
          )}
          <Link
            className="mt-3 flex items-center justify-between rounded-xl border border-line bg-panel-2/50 px-3 py-2 text-[11px] font-medium text-muted transition hover:border-accent/35 hover:text-accent"
            to="/review"
          >
            查看全部错题
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </section>
      </div>

      {/* Marquee */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-panel/60 py-2.5">
        <div className="marquee">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center gap-8 pr-8" aria-hidden={copy === 1}>
              {MARQUEE.map((text) => (
                <span key={text} className="flex items-center gap-8 text-[11px] font-medium tracking-[0.14em] text-muted">
                  {text}
                  <span className="h-1 w-1 rounded-full bg-accent/50" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, caption, icon }: { label: string; value: number | string; caption: string; icon: ReactNode }) {
  return (
    <section className="bento-card dot-grid col-span-6 p-5 md:col-span-3">
      <div className="relative z-10 flex items-start justify-between gap-2">
        <span className="text-[11px] font-medium tracking-wide text-muted">{label}</span>
        <span className="text-accent/80">{icon}</span>
      </div>
      <div className="figure-xl relative z-10 mt-3">{value}</div>
      <p className="relative z-10 mt-1 text-[11px] text-muted">{caption}</p>
    </section>
  );
}

function ProgressRing({ value, light = false }: { value: number; light?: boolean }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="relative grid h-[9.5rem] w-[9.5rem] place-items-center">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id="coverage-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={light ? "rgb(var(--c-on-accent))" : "rgb(var(--c-accent))"} />
            <stop offset="100%" stopColor={light ? "rgb(var(--c-on-accent) / 0.72)" : "rgb(var(--c-accent-2))"} />
          </linearGradient>
        </defs>
        <circle cx="64" cy="64" r={radius} fill="none" stroke={light ? "rgb(var(--c-on-accent) / 0.22)" : "rgb(var(--c-accent) / 0.12)"} strokeWidth="9" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="url(#coverage-ring)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          style={{ transition: "stroke-dashoffset 800ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="figure-xl">{clamped}%</div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted">coverage</div>
      </div>
    </div>
  );
}
