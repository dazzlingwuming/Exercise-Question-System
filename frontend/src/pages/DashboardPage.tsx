import { ArrowRight, BookOpen, CheckCircle2, History, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStatsSummary } from "../api/stats";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { StudyIllustration } from "../components/common/StudyIllustration";
import { StatCard } from "../components/stats/StatCard";
import { TypeDistributionChart } from "../components/stats/TypeDistributionChart";
import type { StatsSummary } from "../types/stats";
export function DashboardPage() {
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { let active = true; getStatsSummary().then((value) => { if (active) setStats(value); }).catch((err) => { if (active) setError(err.message); }); return () => { active = false; }; }, []);
  if (error) return <ErrorState message={error} />;
  if (!stats) return <LoadingState />;
  const progress = stats.total_questions ? Math.round(stats.answered_count / stats.total_questions * 100) : 0;
  return <div className="space-y-6">
    <section className="hero-panel flex items-center justify-between gap-4 p-6 sm:p-8"><div className="relative z-10 max-w-xl"><p className="page-eyebrow">LET'S LEARN SOMETHING</p><h1 className="page-title text-3xl sm:text-4xl">今天，也向前一步。</h1><p className="mt-3 text-sm leading-7 text-muted">从一道题开始，让知识变成自己的能力。你的练习与复盘，都在这里。</p><div className="mt-6 flex flex-wrap gap-3"><Link className="btn-primary" to="/practice">开始练习<ArrowRight className="h-4 w-4" /></Link><Link className="btn-secondary" to="/questions">看看我的题库</Link></div></div><div className="hidden sm:block"><StudyIllustration /></div></section>
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4"><StatCard label="题库总量" value={stats.total_questions} icon={<BookOpen className="h-5 w-5" />} /><StatCard label="已练习题目" value={stats.answered_count} icon={<Target className="h-5 w-5" />} /><StatCard label="作答正确率" value={stats.accuracy === null ? "—" : `${stats.accuracy}%`} icon={<CheckCircle2 className="h-5 w-5" />} /><StatCard label="待复习错题" value={stats.wrong_count} icon={<History className="h-5 w-5" />} /></section>
    <section className="panel p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">选一种方式，进入状态</h2><span className="text-xs text-muted">练习覆盖 {progress}%</span></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{to:"sequential",title:"按顺序练习",note:"循序渐进，稳稳积累",icon:BookOpen},{to:"wrong",title:"攻克错题",note:"给薄弱处多一点关注",icon:History},{to:"direction",title:"专项练习",note:"专注一个方向的成长",icon:Target},{to:"unanswered",title:"探索新题",note:"今天再多懂一点",icon:ArrowRight}].map(({to,title,note,icon:Icon}) => <Link key={to} to={`/practice?mode=${to}`} className="group rounded-2xl border border-line bg-surface/50 p-4 hover:border-accent/40 hover:bg-blue-50"><Icon className="mb-4 h-5 w-5 text-accent" /><div className="text-sm font-semibold">{title}</div><p className="mt-1 text-xs text-muted">{note}</p></Link>)}</div></section>
    <section className="grid gap-5 lg:grid-cols-2"><div className="panel p-6"><h2 className="font-semibold">我的知识版图</h2>{stats.total_questions ? <TypeDistributionChart data={stats.type_distribution} /> : <div className="flex flex-col items-center py-8"><StudyIllustration /><p className="my-3 text-sm text-muted">先收集一些好题，开始你的学习旅程。</p><Link className="btn-secondary" to="/import">导入第一份题库</Link></div>}</div><div className="panel p-6"><h2 className="mb-5 font-semibold">最近的练习足迹</h2>{stats.recent_attempts.length ? <div className="space-y-3">{stats.recent_attempts.map((item) => <Link key={String(item.id)} to={`/questions/${String(item.question_id)}`} className="flex items-center justify-between gap-3 rounded-xl bg-surface p-3 text-sm"><span className="truncate">题目 {String(item.question_id).slice(0,8)}</span><span className={item.is_correct === true ? "text-emerald-700" : item.is_correct === false ? "text-amber-700" : "text-muted"}>{item.is_correct === true ? "答对啦" : item.is_correct === false ? "继续巩固" : "待自评"}</span></Link>)}</div> : <div className="rounded-2xl border border-dashed border-line p-8 text-center"><p className="text-sm text-muted">还没有练习足迹，第一步随时可以开始。</p><Link className="mt-4 inline-flex text-sm font-medium text-accent" to="/practice">去练一道题 →</Link></div>}</div></section>
  </div>;
}
