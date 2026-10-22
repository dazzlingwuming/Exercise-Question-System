import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_THEME,
  THEMES,
  THEME_STORAGE_KEY,
  getThemeMeta,
  isThemeId,
  type ThemeId,
  type ThemeMeta,
} from "./themes";

const THEME_COLORS: Record<ThemeId, string> = {
  whale: "#f2f6ff",
  sunrise: "#fff9f1",
  ink: "#f6f3ea",
  mint: "#f1faf7",
  aurora: "#090d1a",
  sakura: "#fff6f8",
};

type ThemeContextValue = {
  theme: ThemeId;
  meta: ThemeMeta;
  themes: ThemeMeta[];
  setTheme: (id: ThemeId) => void;
  cycleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeId(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(readStoredTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.add("theme-switching");
    const timer = window.setTimeout(() => root.classList.remove("theme-switching"), 420);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* 隐私模式下写入失败时，仅当前会话生效 */
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLORS[theme]);
    return () => window.clearTimeout(timer);
  }, [theme]);

  const setTheme = useCallback((id: ThemeId) => setThemeState(id), []);

  const cycleTheme = useCallback(() => {
    setThemeState((current) => {
      const index = THEMES.findIndex((item) => item.id === current);
      return THEMES[(index + 1) % THEMES.length].id;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, meta: getThemeMeta(theme), themes: THEMES, setTheme, cycleTheme }),
    [theme, setTheme, cycleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** 在 Provider 之外调用时退化为默认主题，方便单测直接渲染组件。 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context) return context;
  return {
    theme: DEFAULT_THEME,
    meta: getThemeMeta(DEFAULT_THEME),
    themes: THEMES,
    setTheme: () => undefined,
    cycleTheme: () => undefined,
  };
}
