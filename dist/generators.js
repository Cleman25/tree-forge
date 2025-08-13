import { promises as fs } from "fs";
import path from "path";
import { editorconfig, gitignore, prettierrc, turbo } from "./templates.js";
// modify planFromTree to compute a proper dotfiles root
export function planFromTree(nodes, cfg) {
    const plan = [];
    const visit = (node) => {
        if (node.kind === "dir")
            plan.push({ type: "mkdir", path: node.path });
        else
            plan.push({ type: "write", path: node.path, content: defaultContent(node) });
        for (const ch of node.children)
            visit(ch);
    };
    for (const r of nodes)
        visit(r);
    // choose where to place repo-level files
    const repoRoot = nodes.length === 1 && nodes[0].kind === "dir" ? nodes[0].path : cfg.targetDir;
    if (cfg.generateDotfiles) {
        plan.push({ type: "write", path: path.join(repoRoot, ".gitignore"), content: gitignore });
        plan.push({ type: "write", path: path.join(repoRoot, ".prettierrc"), content: prettierrc });
        plan.push({ type: "write", path: path.join(repoRoot, ".editorconfig"), content: editorconfig });
    }
    const hasTurbo = nodes.some((n) => n.name === "turbo.json") ||
        nodes.some((n) => n.children.some((c) => c.name === "turbo.json"));
    if (!hasTurbo) {
        plan.push({ type: "write", path: path.join(repoRoot, "turbo.json"), content: turbo });
    }
    return plan;
}
function defaultContent(node) {
    if (node.name.endsWith(".json"))
        return "{}\n";
    if (node.name.endsWith(".ts") || node.name.endsWith(".tsx"))
        return "";
    if (node.name.endsWith(".yaml") || node.name.endsWith(".yml"))
        return "---\n";
    if (node.name.startsWith("."))
        return "";
    return "";
}
export async function loadTreeSource(cfg) {
    if (cfg.treeText)
        return cfg.treeText;
    if (cfg.treeFile)
        return await fs.readFile(cfg.treeFile, "utf8");
    return "";
}
