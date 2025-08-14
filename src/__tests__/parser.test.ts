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
  generateDotfiles: false,
  quiet: false
});

describe("parseTree", () => {
  it("parses a simple indented tree with correct paths", () => {
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
    expect(nodes[0].path).toBe("root");
    expect(nodes[0].children[0].name).toBe("apps");
    expect(nodes[0].children[0].path).toBe("root/apps");
    expect(nodes[0].children[0].children[0].name).toBe("web");
    expect(nodes[0].children[0].children[0].path).toBe("root/apps/web");
    expect(nodes[0].children[0].children[0].children[0].name).toBe("package.json");
    expect(nodes[0].children[0].children[0].children[0].path).toBe("root/apps/web/package.json");
  });

  it("ignores ASCII guides and builds correct paths", () => {
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
    expect(nodes[0].path).toBe("project");
    expect(nodes[0].children[0].name).toBe("apps");
    expect(nodes[0].children[0].path).toBe("project/apps");
    expect(nodes[0].children[0].children[0].name).toBe("web");
    expect(nodes[0].children[0].children[0].path).toBe("project/apps/web");
    expect(nodes[0].children[1].name).toBe("packages");
    expect(nodes[0].children[1].path).toBe("project/packages");
    expect(nodes[0].children[1].children[0].name).toBe("utils");
    expect(nodes[0].children[1].children[0].path).toBe("project/packages/utils");
  });

  it("handles comments in tree structure", () => {
    const text = [
      "project/ # Root directory",
      "├─ apps/ /* Apps directory */",
      "│  └─ web/ // Web app",
      "│     └─ package.json",
      "└─ packages/ # Shared packages",
      "   └─ utils/ /* Utilities */",
      "      └─ src/index.ts"
    ].join("\n");

    const cfg = baseCfg("/tmp/any");
    const nodes = parseTree(text, { ...cfg, treeText: text });
    expect(nodes[0].name).toBe("project");
    expect(nodes[0].path).toBe("project");
    expect(nodes[0].children[0].path).toBe("project/apps");
    expect(nodes[0].children[0].children[0].path).toBe("project/apps/web");
  });

  it("throws error on invalid tree structure", () => {
    const text = [
      "root/",
      "  folder/",
      "    file.txt",
      "  folder/",  // Duplicate path
      "    file.txt"  // Duplicate path
    ].join("\n");

    const cfg = baseCfg("/tmp/any");
    expect(() => parseTree(text, { ...cfg, treeText: text }))
      .toThrow("Invalid tree structure");
  });

  it("handles empty lines and whitespace", () => {
    const text = [
      "",
      "root/",
      "",
      "  apps/",
      "    ",
      "    web/",
      "      package.json",
      "",
      "  packages/",
      "    utils/",
      "      src/index.ts",
      "    "
    ].join("\n");

    const cfg = baseCfg("/tmp/any");
    const nodes = parseTree(text, { ...cfg, treeText: text });
    expect(nodes[0].path).toBe("root");
    expect(nodes[0].children[0].path).toBe("root/apps");
    expect(nodes[0].children[0].children[0].path).toBe("root/apps/web");
  });

  it("respects target directory in paths", () => {
    const text = [
      "root/",
      "  file.txt"
    ].join("\n");

    const cfg = baseCfg("/custom/target");
    const nodes = parseTree(text, { ...cfg, treeText: text });
    expect(nodes[0].path).toBe("root");
    expect(nodes[0].children[0].path).toBe("root/file.txt");
  });
});
