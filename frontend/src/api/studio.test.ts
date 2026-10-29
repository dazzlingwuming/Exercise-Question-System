import { afterEach, describe, expect, it, vi } from "vitest";
import { streamStudio, type StudioEvent } from "./studio";

afterEach(() => vi.unstubAllGlobals());
function stream(chunks: string[]) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new ReadableStream({ start(controller) { for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk)); controller.close(); } }), { status: 200 })));
}
describe("studio event transport", () => {
  it("keeps whitespace and accepts frames split across network chunks", async () => {
    stream(['event: delta\r\ndata: {"content":"先 "}', '\r', '\n\r\n', 'event: delta\ndata: {"content":" 后"}\n\nevent: done\ndata: {"message_id":"a"}\n\n']);
    const events: StudioEvent[] = [];
    await streamStudio("c", { connection: { base_url: "http://local/v1", api_key: "", model: "m", supports_images: false }, content: "hi" }, new AbortController().signal, event => events.push(event));
    expect(events.filter(e => e.event === "delta").map(e => e.data.content).join("")).toBe("先  后");
    expect(events[events.length - 1]?.event).toBe("done");
  });
  it("does not mark an unfinished stream successful", async () => {
    stream(['event: delta\ndata: {"content":"partial"}\n\n']);
    await expect(streamStudio("c", { connection: { base_url: "http://local/v1", api_key: "", model: "m", supports_images: false } }, new AbortController().signal, () => undefined)).rejects.toThrow("连接提前结束");
  });
});
