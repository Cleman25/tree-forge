import { ForgeConfig, TreeNode } from "./types.js";
import path from "path";

export function parseTree(text: string, cfg: ForgeConfig): TreeNode[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/g, ""))
    .filter((l) => l.length > 0);
  const stack: { depth: number; node: TreeNode }[] = [];
  const roots: TreeNode[] = [];
  const unit = cfg.detectAsciiGuides ? detectIndentUnit(lines, cfg) : "  ";
  for (const raw of lines) {
    const { depth, name, hint } = splitDepth(raw, unit, cfg);
    const kind: "dir" | "file" = name.endsWith("/") || name.includes(".") ? "file" : "dir";
    const clean = name.replace(/\/$/, "");
    const node: TreeNode = {
      name: clean,
      path: "",
      kind: kind === "file" && !clean.includes(".") ? "dir" : kind,
      children: [],
      hint
    };
    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
    if (stack.length === 0) {
      node.path = path.join(cfg.targetDir, clean);
      roots.push(node);
      stack.push({ depth, node });
    } else {
      const parent = stack[stack.length - 1].node;
      node.path = path.join(parent.path, clean);
      parent.children.push(node);
      stack.push({ depth, node });
    }
  }
  return roots;
}

function splitDepth(line: string, unit: string, cfg: ForgeConfig) {
  const style = cfg.treeStyle || {
    vertical: "│",
    horizontal: "─",
    corner: "└",
    branch: "├",
    indent: unit
  };

  // Create a regex pattern that matches any of the tree style characters
  const guides = cfg.detectAsciiGuides
    ? new RegExp(`[${style.vertical}${style.branch}${style.corner}${style.horizontal}]`, "g")
    : null;

  let trimmed = line;
  
  // Handle different tree styles
  if (guides) {
    trimmed = trimmed.replace(guides, " ");
  } else {
    // Handle simple dash/pipe style
    trimmed = trimmed
      .replace(/[-|]/g, " ")  // Replace basic tree chars with spaces
      .replace(/[+`]/g, " "); // Handle alternative corner chars
  }

  trimmed = trimmed.replace(/#+\s.*$/, (m) => " " + m); // keep hint
  
  // Handle special case where line starts with tree characters
  const treeStart = line.match(/^[-+|`]/) ? 1 : 0;
  
  const m = trimmed.match(/^(\s*)(.*)$/);
  const spaces = m ? m[1].length + treeStart : 0;
  const rest = m ? m[2] : line;
  
  // Calculate depth based on either spaces or tree characters
  const depth = guides
    ? Math.floor(spaces / unit.length)
    : (line.match(/[-|]/g) || []).length;

  const { name, hint } = (() => {
    const parts = rest.split(/\s+#\s(.*)/);
    if (parts.length > 1) return { name: parts[0].trim(), hint: parts[1].trim() };
    return { name: rest.trim(), hint: undefined as string | undefined };
  })();

  return { depth, name, hint };
}

function detectIndentUnit(lines: string[], cfg: ForgeConfig) {
  for (const l of lines) {
    const m = l.match(/^(\s+)/);
    if (m) {
      const size = cfg.tabIndentationSize || 2;
      return " ".repeat(size);
    }
  }
  return "  ";
}
