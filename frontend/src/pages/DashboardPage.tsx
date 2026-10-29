import { ArrowRight, ArrowUpRight, Clock3, ImagePlus, ListOrdered, MessageSquare, RotateCcw, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStatsSummary } from "../api/stats";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import type { StatsSummary } from "../types/stats";
import { TodayPlan } from "../components/practice/TodayPlan";

const modes = [
  { mode: "sequential", title: "循序练习", note: "按照题库顺序，一题一题掌握", icon: ListOrdered },
  { mode: "wrong", title: "巩固错题", note: "回到薄弱的地方，重新梳理思路", icon: RotateCcw },
  { mode: "direction", title: "专项突破", note: "选择一个方向，集中练习", icon: Target },
];

export function DashboardPage() {
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getStatsSummary().then(value => { if (active) setStats(value); }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, []);
  if (error) return <ErrorState message={error} />;
  if (!stats) return <LoadingState />;
  const progress = stats.total_questions ? Math.round(stats.answered_count / stats.total_questions * 100) : 0;
  const metrics = [
    ["题库总量", stats.total_questions, "道题目"], ["已练习", stats.answered_count, `覆盖 ${progress}%`],
    ["作答正确率", stats.accuracy === null ? "—" : `${stats.accuracy}%`, "按已判分记录统计"], ["当前错题", stats.wrong_count, "道题待巩固"],
  ];
  return <div className="study-overview">
    <div className="overview-heading"><div><p className="section-kicker">YOUR LEARNING SPACE</p><h1>学习概览</h1><p>练习、整理与复盘，都从这里继续。</p></div>
      <span className="overview-date"><Clock3 size={15} />{new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date())}</span>
    </div>
    <Link to="/studio" className="overview-studio-entry"><MessageSquare size={23} strokeWidth={1.6} /><div><strong>打开 AI 工作台</strong><p>随时提问、贴图讨论，用计算与函数图核对思路。</p></div><ArrowUpRight size={19} /></Link>
    <section className="overview-metrics" aria-label="学习数据">{metrics.map(([label, value, note]) => <div key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>)}</section>
    <div className="overview-columns">
      <div className="min-w-0">
        <TodayPlan hasQuestions={stats.total_questions > 0} />
        <section className="overview-section"><div className="section-heading"><h2>选择练习方式</h2><span>保持自己的节奏</span></div>
          <div>{modes.map(({ mode, title, note, icon: Icon }, index) => <Link key={mode} to={`/practice?mode=${mode}${mode === "direction" ? "&configure=1" : ""}`} className="study-mode-row">
            <span className="mode-number">0{index + 1}</span><Icon size={20} strokeWidth={1.6} /><span className="flex-1"><strong>{title}</strong><small>{note}</small></span><ArrowUpRight size={18} />
          </Link>)}</div>
        </section>
        <section className="image-learning-note"><ImagePlus size={22} strokeWidth={1.6} /><div><h2>题目，也可以从一张图开始</h2><p>截图识别成题，或在讲题对话中附图追问。文字、公式和图解一起学。</p></div><Link to="/questions/new?parse=1" aria-label="从图片整理题目"><ArrowRight size={20} /></Link></section>
      </div>
      <aside className="overview-context">
        <section><div className="section-heading"><h2>学习覆盖</h2><Link to="/stats" aria-label="查看学习统计"><ArrowUpRight size={17} /></Link></div>
          <div className="coverage-value">{progress}<span>%</span></div><div className="coverage-track" role="progressbar" aria-label="题库学习覆盖" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>
          <p className="mt-3 text-sm text-muted">已练习 {stats.answered_count} / {stats.total_questions} 题</p>
        </section>
        <section className="mt-9"><div className="section-heading"><h2>最近练习</h2><Clock3 size={16} className="text-muted" /></div>
          {stats.recent_attempts.length ? <ul className="recent-study-list">{stats.recent_attempts.slice(0, 5).map(item => <li key={String(item.id)}><Link to={`/questions/${item.question_id}`}>
            <span className={`activity-dot ${item.is_correct === true ? "bg-good" : item.is_correct === false ? "bg-warn" : "bg-line"}`} />
            <span className="min-w-0 flex-1"><strong>{String(item.title || item.question_id)}</strong><small>{item.created_at ? new Date(String(item.created_at)).toLocaleDateString("zh-CN") : ""}</small></span>
            <span className="text-xs text-muted">{item.review_status === "partial" ? "部分掌握" : item.is_correct === true ? "答对" : item.is_correct === false ? "待巩固" : "待自评"}</span>
          </Link></li>)}</ul> : <p className="py-6 text-sm leading-7 text-muted">还没有练习记录。完成一题后，就会出现在这里。</p>}
        </section>
        <Link to="/questions" className="mt-6 flex items-center justify-between border-t border-line pt-5 text-sm text-accent">浏览我的题库 <ArrowRight size={16} /></Link>
      </aside>
    </div>
  </div>;
}
