import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Dock } from "./Dock";
import { Topbar } from "./Topbar";

export function AppLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="relative min-h-screen">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -left-40 top-[-10%] h-[34rem] w-[34rem] rounded-full opacity-[0.5] blur-[100px] drift-soft"
          style={{ background: "radial-gradient(circle, rgb(var(--c-blob-1) / 0.32), transparent 68%)" }}
        />
        <div
          className="absolute right-[-12%] top-[14%] h-[30rem] w-[30rem] rounded-full opacity-45 blur-[110px] drift-soft"
          style={{ background: "radial-gradient(circle, rgb(var(--c-blob-2) / 0.28), transparent 70%)", animationDelay: "-6s" }}
        />
        <div
          className="absolute bottom-[-20%] left-[30%] h-[28rem] w-[28rem] rounded-full opacity-35 blur-[110px] drift-soft"
          style={{ background: "radial-gradient(circle, rgb(var(--c-blob-3) / 0.26), transparent 70%)", animationDelay: "-11s" }}
        />
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-24 lg:hidden"
        style={{ background: "linear-gradient(to top, rgb(var(--c-surface)) 18%, rgb(var(--c-surface) / 0.75) 55%, transparent)" }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-24 lg:hidden"
        style={{ background: "linear-gradient(to top, rgb(var(--c-surface)) 18%, rgb(var(--c-surface) / 0.75) 55%, transparent)" }}
      />

      <Dock />

      <div className="lg:pl-[6.4rem]">
        <Topbar />
        <main key={pathname} className="mx-auto w-full max-w-[1560px] animate-rise px-4 pb-28 pt-4 md:px-7 lg:pb-14">
          {children}
        </main>
      </div>
    </div>
  );
}
