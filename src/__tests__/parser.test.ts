// src/__tests__/parser.test.ts
import { describe, it, expect } from "vitest";
import { parseTree } from "../parser.js";
import type { ForgeConfig } from "../types.js";
import path from "path";

const baseCfg = (targetDir: string): ForgeConfig => ({
  cwd: process.cwd(),
  targetDir,
  treeText: "",
  treeFile: undefined,
  dryRun: true,
  yes: true,
  packageManager: "npm",
  tabIndentationSize: 2,
  detectAsciiGuides: true,
  runDetectors: false,
  generateDotfiles: false
});

describe("parseTree", () => {
  it("parses a simple indented tree", () => {
    const text = [
      "root/",
      "  apps/",
      "    web/",
      "      package.json",
      "  packages/",
      "    utils/",
      "      src/index.ts"
    ].join("\n");

    const cfg = baseCfg("/tmp/any");
    const nodes = parseTree(text, { ...cfg, treeText: text });
    expect(nodes.length).toBe(1);
    expect(nodes[0].name).toBe("root");
    expect(nodes[0].children[0].name).toBe("apps");
    expect(nodes[0].children[0].children[0].name).toBe("web");
    expect(nodes[0].children[0].children[0].children[0].name).toBe("package.json");
  });

  it("ignores ASCII guides and respects tabIndentationSize", () => {
    const text = [
      "project/",
      "├─ apps/",
      "│  └─ web/",
      "│     └─ package.json",
      "└─ packages/",
      "   └─ utils/",
      "      └─ src/index.ts"
    ].join("\n");

    const cfg = baseCfg("/tmp/any");
    const nodes = parseTree(text, { ...cfg, treeText: text, detectAsciiGuides: true, tabIndentationSize: 2 });
    expect(nodes[0].name).toBe("project");
    expect(nodes[0].children[0].name).toBe("apps");
    expect(nodes[0].children[0].children[0].name).toBe("web");
    expect(nodes[0].children[1].name).toBe("packages");
    expect(nodes[0].children[1].children[0].name).toBe("utils");
  });
});
