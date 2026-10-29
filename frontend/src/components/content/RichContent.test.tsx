import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RichContent } from "./RichContent";
import { API_BASE } from "../../api/client";
vi.mock("./MermaidDiagram", () => ({ MermaidDiagram: ({source}: {source:string}) => <div>{source}</div> }));
const path = `/api/media/images/${"a".repeat(32)}`;
describe("managed question images", () => {
  it("renders a managed image from API origin, enlarges it, and excludes outside images/raw HTML", () => {
    const view=render(<RichContent content={`![示意图](${path})\n\n![外部](https://outside.example/track.png)\n\n<script>alert(1)</script>\n\n$E=mc^2$`} />);
    expect(screen.getByAltText("示意图").getAttribute("src")).toBe(`${new URL(API_BASE, window.location.href).origin}${path}`);
    expect(screen.queryByAltText("外部")).toBeNull(); expect(view.container.querySelector("script")).toBeNull(); expect(view.container.querySelector(".katex")).not.toBeNull();
    fireEvent.click(screen.getByRole("button",{name:"放大图片：示意图"})); expect(screen.getByRole("dialog")).toBeTruthy(); fireEvent.click(screen.getByText("关闭图片")); expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("keeps model output image rendering disabled", () => { render(<RichContent allowImages={false} content={`![模型图](${path})`} />); expect(screen.queryByRole("img")).toBeNull(); });
});
