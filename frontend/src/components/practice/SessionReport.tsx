import { useEffect, useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { getPracticeReport, type PracticeReport } from "../../api/practice";
import { clearResume } from "../../utils/studyStorage";

const labels: Record<string, string> = { correct: "答对", wrong: "答错", partial: "部分掌握", pending: "待自评", unanswered: "未作答", deleted: "已删除" };
export function SessionReport({ sessionId, busy, onJump, onRetry }: {
  sessionId: string; busy: boolean; onJump: (id: string) => void; onRetry: (scope: "mistakes" | "unanswered") => void;
}) {
  const [report, setReport] = useState<PracticeReport | null>(null);
  const [error, setError] = useState("");
  const [visibleCount, setVisibleCount] = useState(20);
  useEffect(() => {
    let active = true;
    getPracticeReport(sessionId).then(value => {
      if (!active) return;
      setReport(value);
      if (!value.unanswered && !value.pending) clearResume(sessionId);
    }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [sessionId]);
  if (error) return <div className="panel p-6" role="alert">练习报告暂时不可用：{error}</div>;
  if (!report) return <div className="panel p-6" role="status">正在整理本轮练习…</div>;
  return <section className="session-report panel p-5 sm:p-7">
    <p className="section-kicker">本轮复盘</p><h2>{report.total === report.deleted ? "本轮没有可练题目" : report.unanswered || report.pending ? "这一轮，还可以接着完成" : "这一轮练习完成"}</h2>
    <p className="text-sm text-muted">已作答 {report.answered} / {report.total - report.deleted} 题{report.deleted ? ` · ${report.deleted} 道已删除题不计入` : ""}。统计只包含本次练习的最近一次提交。</p>
    <dl className="report-metrics">{[["答对", report.correct], ["待巩固", report.wrong + report.partial], ["待自评", report.pending], ["未作答", report.unanswered]].map(([label, n]) => <div key={label}><dt>{label}</dt><dd>{n}</dd></div>)}</dl>
    {report.weak_points.length > 0 && <div className="mb-5"><h3 className="mb-2 text-sm font-semibold">这轮值得再练的知识点</h3><div className="flex flex-wrap gap-2">{report.weak_points.map(point => <span className="chip" key={point.point}>{point.point} · {point.count} 题</span>)}</div></div>}
    <div className="mb-5 flex flex-wrap gap-2">
      {report.wrong + report.partial > 0 && <button className="btn-primary" disabled={busy} onClick={() => onRetry("mistakes")}><RotateCcw size={16} />只重练薄弱题</button>}
      {report.unanswered > 0 && <button className="btn-secondary" disabled={busy} onClick={() => onJump(report.items.find(item => item.status === "unanswered")!.question_id)}>继续未答题 <ArrowRight size={16} /></button>}
      {report.pending > 0 && <button className="btn-secondary" disabled={busy} onClick={() => onJump(report.items.find(item => item.status === "pending")!.question_id)}>完成自评</button>}
    </div>
    <details open={report.items.length <= 20}><summary className="cursor-pointer py-2 text-sm font-semibold">逐题回顾 · {report.total} 题</summary><ul className="report-question-list">{report.items.slice(0, visibleCount).map(item => <li key={item.question_id}><button disabled={busy || item.status === "deleted"} onClick={() => onJump(item.question_id)}><span className="text-muted">{item.index + 1}</span><span className="flex-1 text-left">{item.title}</span><span className={`report-status status-${item.status}`}>{labels[item.status]}</span></button></li>)}</ul>{report.items.length > visibleCount && <button className="btn-secondary mt-3" onClick={() => setVisibleCount(n => n + 20)}>再显示 20 题</button>}</details>
  </section>;
}
