import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { CommandPalette } from "./CommandPalette";
import { Dialog } from "../common/Dialog";
import { Dock } from "./Dock";
import { Topbar } from "./Topbar";

export function AppLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); setPaletteOpen(value => !value);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
  return <div className="workspace">
    <a className="skip-link" href="#main-content">跳到主内容</a>
    <div className="desktop-navigation"><Dock /></div>
    <div className="app-shell">
      <Topbar onOpenPalette={() => setPaletteOpen(true)} onOpenMenu={() => setMenuOpen(true)} />
      <main id="main-content" tabIndex={-1} key={pathname} className="workspace-main animate-rise">{children}</main>
    </div>
    <Dialog open={menuOpen} title="导航" onClose={() => setMenuOpen(false)} className="max-w-sm">
      <button className="btn-ghost w-full justify-end" onClick={() => setMenuOpen(false)}>关闭导航</button>
      <Dock onNavigate={() => setMenuOpen(false)} />
    </Dialog>
    <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
  </div>;
}
