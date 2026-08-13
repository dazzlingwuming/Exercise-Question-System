import DOMPurify from "dompurify";
import { useEffect, useId, useState } from "react";

const MAX_MERMAID_LENGTH = 12_000;
const MAX_MERMAID_LINES = 400;

export function MermaidDiagram({ source }: { source: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");

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
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          fontFamily: "inherit",
          flowchart: { htmlLabels: false },
        });
        const rendered = await mermaid.render(`rich-mermaid-${id}`, content);
        if (!cancelled) setSvg(sanitizeMermaidSvg(rendered.svg));
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
  return <div className="rich-content__mermaid" dangerouslySetInnerHTML={{ __html: svg }} />;
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
