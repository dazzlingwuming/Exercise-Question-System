import { useCountUp } from "../../hooks/useCountUp";

export function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const shown = useCountUp(value, { decimals });
  return <>{shown.toLocaleString("zh-CN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>;
}
