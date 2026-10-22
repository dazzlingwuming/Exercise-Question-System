import { useTheme } from "../../theme/ThemeProvider";
import type { ThemeId } from "../../theme/themes";

/**
 * 主题化品牌标记：每个主题一枚专属符号，统一装在渐变方块里。
 */
export function BrandMark({ size = 44 }: { size?: number }) {
  const { theme } = useTheme();

  if (theme === "whale") {
    return (
      <span
        className="relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-white shadow-glow"
        style={{ width: size, height: size, boxShadow: "0 0 0 2px rgb(var(--c-accent-2) / 0.35), 0 10px 22px -12px rgb(var(--c-accent) / 0.8)" }}
      >
        <img src="/mascot/xiaojing-avatar.png" alt="" className="h-full w-full object-cover" />
      </span>
    );
  }

  return (
    <span
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-2xl text-on-accent"
      style={{
        width: size,
        height: size,
        backgroundImage: "linear-gradient(135deg, rgb(var(--c-accent)) 0%, rgb(var(--c-accent-2)) 100%)",
        boxShadow: "0 12px 26px -14px rgb(var(--c-accent) / 0.95), inset 0 1px 0 rgb(255 255 255 / 0.28)",
      }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-3 -top-4 h-8 w-8 rounded-full bg-white/25 blur-[6px]"
      />
      <Glyph theme={theme} size={Math.round(size * 0.6)} />
    </span>
  );
}

function Glyph({ theme, size }: { theme: ThemeId; size: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true as const };
  switch (theme) {
    case "whale":
      return (
        <svg {...common} fill="none">
          <path
            d="M3 14.1c0-3.7 3.1-6.7 6.9-6.7h2.3c1.7 0 3.1 1.1 3.6 2.7l2.3-1.7c.6-.4 1.4 0 1.4.7v4.6c0 3.3-2.8 6-6.2 6H9.2c-3.4 0-6.2-2.4-6.2-5.6Z"
            fill="currentColor"
          />
          <path d="M19.4 10.6c1-1.2 2.3-1.8 3.6-1.8-.4 1.7-1.5 3-3.1 3.6l-.5-1.8Z" fill="currentColor" opacity=".9" />
          <circle cx="8.4" cy="13.2" r="1.05" fill="rgb(var(--c-accent))" />
          <path d="M9.1 6.4c-.1-1.7.9-3.1 2.5-3.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".85" />
          <circle cx="11.9" cy="2.5" r=".9" fill="currentColor" opacity=".85" />
        </svg>
      );
    case "sunrise":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="13" r="4" fill="currentColor" stroke="none" />
          <path d="M12 3.4v2M12 20.6v.1M4.6 13h-2M21.4 13h-2M6.6 7.6 5.2 6.2M17.4 7.6l1.4-1.4" />
          <path d="M3.4 20.6c2.4-1.9 4.7-2.8 8.6-2.8s6.2.9 8.6 2.8" opacity=".55" />
        </svg>
      );
    case "ink":
      return (
        <svg {...common} fill="none">
          <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.4" stroke="currentColor" strokeWidth="1.6" opacity=".75" />
          <path d="M7.6 9.2h8.8M7.6 12.6h8.8M7.6 16h5.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="17" cy="16.2" r="1.5" fill="currentColor" />
        </svg>
      );
    case "mint":
      return (
        <svg {...common} fill="none">
          <path
            d="M20 4.4c.6 6.4-2.3 11.4-7.4 12.9-3.2.9-6.3-.5-7.6-3.2C7.7 8.4 13 4.6 20 4.4Z"
            fill="currentColor"
          />
          <path d="M4.6 19.8c2.2-5.6 5.8-9.2 11-11.3" stroke="rgb(var(--c-accent))" strokeWidth="1.6" strokeLinecap="round" opacity=".65" />
          <circle cx="17.2" cy="18.4" r="1.6" fill="currentColor" opacity=".55" />
        </svg>
      );
    case "aurora":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M2.8 15.6c2.9-6.4 5.6-9.6 9.2-9.6s6.3 3.2 9.2 9.6" opacity=".9" />
          <path d="M6.2 18.8c2-3.9 3.9-5.9 5.8-5.9s3.8 2 5.8 5.9" opacity=".55" />
          <circle cx="18.6" cy="5.6" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="5.2" cy="7.4" r=".9" fill="currentColor" stroke="none" opacity=".7" />
        </svg>
      );
    case "sakura":
      return (
        <svg {...common} fill="none">
          <g fill="currentColor">
            {[0, 72, 144, 216, 288].map((angle) => (
              <ellipse key={angle} cx="12" cy="6.6" rx="2.5" ry="4.1" transform={`rotate(${angle} 12 12)`} opacity=".92" />
            ))}
          </g>
          <circle cx="12" cy="12" r="1.7" fill="rgb(var(--c-accent))" opacity=".75" />
        </svg>
      );
    default:
      return null;
  }
}
