import { ArrowUpRight, Calculator, ChartNoAxesCombined, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { calculate, type MathResult } from "../../api/studio";

export function MathWorkbench({ onUse, disabled = false }: { onUse: (text: string) => void; disabled?: boolean }) {
  const [expression, setExpression] = useState("sin(x)");
  const [plot, setPlot] = useState(true);
  const [range, setRange] = useState({ min: "-10", max: "10" });
  const [result, setResult] = useState<MathResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true); setError(""); setResult(null);
    try {
      if (plot && (!range.min.trim() || !range.max.trim() || !Number.isFinite(Number(range.min)) || !Number.isFinite(Number(range.max)))) throw new Error("请填写有效的区间端点。");
      setResult(await calculate(expression, plot, Number(range.min), Number(range.max)));
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="math-workbench" aria-label="计算与函数作图">
    <div className="math-tool-heading"><Calculator size={18} /><h2>计算与函数作图</h2></div>
    <p className="text-xs text-muted leading-6">直接计算，不需要 API Key。三角函数使用弧度。</p>
    <fieldset disabled={busy}>
      <div className="studio-segmented mt-4"><button type="button" aria-pressed={!plot} onClick={() => { setPlot(false); setExpression("sqrt(144) + 2^3"); setResult(null); }}>数值计算</button><button type="button" aria-pressed={plot} onClick={() => { setPlot(true); setExpression("sin(x)"); setResult(null); }}>函数作图</button></div>
      <label className="tool-label">{plot ? "y =" : "表达式"}<input aria-label="数学表达式" value={expression} onChange={e => { setExpression(e.target.value); setResult(null); }} maxLength={300} spellCheck={false} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void run(); } }} /></label>
      {plot && <div className="math-range"><label>左端点<input type="number" value={range.min} onChange={e => { setRange({ ...range, min: e.target.value }); setResult(null); }} /></label><label>右端点<input type="number" value={range.max} onChange={e => { setRange({ ...range, max: e.target.value }); setResult(null); }} /></label></div>}
      <button className="btn-secondary w-full mt-3" onClick={() => void run()} disabled={busy || !expression.trim()}>{busy ? <LoaderCircle size={16} className="animate-spin" /> : <ChartNoAxesCombined size={16} />}{plot ? "绘制函数" : "计算结果"}</button>
    </fieldset>
    {error && <p role="alert" className="text-sm text-bad mt-3">{error}</p>}
    {result && <div className="math-result">
      {result.value !== null ? <output><small>计算结果 ≈</small><strong>{result.formatted}</strong></output> : <FunctionPlot result={result} />}
      <button className="btn-ghost btn-sm w-full mt-2" disabled={disabled} onClick={() => onUse(result.value !== null ? `我用数值计算工具得到 ${result.expression} ≈ ${result.formatted}。请解释计算过程，并帮我核对。` : `请分析函数 y = ${result.expression} 在 [${result.x_min}, ${result.x_max}] 上的性质。我已在函数工具查看采样图，请结合定义域、零点和变化趋势说明。`)}>带入讨论 <ArrowUpRight size={14} /></button>
    </div>}
    <details className="math-help"><summary>可用函数与说明</summary><p>+ − * / ^，pi、e，sin、cos、tan、asin、acos、atan、sqrt、abs、log（自然对数）、log10、exp、floor、ceil。乘法需写 *，例如 2*x。</p><p>计算为浮点近似值。函数图采用 401 个采样点，不能作为连续性或无根的证明；极点与快速振荡附近请缩小区间核对。</p></details>
  </section>;
}

export function FunctionPlot({ result }: { result: MathResult }) {
  const [selected, setSelected] = useState(200);
  const values = result.points.map(point => point[1]).filter((y): y is number => y !== null).sort((a, b) => a - b);
  // Trim a few extreme samples for a useful viewport; keep the original data in the inspector.
  let low = values[Math.floor(values.length * .02)] ?? -1, high = values[Math.ceil(values.length * .98) - 1] ?? 1;
  if (high === low) { low -= Math.max(1, Math.abs(low) * .1); high += Math.max(1, Math.abs(high) * .1); }
  const padding = (high - low) * .1; low -= padding; high += padding;
  const xMin = result.x_min!, xMax = result.x_max!;
  const px = (x: number) => 40 + (x - xMin) / (xMax - xMin) * 268;
  const py = (y: number) => 18 + (high - y) / (high - low) * 172;
  let path = "", previous: number | null = null;
  for (const [x, y] of result.points) {
    if (y === null || y < low || y > high || (previous !== null && Math.abs(y - previous) > (high - low) * .45)) { previous = null; continue; }
    path += `${previous === null ? "M" : "L"}${px(x).toFixed(2)},${py(y).toFixed(2)} `; previous = y;
  }
  const point = result.points[Math.min(selected, result.points.length - 1)];
  const label = (n: number) => Number(n.toPrecision(3)).toString();
  return <div className="function-plot">
    <svg viewBox="0 0 324 222" role="img" aria-label={`函数 y = ${result.expression} 的采样图，横轴 ${xMin} 到 ${xMax}，纵轴约 ${label(low)} 到 ${label(high)}`}>
      {[0, 1, 2, 3, 4].map(i => <g key={i}><line x1="40" x2="308" y1={18 + i * 43} y2={18 + i * 43} className="plot-grid" /><text x="34" y={22 + i * 43} textAnchor="end">{label(high - (high - low) * i / 4)}</text></g>)}
      {xMin <= 0 && xMax >= 0 && <line x1={px(0)} x2={px(0)} y1="18" y2="190" className="plot-axis" />}
      {low <= 0 && high >= 0 && <line x1="40" x2="308" y1={py(0)} y2={py(0)} className="plot-axis" />}
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
      <text x="40" y="211">{label(xMin)}</text><text x="308" y="211" textAnchor="end">{label(xMax)} (x)</text>
      {point?.[1] !== null && point && point[1] >= low && point[1] <= high && <circle cx={px(point[0])} cy={py(point[1])} r="4" fill="currentColor" />}
    </svg>
    <label className="plot-inspector">移动查看采样值<input type="range" min={0} max={result.points.length - 1} value={selected} onChange={e => setSelected(Number(e.target.value))} /></label>
    <output className="text-xs">x ≈ {point?.[0].toPrecision(5)}　 y {point?.[1] == null ? "未定义 / 超出范围" : `≈ ${point[1].toPrecision(5)}`}</output>
    <p className="text-xs text-muted mt-2">显示主要纵轴范围；区间内极大值可能在画面外。</p>
  </div>;
}
