import DOMPurify from "dompurify";
import { useEffect, useId, useState } from "react";
import { Maximize2 } from "lucide-react";
import { Dialog } from "../common/Dialog";

const MAX_MERMAID_LENGTH = 12_000;
const MAX_MERMAID_LINES = 400;

export function MermaidDiagram({ source }: { source: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const content = source.trim();
    const rejection = rejectReason(content);
    if (rejection) {
      setSvg("");
      setError(rejection);
      return;
    }

    let cancelled = false;
    setSvg("");
    setError("");
    void import("mermaid")
      .then(async ({ default: mermaid }) => {
        if (cancelled) return;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          fontFamily: "inherit",
          // Mermaid 11 uses the root setting; otherwise HTML labels are stripped
          // by our SVG sanitizer, leaving empty nodes.
          htmlLabels: false,
          flowchart: { htmlLabels: false },
        });
        // Mermaid measures an SVG in the DOM. Keep the temporary tree out of the
        // document flow so rendering several diagrams cannot move the composer.
        const measurement = document.createElement("div");
        measurement.style.cssText = "position:fixed;left:-100000px;top:0;width:1000px;visibility:hidden;pointer-events:none";
        measurement.setAttribute("aria-hidden", "true");
        document.body.append(measurement);
        try {
          const rendered = await mermaid.render(`rich-mermaid-${id}`, content, measurement);
          if (!cancelled) setSvg(sanitizeMermaidSvg(rendered.svg));
        } finally { measurement.remove(); }
      })
      .catch(() => {
        if (!cancelled) setError("图表无法安全渲染，已显示 Mermaid 源码。");
      });

    return () => {
      cancelled = true;
    };
  }, [id, source]);

  if (error) return <MermaidFallback source={source} message={error} />;
  if (!svg) return <div className="rich-content__mermaid-status">正在渲染图表…</div>;
  return <div className="mermaid-viewer"><div className="rich-content__mermaid" dangerouslySetInnerHTML={{ __html: svg }} />
    <button type="button" className="btn-ghost btn-sm" aria-label="放大流程图" onClick={() => setOpen(true)}><Maximize2 size={14} />放大查看</button>
    <Dialog open={open} title="查看图表" onClose={() => setOpen(false)} className="max-w-5xl">
      <p className="text-xs text-muted mb-3">按原始尺寸显示，较大的图表可横向滚动查看。</p>
      <div className="mermaid-expanded"><img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt="放大的图表" /></div>
      <button type="button" className="btn-secondary mt-4" onClick={() => setOpen(false)}>关闭图表</button>
    </Dialog>
  </div>;
}

function sanitizeMermaidSvg(svg: string) {
  const sanitized = DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ["foreignObject", "script", "iframe", "object", "embed", "a", "use"],
    // DOMPurify blocks event-handler attributes by default; these explicit attrs also remove navigation and inline CSS.
    FORBID_ATTR: ["href", "xlink:href", "style"],
  });
  return restoreViewBoxDimensions(sanitized);
}

// Mermaid emits width="100%" plus an inline max-width. The inline style is intentionally
// stripped above, so restore fixed intrinsic dimensions from the trusted, sanitized viewBox.
function restoreViewBoxDimensions(svg: string) {
  const document = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = document.documentElement;
  if (root.localName !== "svg") return svg;

  const values = (root.getAttribute("viewBox") ?? "").trim().split(/\s+/).map(Number);
  const width = values[2];
  const height = values[3];
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return svg;

  root.setAttribute("width", String(width));
  root.setAttribute("height", String(height));
  root.setAttribute("preserveAspectRatio", "xMidYMid meet");
  return new XMLSerializer().serializeToString(root);
}

function rejectReason(source: string) {
  if (!source) return "图表内容为空，已显示 Mermaid 源码。";
  if (source.length > MAX_MERMAID_LENGTH || source.split(/\r?\n/).length > MAX_MERMAID_LINES) {
    return `图表超过 ${MAX_MERMAID_LENGTH.toLocaleString()} 字符或 ${MAX_MERMAID_LINES} 行的安全渲染上限，已显示 Mermaid 源码。`;
  }
  if (/^---(?:\r?\n|$)/.test(source) || /%%\{[\s\S]*?\binit\s*:/i.test(source)) {
    return "Mermaid init 指令和 frontmatter 已禁用，已显示 Mermaid 源码。";
  }
  if (/^\s*click\b/im.test(source)) return "Mermaid click 指令已禁用，已显示 Mermaid 源码。";
  return "";
}

function MermaidFallback({ source, message }: { source: string; message: string }) {
  return (
    <div className="rich-content__mermaid-fallback">
      <div className="rich-content__warning">{message}</div>
      <pre className="rich-content__source"><code>{source}</code></pre>
    </div>
  );
}
