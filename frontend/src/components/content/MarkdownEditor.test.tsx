import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { MarkdownEditor } from "./MarkdownEditor";
import { uploadImage } from "../../api/media";
vi.mock("../../api/media", async (importOriginal) => ({ ...await importOriginal<typeof import("../../api/media")>(), uploadImage: vi.fn() }));
vi.mock("./RichContent", () => ({ RichContent: ({content}:{content:string}) => <div>{content}</div> }));
function Editor() { const [value,setValue]=useState("题干草稿"); return <MarkdownEditor label="题干" value={value} onChange={setValue} />; }
describe("image editing",()=> {
  it("preserves text when upload fails",async()=> { vi.mocked(uploadImage).mockRejectedValueOnce(new Error("图片无效")); render(<Editor />); fireEvent.change(screen.getByLabelText("题干上传图片"),{target:{files:[new File(["bad"],"a.png",{type:"image/png"})]}}); await screen.findByRole("alert"); expect((screen.getByLabelText("题干") as HTMLTextAreaElement).value).toBe("题干草稿"); });
  it("does not overwrite newer typing when upload completes",async()=> { let finish!:(value:Awaited<ReturnType<typeof uploadImage>>)=>void; vi.mocked(uploadImage).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})); render(<Editor />); fireEvent.change(screen.getByLabelText("题干上传图片"),{target:{files:[new File(["valid"],"图.png",{type:"image/png"})]}}); fireEvent.change(screen.getByLabelText("题干"),{target:{value:"继续输入的题干"}}); const path=`/api/media/images/${"b".repeat(32)}`; finish({id:"b".repeat(32),url:path,mime_type:"image/png",size_bytes:5,width:1,height:1}); await waitFor(()=>expect((screen.getByLabelText("题干") as HTMLTextAreaElement).value).toBe(`继续输入的题干\n![图](${path})\n`)); });
});
