import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -left-40 top-[-10%] h-[32rem] w-[32rem] rounded-full opacity-[0.55] blur-[90px] drift-soft"
          style={{ background: "radial-gradient(circle, rgb(var(--c-blob-1) / 0.35), transparent 68%)" }}
        />
        <div
          className="absolute right-[-12%] top-[18%] h-[28rem] w-[28rem] rounded-full opacity-50 blur-[100px] drift-soft"
          style={{ background: "radial-gradient(circle, rgb(var(--c-blob-2) / 0.3), transparent 70%)", animationDelay: "-6s" }}
        />
        <div
          className="absolute bottom-[-18%] left-[32%] h-[26rem] w-[26rem] rounded-full opacity-40 blur-[100px] drift-soft"
          style={{ background: "radial-gradient(circle, rgb(var(--c-blob-3) / 0.28), transparent 70%)", animationDelay: "-11s" }}
        />
      </div>

      <Sidebar />

      <div className="min-w-0 flex-1">
        <Topbar />
        <main className="mx-auto w-full max-w-[1680px] px-4 py-6 md:px-8 md:py-8">{children}</main>
        <footer className="mx-auto w-full max-w-[1680px] px-4 pb-8 text-center text-[11px] text-muted/80 md:px-8">
          一点一点，把知识变成自己的。
        </footer>
      </div>
    </div>
  );
}
