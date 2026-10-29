import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseAiQuestionDraft } from "../../api/ai";
import { uploadImage, type ManagedImage } from "../../api/media";
import { AiQuestionParseDialog } from "./AiQuestionParseDialog";

vi.mock("../../api/ai", () => ({ parseAiQuestionDraft: vi.fn() }));
vi.mock("../../api/media", async original => ({ ...await original<typeof import("../../api/media")>(), uploadImage: vi.fn() }));
const asset: ManagedImage = { id: "a".repeat(32), url: `/api/media/images/${"a".repeat(32)}`, mime_type: "image/png", size_bytes: 20, width: 20, height: 20 };
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); });

describe("image question extraction", () => {
  it("waits for upload, sends image-only input and lets the user review before applying", async () => {
    let finish!: (image: ManagedImage) => void;
    vi.mocked(uploadImage).mockReturnValue(new Promise(resolve => { finish = resolve; }));
    vi.mocked(parseAiQuestionDraft).mockResolvedValue({ candidate: { type: "short_answer", stem: "求斜边", difficulty: "2", options: [], tags: [], directions: [], exam_points: [], standard_answer: "5" }, issues: [], parser_version: "v1", model: "deepseek-flash", image_count: 1 });
    const apply = vi.fn();
    render(<AiQuestionParseDialog open typeOptions={[["short_answer", "简答题"]]} onClose={vi.fn()} onApply={apply} />);
    fireEvent.change(screen.getByLabelText("添加图片附件"), { target: { files: [new File(["png"], "photo.png", { type: "image/png" })] } });
    expect((screen.getByRole("button", { name: "解析草稿" }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => finish(asset));
    fireEvent.click(screen.getByRole("button", { name: "解析草稿" }));
    await screen.findByText("求斜边");
    expect(parseAiQuestionDraft).toHaveBeenCalledWith(expect.objectContaining({ source_text: "", image_ids: [asset.id], keep_source_images: false, vision_model: "deepseek-flash" }));
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "应用到表单" }));
    expect(apply).toHaveBeenCalledOnce();
    fireEvent.change(screen.getByLabelText("预期题型"), { target: { value: "short_answer" } });
    await waitFor(() => expect(screen.queryByText("应用到表单")).toBeNull());
  });
  it("accepts pasted screenshots and keeps the input after a model error", async () => {
    vi.mocked(uploadImage).mockResolvedValue(asset);
    vi.mocked(parseAiQuestionDraft).mockRejectedValue(new Error("图片模型未配置"));
    render(<AiQuestionParseDialog open typeOptions={[]} onClose={vi.fn()} onApply={vi.fn()} />);
    fireEvent.paste(screen.getByLabelText("原始文本"), { clipboardData: { files: [new File(["png"], "paste.png", { type: "image/png" })] } });
    await screen.findByAltText("附图 1");
    await waitFor(() => expect((screen.getByRole("button", { name: "解析草稿" }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "解析草稿" }));
    await screen.findByRole("alert");
    expect(screen.getByAltText("附图 1")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("图片模型未配置");
  });
});
