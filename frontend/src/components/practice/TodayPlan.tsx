import { ArrowRight, Play, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStudyOverview, type StudyOverview } from "../../api/practice";
import { loadDailyGoal, loadResume, saveDailyGoal } from "../../utils/studyStorage";

export function TodayPlan({ hasQuestions }: { hasQuestions: boolean }) {
  const [overview, setOverview] = useState<StudyOverview | null>(null);
  const [error, setError] = useState("");
  const [goal, setGoal] = useState(loadDailyGoal);
  const [resume] = useState(loadResume);
  useEffect(() => { let active = true; getStudyOverview().then(value => { if (active) setOverview(value); }).catch(err => { if (active) setError(err.message); }); return () => { active = false; }; }, []);
  if (!hasQuestions) return <section className="today-plan"><span className="section-kicker">开始使用</span><h2>先放进一道你想弄懂的题</h2><p>粘贴文字或上传截图，核对后保存；已有题库也可以直接导入。</p><div className="flex flex-wrap gap-3"><Link className="btn-primary" to="/questions/new?parse=1">整理第一道题 <ArrowRight size={16} /></Link><Link className="btn-secondary" to="/import">导入题库</Link></div></section>;
  const done = overview?.today_count ?? 0;
  return <section className="today-plan" aria-label="今日学习计划">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><span className="section-kicker">今日练习</span><h2>{done >= goal ? "今天的目标已完成" : "先复习，再学一点新内容"}</h2></div>
      <label className="daily-goal">每日目标<select value={goal} onChange={event => { const n = Number(event.target.value); setGoal(n); saveDailyGoal(n); }}><option value={5}>5 题</option><option value={10}>10 题</option><option value={20}>20 题</option></select></label>
    </div>
    <p>{overview ? `今日已练 ${done} 道不同题目 · ${overview.due_count} 道到期复习` : error || "正在整理你的学习安排…"}</p>
    <div className="coverage-track mb-5" role="progressbar" aria-label="今日目标进度" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(goal, done)}><span style={{ width: `${Math.min(100, done / goal * 100)}%` }} /></div>
    <div className="flex flex-wrap items-center gap-3">
      {overview && overview.available_count > 0 ? <Link className="btn-primary" to={`/practice?mode=daily&limit=${goal}`}><Play size={16} />{done >= goal ? `再练 ${goal} 题` : `开始 ${goal} 题练习`}</Link> : <Link className="btn-primary" to="/practice">自主选择练习 <ArrowRight size={16} /></Link>}
      {overview && overview.due_count > 0 && <Link className="btn-secondary" to="/practice?mode=due_review"><RotateCcw size={16} />只复习到期题</Link>}
    </div>
    <p className="plan-order">按到期复习 → 薄弱题 → 新题安排。题量不足时使用实际可练题目。</p>
    {resume && <Link className="resume-study" to={`/practice?session_id=${encodeURIComponent(resume.id)}`}><div><strong>接着上次学</strong><span>{resume.title || "未完成练习"} · 停在第 {resume.index + 1} / {resume.total} 题</span></div><ArrowRight size={18} /></Link>}
  </section>;
}
