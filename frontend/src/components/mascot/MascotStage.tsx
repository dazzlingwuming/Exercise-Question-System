import { Coins } from "lucide-react";

/**
 * 首页的「小鲸」舞台：角色立绘 + 对话气泡 + 金币徽章 + 名牌。
 * 立绘来自角色设定稿，已做透明背景与去标注处理。
 */
export function MascotStage({ quote = "今天也要好好吃饭，然后一口气刷完这一组！" }: { quote?: string }) {
  return (
    <div className="relative mx-auto w-full max-w-[19rem] pb-8">
      <div
        aria-hidden="true"
        className="absolute inset-x-4 bottom-12 top-16 rounded-[48%] blur-3xl"
        style={{ background: "radial-gradient(circle, rgb(var(--c-accent) / 0.26), transparent 70%)" }}
      />

      <div className="relative z-10 mx-auto mb-2 w-fit max-w-[15rem] rounded-2xl rounded-bl-md border border-line bg-panel/95 px-3 py-2 text-xs font-medium leading-5 text-ink shadow-soft backdrop-blur sm:absolute sm:-left-12 sm:top-0 sm:mb-0 sm:max-w-[9.5rem]">
        <span
          className="absolute -bottom-1 right-4 hidden h-2.5 w-2.5 rotate-45 border-b border-r border-line bg-panel sm:block"
          aria-hidden="true"
        />
        {quote}
      </div>

      <img
        src="/mascot/xiaojing.png"
        alt="小鲸：抱着白米饭的蓝发鲸鱼女仆"
        width={475}
        height={815}
        draggable={false}
        className="relative mx-auto h-[16.5rem] w-auto select-none animate-float drop-shadow-[0_18px_38px_rgba(30,58,138,0.22)] sm:h-[20rem] lg:h-[24rem]"
      />

      <div className="absolute right-0 top-[44%] flex items-center gap-1 rounded-full border border-gold-border bg-gold-soft px-2.5 py-1 text-xs font-semibold text-gold-ink shadow-soft sm:-right-4">
        <Coins className="h-3 w-3" aria-hidden="true" />
        金币 +1
      </div>

      <div className="absolute inset-x-0 bottom-0 mx-auto flex w-fit items-center gap-2 rounded-full border border-accent-border bg-panel/90 px-3 py-1.5 shadow-soft backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
        <span className="text-xs font-semibold text-ink">小鲸</span>
        <span className="text-xs text-muted">DeepSeek 酱</span>
      </div>
    </div>
  );
}
