// src/__tests__/applyPlan.dryrun.test.ts
import { describe, it, expect, vi } from "vitest";
import { applyPlan } from "../utils.js";
import type { PlanAction } from "../types.js";

describe("applyPlan in dry-run mode", () => {
  it("prints actions but does not execute them", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const plan: PlanAction[] = [
      { type: "mkdir", path: "/tmp/x/a" },
      { type: "write", path: "/tmp/x/a/file.txt", content: "hello" },
      { type: "exec", cwd: "/tmp/x", cmd: "echo", args: ["hi"] }
    ];
    await applyPlan(plan, true);
    const output = spy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toMatch(/mkdir \/tmp\/x\/a/);
    expect(output).toMatch(/write \/tmp\/x\/a\/file.txt/);
    expect(output).toMatch(/exec echo hi/);
    spy.mockRestore();
  });
});
