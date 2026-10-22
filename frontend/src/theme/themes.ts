export type ThemeId = "whale" | "sunrise" | "ink" | "mint" | "aurora" | "sakura";

export type ThemeMeta = {
  id: ThemeId;
  name: string;
  en: string;
  tagline: string;
  mode: "light" | "dark";
  /** 主题卡片预览用的渐变，直接写死色值，避免受当前主题变量影响 */
  preview: string;
  dots: [string, string, string];
};

export const THEMES: ThemeMeta[] = [
  {
    id: "whale",
    name: "深海小鲸",
    en: "Whale",
    tagline: "小鲸陪你刷完这一组",
    mode: "light",
    preview: "linear-gradient(135deg, #0f1e47 0%, #1e3a8a 45%, #3b82f6 100%)",
    dots: ["#1e3a8a", "#3b82f6", "#f5c542"],
  },
  {
    id: "sunrise",
    name: "晨曦暖阳",
    en: "Sunrise",
    tagline: "像晨光一样慢慢亮起",
    mode: "light",
    preview: "linear-gradient(135deg, #fff3df 0%, #e2a05e 55%, #b25416 100%)",
    dots: ["#b25416", "#c4621e", "#ffd8a8"],
  },
  {
    id: "ink",
    name: "墨韵书斋",
    en: "Ink",
    tagline: "纸墨之间，温故知新",
    mode: "light",
    preview: "linear-gradient(135deg, #f4efe1 0%, #cfc4a8 48%, #9e2b25 100%)",
    dots: ["#9e2b25", "#6e6a5e", "#d8cba8"],
  },
  {
    id: "mint",
    name: "薄荷实验室",
    en: "Mint",
    tagline: "清清爽爽拆开难点",
    mode: "light",
    preview: "linear-gradient(135deg, #e6fbf4 0%, #4fd0b4 52%, #0a7f6e 100%)",
    dots: ["#0a7f6e", "#169a85", "#7dd3fc"],
  },
  {
    id: "aurora",
    name: "暗夜极光",
    en: "Aurora",
    tagline: "深夜专注，只留一束光",
    mode: "dark",
    preview: "linear-gradient(135deg, #070c18 0%, #22315c 45%, #4fe3c1 100%)",
    dots: ["#7c9bff", "#4fe3c1", "#a855f7"],
  },
  {
    id: "sakura",
    name: "樱日和",
    en: "Sakura",
    tagline: "春风十里，题目温柔",
    mode: "light",
    preview: "linear-gradient(135deg, #fff1f5 0%, #f0a2b8 55%, #c43f68 100%)",
    dots: ["#c43f68", "#d6557c", "#fdbab6"],
  },
];

export const DEFAULT_THEME: ThemeId = "whale";
export const THEME_STORAGE_KEY = "eqs.theme";

export function getThemeMeta(id: ThemeId): ThemeMeta {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEMES.some((theme) => theme.id === value);
}
