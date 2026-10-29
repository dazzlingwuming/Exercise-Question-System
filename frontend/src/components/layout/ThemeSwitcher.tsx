import { Check, ChevronDown, Palette, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTheme } from "../../theme/ThemeProvider";

export function ThemeSwitcher() {
  const { theme, meta, themes, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={wrap}>
      <button
        type="button"
        aria-label={`切换主题，当前${meta.name}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="group flex h-10 items-center gap-2 rounded-full border border-line bg-panel/80 py-1 pl-1.5 pr-2.5 text-xs font-medium text-ink shadow-soft backdrop-blur transition hover:border-accent/50 hover:text-accent sm:pr-3"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full" style={{ backgroundImage: meta.preview }}>
          <Palette className="h-3.5 w-3.5 text-white drop-shadow" aria-hidden="true" />
        </span>
        <span className="hidden sm:inline">{meta.name}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="选择界面主题"
          className="absolute right-0 top-[calc(100%+0.6rem)] z-50 w-[min(26rem,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-3xl border border-line bg-panel p-4 shadow-lift rise-in"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">Appearance</p>
              <h2 className="mt-1 text-base font-bold tracking-tight">换一套界面心情</h2>
              <p className="mt-0.5 text-xs leading-5 text-muted">六套主题即时切换，会记住你的选择。</p>
            </div>
            <button type="button" className="icon-btn h-8 w-8 rounded-full" aria-label="关闭主题面板" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid max-h-[min(26rem,60vh)] grid-cols-1 gap-2 overflow-auto pr-0.5 sm:grid-cols-2">
            {themes.map((item) => {
              const active = item.id === theme;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`theme-card ${active ? "is-active" : ""}`}
                  onClick={() => {
                    setTheme(item.id);
                    setOpen(false);
                  }}
                  aria-pressed={active}
                >
                  <span className="theme-card__preview block" style={{ backgroundImage: item.preview }}>
                    <span className="absolute inset-x-2.5 top-2.5 flex items-center gap-1.5">
                      <span className="h-1.5 w-8 rounded-full bg-white/70" />
                      <span className="h-1.5 w-4 rounded-full bg-white/35" />
                    </span>
                    <span className="absolute inset-x-2.5 bottom-2 flex gap-1">
                      <span className="h-4 flex-1 rounded-md bg-white/25" />
                      <span className="h-4 w-6 rounded-md bg-white/45" />
                    </span>
                  </span>
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-ink">{item.name}</span>
                        <span className="text-xs uppercase tracking-wider text-muted">{item.en}</span>
                      </span>
                      <span className="mt-0.5 block text-xs leading-4 text-muted">{item.tagline}</span>
                    </span>
                    <span
                      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition ${
                        active ? "border-accent bg-accent text-on-accent" : "border-line text-transparent"
                      }`}
                    >
                      <Check className="h-3 w-3" aria-hidden="true" />
                    </span>
                  </span>
                  <span className="flex gap-1" aria-hidden="true">
                    {item.dots.map((color) => (
                      <span key={color} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                    ))}
                    <span className="ml-auto text-xs font-medium text-muted">
                      {item.mode === "dark" ? "深色" : "浅色"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
