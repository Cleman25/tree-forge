import { promises as fs } from "fs";
import path from "path";
import type { ForgeConfig, PlanAction, TreeNode } from "./types.js";
import { editorconfig, gitignore, prettierrc, turbo } from "./templates.js";
import { Logger } from "./logger.js";

// modify planFromTree to compute a proper dotfiles root
export function planFromTree(nodes: TreeNode[], cfg: ForgeConfig) {
  const plan: PlanAction[] = [];
  const logger = new Logger(cfg.logging, cfg.targetDir);

  const visit = (node: TreeNode) => {
    if (node.kind === "dir") {
      plan.push({ type: "mkdir", path: node.path });
      logger.logDirectoryCreated(node.path);
    } else {
      plan.push({ type: "write", path: node.path, content: defaultContent(node) });
      logger.logFileCreated(node.path);
    }
    for (const ch of node.children) visit(ch);
  };
  for (const r of nodes) visit(r);

  // choose where to place repo-level files
  const repoRoot =
    nodes.length === 1 && nodes[0].kind === "dir" ? nodes[0].path : cfg.targetDir;

  if (cfg.generateDotfiles) {
    const dotfiles = [
      { name: ".gitignore", content: gitignore },
      { name: ".prettierrc", content: prettierrc },
      { name: ".editorconfig", content: editorconfig }
    ];

    for (const dotfile of dotfiles) {
      const filePath = path.join(repoRoot, dotfile.name);
      plan.push({ type: "write", path: filePath, content: dotfile.content });
      logger.logFileCreated(filePath);
    }
  }

  const hasTurbo =
    nodes.some((n) => n.name === "turbo.json") ||
    nodes.some((n) => n.children.some((c) => c.name === "turbo.json"));

  if (!hasTurbo) {
    const turboPath = path.join(repoRoot, "turbo.json");
    plan.push({ type: "write", path: turboPath, content: turbo });
    logger.logFileCreated(turboPath);
  }

  return plan;
}


function defaultContent(node: TreeNode) {
  if (node.name.endsWith(".json")) return "{}\n";
  if (node.name.endsWith(".ts") || node.name.endsWith(".tsx")) return "";
  if (node.name.endsWith(".yaml") || node.name.endsWith(".yml")) return "---\n";
  if (node.name.startsWith(".")) return "";
  return "";
}

export async function loadTreeSource(cfg: ForgeConfig) {
  const logger = new Logger(cfg.logging, cfg.targetDir);
  try {
    if (cfg.treeText) {
      logger.info('Loading tree from text input');
      return cfg.treeText;
    }
    if (cfg.treeFile) {
      logger.info('Loading tree from file', { target: cfg.treeFile });
      const content = await fs.readFile(cfg.treeFile, "utf8");
      logger.info('Tree file loaded successfully', {
        metadata: {
          size: content.length,
          lines: content.split('\n').length
        }
      });
      return content;
    }
    logger.warn('No tree source provided');
    return "";
  } catch (error) {
    logger.error('Failed to load tree source', {
      error: error instanceof Error ? error.message : String(error),
      metadata: {
        treeFile: cfg.treeFile,
        stack: error instanceof Error ? error.stack : undefined
      }
    });
    throw error;
  }
}
