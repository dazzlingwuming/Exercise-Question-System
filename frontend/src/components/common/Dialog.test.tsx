import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./Dialog";
describe("Dialog", () => { it("traps focus, closes on Escape, and restores the trigger", async () => {
  const close = vi.fn(); const trigger = document.createElement("button"); document.body.append(trigger); trigger.focus();
  const view = render(<Dialog open title="Test dialog" onClose={close}><button>First</button><button>Last</button></Dialog>);
  await waitFor(() => expect(document.activeElement).toBe(screen.getByText("First")));
  screen.getByText("Last").focus(); fireEvent.keyDown(screen.getByText("Last"), { key: "Tab" }); expect(document.activeElement).toBe(screen.getByText("First"));
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" }); expect(close).toHaveBeenCalledOnce();
  view.unmount(); expect(document.activeElement).toBe(trigger); trigger.remove();
}); });
