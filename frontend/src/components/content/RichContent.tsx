import { Children, Component, isValidElement, memo, type ReactNode, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { MermaidDiagram } from "./MermaidDiagram";

import { managedImageUrl } from "../../api/media";
import { Dialog } from "../common/Dialog";

const MAX_CONTENT_LENGTH = 100_000;

type RichContentProps = {
  content: string | null | undefined;
  className?: string;
  allowImages?: boolean;
};

// Markdown is deliberately rendered without rehype-raw: stored content must never become HTML.
const markdownComponents: Components = {
  a: ({ children, href }) => {
    if (!href) return <span>{children}</span>;
    if (isExternalHttpHref(href)) return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
    if (isRootRelativeHref(href)) return <a href={href}>{children}</a>;
    return <span>{children}</span>;
  },
  img: ({ src, alt }) => <ManagedContentImage path={src || ""} alt={alt || "题目图片"} />,
  pre: ({ children }) => {
    const child = Children.toArray(children)[0];
    if (isValidElement<{ className?: string; children?: ReactNode }>(child) && /(?:^|\s)language-mermaid(?:\s|$)/.test(child.props.className ?? "")) {
      return <MermaidDiagram source={readText(child.props.children)} />;
    }
    return <pre>{children}</pre>;
  },
};

export const RichContent = memo(function RichContent({ content, className = "", allowImages = true }: RichContentProps) {
  const source = String(content ?? "");
  if (!source) return null;
  if (source.length > MAX_CONTENT_LENGTH) {
    return <ContentFallback className={className} source={source} message={`内容超过 ${MAX_CONTENT_LENGTH.toLocaleString()} 字符的安全渲染上限，已显示原文。`} />;
  }

  return (
    <RichContentErrorBoundary source={source} className={className}>
      <div className={`rich-content ${className}`.trim()}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[[rehypeKatex, { throwOnError: false, trust: false, maxSize: 10, maxExpand: 500 }]]}
          components={allowImages ? markdownComponents : { ...markdownComponents, img: () => null }}
          skipHtml
          urlTransform={safeUrlTransform}
        >
          {normalizeMarkdownOutput(normalizeMathDelimiters(source))}
        </ReactMarkdown>
      </div>
    </RichContentErrorBoundary>
  );
});

/** Keep older AI messages renderable when a model mixed MathJax and Markdown delimiters. */
export function normalizeMathDelimiters(source: string): string {
  let normalized = source
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, body: string) => `\n$$\n${body.trim()}\n$$\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, body: string) => `$${body.trim()}$`)
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, body: string) => /[\u3400-\u9fff]/.test(body) || body.includes("$") ? body.trim() : `\n$$\n${body.trim()}\n$$\n`);
  if ((normalized.match(/\$\$/g) ?? []).length % 2 !== 0) normalized = normalized.replace(/\$\$/g, "");
  return normalized;
}

export function normalizeMarkdownOutput(source: string): string {
  return source.split("\n").map((line) => {
    const withoutHeadingMarker = line.replace(/^(\s*)\\?#(?:\s+|$)/, "$1");
    const stripped = withoutHeadingMarker.trim();
    if (stripped.startsWith("P(") && stripped.includes("=") && stripped.includes("\\prod") && !/[\u3400-\u9fff]/.test(stripped)) {
      return withoutHeadingMarker.replace(stripped, `$${stripped}$`);
    }
    return withoutHeadingMarker;
  }).join("\n");
}

function ManagedContentImage({ path, alt }: { path: string; alt: string }) {
  const [open, setOpen] = useState(false); const [failed, setFailed] = useState(false); const url = managedImageUrl(path);
  if (!url) return <span className="text-xs text-muted">[外部或无效图片已隐藏：{alt}]</span>;
  if (failed) return <span role="status" className="text-xs text-bad">图片暂时不可用：{alt}</span>;
  return <><button type="button" className="rich-content__image-button" aria-label={`放大图片：${alt}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpen(true); }}><img className="rich-content__image" src={url} alt={alt} loading="lazy" onError={() => setFailed(true)} /></button><Dialog open={open} title={alt} onClose={() => setOpen(false)} className="max-w-5xl"><button type="button" className="btn-secondary mb-3" onClick={() => setOpen(false)}>关闭图片</button><img src={url} alt={alt} className="mx-auto max-h-[72dvh] max-w-full object-contain" /></Dialog></>;
}

function safeUrlTransform(url: string) {
  return isRootRelativeHref(url) || isExternalHttpHref(url) ? url : "";
}

function isRootRelativeHref(href: string) {
  return href.startsWith("/") && !href.startsWith("//") && !/[\s\\]/.test(href);
}

function isExternalHttpHref(href: string) {
  if (/[\s\\]/.test(href)) return false;
  try {
    const url = new URL(href);
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function readText(value: ReactNode): string {
  return Children.toArray(value).map((item) => {
    if (typeof item === "string" || typeof item === "number") return String(item);
    if (isValidElement<{ children?: ReactNode }>(item)) return readText(item.props.children);
    return "";
  }).join("");
}

function ContentFallback({ className, source, message }: { className: string; source: string; message: string }) {
  return (
    <div className={`rich-content ${className}`.trim()}>
      <div className="rich-content__warning">{message}</div>
      <pre className="rich-content__source"><code>{source}</code></pre>
    </div>
  );
}

class RichContentErrorBoundary extends Component<{ source: string; className: string; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(previousProps: Readonly<{ source: string }>) {
    if (previousProps.source !== this.props.source && this.state.hasError) this.setState({ hasError: false });
  }

  render() {
    if (this.state.hasError) {
      return <ContentFallback className={this.props.className} source={this.props.source} message="内容无法安全渲染，已显示原文。" />;
    }
    return this.props.children;
  }
}
