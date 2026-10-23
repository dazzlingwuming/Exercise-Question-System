import {
  BarChart3,
  BookOpen,
  FilePlus2,
  History,
  Import,
  LayoutDashboard,
  PenLine,
  Trash2,
} from "lucide-react";
import { Fragment } from "react";
import { NavLink } from "react-router-dom";
import { BrandMark } from "./BrandMark";

export const navItems = [
  { to: "/", label: "学习首页", icon: LayoutDashboard },
  { to: "/practice", label: "开始练习", icon: PenLine },
  { to: "/questions", label: "我的题库", icon: BookOpen },
  { to: "/review", label: "错题复习", icon: History },
  { to: "/stats", label: "学习统计", icon: BarChart3 },
  { to: "/import", label: "导入题库", icon: Import },
  { to: "/questions/new", label: "新增题目", icon: FilePlus2 },
  { to: "/questions/deleted", label: "回收站", icon: Trash2 },
];

/**
 * 悬浮玻璃 Dock：替代传统侧边栏，把导航压缩成一条竖排图标栏，
 * 让主内容区拿到接近整屏的宽度。移动端自动变成底部横排。
 */
export function Dock() {
  return (
    <nav aria-label="主导航" className="dock">
      <span className="mb-1 hidden lg:block">
        <BrandMark size={40} />
      </span>
      <span aria-hidden="true" className="mb-1 hidden h-px w-6 bg-line lg:block" />

      {navItems.map((item, index) => (
        <Fragment key={item.to}>
          {index === 5 && <span aria-hidden="true" className="mx-1 hidden h-px w-5 bg-line lg:block" />}
          <NavLink
            to={item.to}
            end={item.to === "/" || item.to === "/questions"}
            className={({ isActive }) => `dock-item ${isActive ? "is-active" : ""}`}
            aria-label={item.label}
          >
            <item.icon className="h-[19px] w-[19px]" aria-hidden="true" />
            <span className="dock-tip" aria-hidden="true">
              {item.label}
            </span>
          </NavLink>
        </Fragment>
      ))}
    </nav>
  );
}
