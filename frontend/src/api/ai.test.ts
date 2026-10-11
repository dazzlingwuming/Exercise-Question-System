import { afterEach, describe, expect, it, vi } from "vitest";
import { sendAiMessageStream } from "./ai";
afterEach(() => vi.unstubAllGlobals());
describe("AI stream failure",()=> {
  it("rejects an SSE terminal error with its actionable message",async()=> { vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response('data: {"type":"error","error_code":"AI_VISION_UNSUPPORTED","message":"当前模型不支持图片"}\n\n',{status:200}))); const event=vi.fn(); await expect(sendAiMessageStream("q","问题",{},undefined,event)).rejects.toThrow("当前模型不支持图片"); expect(event).toHaveBeenCalledWith(expect.objectContaining({type:"error"})); });
  it("reads structured HTTP errors without exposing JSON to the user",async()=> { vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({detail:{error:"AI_IMAGE_UNAVAILABLE",message:"题目图片暂时不可用"}}),{status:400}))); await expect(sendAiMessageStream("q","问题",{},undefined,vi.fn())).rejects.toThrow("题目图片暂时不可用"); });
});
