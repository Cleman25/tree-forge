import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import path from "path";
import { makeTmpDir } from "./helpers.js";

// mock prompts to avoid TTY
vi.mock("prompts", () => {
  return {
    default: async (q: any) => {
      if (Array.isArray(q)) return { runDetectors: false, generateDotfiles: true };
      if (q?.name === "picked") return { picked: [] };
      if (q?.name === "ok") return { ok: true };
      if (q?.name === "go") return { go: true };
      return {};
    }
  };
});

// prevent process.exit
const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
  throw new Error("process.exit:" + code);
}) as any);

describe("CLI index (headless, mocked)", () => {
  let tmp: ReturnType<typeof makeTmpDir>;

  beforeEach(() => {
    tmp = makeTmpDir();
  });

  afterEach(() => {
    tmp.cleanup();
    vi.resetModules();
  });

  it("runs without prompting and performs dry-run plan", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // set argv directly for yargs
    process.argv = [
      "node",
      "cli",
      path.join(tmp.dir, "play"),
      "--tree",
      "root/\n  file.txt",
      "--detectors",
      "false",
      "--yes",
      "--dry-run"
    ];

    await import("../index.js").catch((e) => {
      if (!String(e?.message || "").startsWith("process.exit:")) throw e;
    });

    const outputRaw = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    const output = outputRaw.replace(/\\/g, "/"); // normalize Windows paths

    expect(output).toMatch(/mkdir .*\/play\/root/);
    expect(output).toMatch(/write .*\/play\/root\/file.txt/);

    logSpy.mockRestore();
  });
});

afterAll(() => {
  exitSpy.mockRestore();
});
