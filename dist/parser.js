import path from "path";
export function parseTree(text, cfg) {
    const lines = text
        .split(/\r?\n/)
        .map((l) => l.replace(/\s+$/g, ""))
        .filter((l) => l.length > 0);
    const stack = [];
    const roots = [];
    const unit = cfg.detectAsciiGuides ? detectIndentUnit(lines, cfg) : "  ";
    for (const raw of lines) {
        const { depth, name, hint } = splitDepth(raw, unit, cfg);
        const kind = name.endsWith("/") || name.includes(".") ? "file" : "dir";
        const clean = name.replace(/\/$/, "");
        const node = {
            name: clean,
            path: "",
            kind: kind === "file" && !clean.includes(".") ? "dir" : kind,
            children: [],
            hint
        };
        while (stack.length && stack[stack.length - 1].depth >= depth)
            stack.pop();
        if (stack.length === 0) {
            node.path = path.join(cfg.targetDir, clean);
            roots.push(node);
            stack.push({ depth, node });
        }
        else {
            const parent = stack[stack.length - 1].node;
            node.path = path.join(parent.path, clean);
            parent.children.push(node);
            stack.push({ depth, node });
        }
    }
    return roots;
}
function splitDepth(line, unit, cfg) {
    const guides = cfg.detectAsciiGuides ? /[│├└─]/g : null;
    let trimmed = line;
    if (guides)
        trimmed = trimmed.replace(guides, " ");
    trimmed = trimmed.replace(/#+\s.*$/, (m) => " " + m); // keep hint
    const m = trimmed.match(/^(\s*)(.*)$/);
    const spaces = m ? m[1].length : 0;
    const rest = m ? m[2] : line;
    const depth = Math.floor(spaces / unit.length);
    const { name, hint } = (() => {
        const parts = rest.split(/\s+#\s(.*)/);
        if (parts.length > 1)
            return { name: parts[0].trim(), hint: parts[1].trim() };
        return { name: rest.trim(), hint: undefined };
    })();
    return { depth, name, hint };
}
function detectIndentUnit(lines, cfg) {
    for (const l of lines) {
        const m = l.match(/^(\s+)/);
        if (m) {
            const size = cfg.tabIndentationSize || 2;
            return " ".repeat(size);
        }
    }
    return "  ";
}
