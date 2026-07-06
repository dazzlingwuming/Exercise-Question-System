import { Activity } from "lucide-react";

export function Topbar() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface/90 px-4 py-3 backdrop-blur md:px-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Agent 应用层岗位题库刷题系统</div>
          <div className="text-xs text-muted">解析、练习、复盘、统计</div>
        </div>
        <div className="hidden items-center gap-2 rounded-md border border-line bg-white px-3 py-1.5 text-xs text-muted sm:flex">
          <Activity className="h-4 w-4 text-accent" />
          FastAPI + SQLite
        </div>
      </div>
    </header>
  );
}
