// src/__tests__/e2e.spawn.cli.test.ts (replace file)
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execa } from "execa";
import { makeTmpDir, listFilesRecursive } from "./helpers.js";
import path from "path";
import fs from "fs";

describe("CLI E2E spawn", () => {
  const tree = "root/\n  a.txt\n  dir/\n    b.txt";
  const tmp = makeTmpDir();

  beforeAll(async () => {
    if (!fs.existsSync("dist/index.js")) {
      await execa("npm", ["run", "build"], { stdio: "inherit", timeout: 120_000 });
    }
    await execa(
      "node",
      [
        "dist/index.js",
        path.join(tmp.dir, "proj"),
        "--tree",
        tree,
        "--yes",
        "--detectors",
        "false"
      ],
      {
        stdio: "pipe",
        timeout: 20_000,
        env: { ...process.env, FORGE_TREE_NO_PROMPT: "1" } // headless mode
      }
    );
  });

  afterAll(() => tmp.cleanup());

  // change the assertions to look under proj/root instead of proj
  it("creates files on disk", () => {
    const files = listFilesRecursive(tmp.dir).map((s) => s.replace(/\\/g, "/"));

    // base path is the first directory in the ASCII tree: "root/"
    const base = "proj/root";

    expect(files).toContain(`${base}/a.txt`);
    expect(files).toContain(`${base}/dir/b.txt`);
    expect(files).toContain(`${base}/.gitignore`);
    expect(files).toContain(`${base}/.prettierrc`);
    expect(files).toContain(`${base}/.editorconfig`);
    expect(files).toContain(`${base}/turbo.json`);
  });

});
