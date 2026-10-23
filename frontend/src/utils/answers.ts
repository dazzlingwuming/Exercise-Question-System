/**
 * 把 "B"、"A、C"、["A","C"]、"正确" 等各种答案写法统一成集合。
 * 用于练习页判分高亮与题目详情页标注正确答案。
 */
export function answerKeys(value: unknown): Set<string> {
  const out = new Set<string>();
  const push = (input: unknown) => {
    if (Array.isArray(input)) {
      input.forEach(push);
      return;
    }
    if (input === null || input === undefined) return;
    String(input)
      .split(/[、,，;；/\s]+/)
      .forEach((token) => {
        const cleaned = token.trim().replace(/[.。:：]$/, "").toUpperCase();
        if (/^[A-Z]$/.test(cleaned)) {
          out.add(cleaned);
          return;
        }
        if (cleaned === "对" || cleaned === "正确" || cleaned === "是") out.add("正确");
        if (cleaned === "错" || cleaned === "错误" || cleaned === "否") out.add("错误");
      });
  };
  push(value);
  return out;
}

/** 判断题：把 A/B 或 正确/错误 统一成「正确 / 错误」。 */
export function trueFalseAnswer(value: unknown): string {
  const keys = answerKeys(value);
  if (keys.has("正确")) return "正确";
  if (keys.has("错误")) return "错误";
  if (keys.has("A") && !keys.has("B")) return "正确";
  if (keys.has("B") && !keys.has("A")) return "错误";
  return "";
}
