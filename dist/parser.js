import path from "path";
import { validateTree } from "./validator.js";
function removeMultilineComments(text) {
    // Remove Python-style triple quotes
    text = text.replace(/"""[\s\S]*?"""/g, '');
    text = text.replace(/'''[\s\S]*?'''/g, '');
    // Remove C-style multiline comments
    text = text.replace(/\/\*[\s\S]*?\*\//g, '');
    // Remove hash-style multiline comments (lines starting with #)
    const lines = text.split(/\r?\n/);
    let inHashComment = false;
    const filteredLines = lines.map(line => {
        const trimmed = line.trim();
        // Check for start/end of hash comment block
        if (trimmed === '#' || trimmed === '# ---' || trimmed === '#---') {
            inHashComment = !inHashComment;
            return '';
        }
        // Skip lines in hash comment block
        if (inHashComment) {
            return '';
        }
        return line;
    });
    return filteredLines.join('\n');
}
export function parseTree(text, cfg) {
    // Remove multiline comments first
    text = removeMultilineComments(text);
    const lines = text
        .split(/\r?\n/)
        .map(l => {
        // Remove inline comments
        return l
            .replace(/\/\*.*?\*\//g, '') // Remove inline /* comments */
            .replace(/\/\/.*$/g, '') // Remove // comments
            .replace(/(?<!:)#.*$/g, '') // Remove # comments (but not in URLs like http://)
            .replace(/\s+$/g, ""); // Trim trailing whitespace
    })
        .filter(l => {
        // Skip empty lines and tree guide-only lines
        const trimmed = l.trim();
        if (trimmed.length === 0)
            return false;
        // Skip lines that are only tree guides (│, ├, └, |, +, `, ─)
        if (/^[│├└|+`─\s]+$/.test(trimmed))
            return false;
        return true;
    });
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
        // Build the full path based on the stack
        const pathParts = stack.map(item => item.node.name);
        pathParts.push(clean);
        if (stack.length === 0) {
            // For root nodes
            node.path = clean;
            roots.push(node);
        }
        else {
            // For child nodes
            const parent = stack[stack.length - 1].node;
            node.path = pathParts.join('/');
            parent.children.push(node);
        }
        stack.push({ depth, node });
    }
    // Validate the tree structure
    const errors = validateTree(text, roots);
    const criticalErrors = errors.filter(e => e.type === 'error');
    if (criticalErrors.length > 0) {
        const errorMessages = criticalErrors.map(e => e.line ? `Line ${e.line}: ${e.message}${e.context ? `\n  ${e.context}` : ''}`
            : e.message).join('\n');
        throw new Error(`Invalid tree structure:\n${errorMessages}`);
    }
    // Update all paths to be under targetDir if needed
    if (cfg.pathNormalization?.base === "root") {
        const updatePaths = (node) => {
            // Convert the relative path to be under targetDir
            node.path = path.join(cfg.targetDir, node.path);
            node.children.forEach(updatePaths);
        };
        roots.forEach(updatePaths);
    }
    return roots;
}
function splitDepth(line, unit, cfg) {
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
    }
    else {
        // Handle simple dash/pipe style
        trimmed = trimmed
            .replace(/[-|]/g, " ") // Replace basic tree chars with spaces
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
        // Look for hints in comments
        const commentMatch = rest.match(/(?:\/\/|#|\/*)\s*(.*?)\s*(?:\*\/)?$/);
        if (commentMatch) {
            const beforeComment = rest.slice(0, rest.indexOf(commentMatch[0])).trim();
            return {
                name: beforeComment || rest.trim(), // If no text before comment, use whole line
                hint: commentMatch[1].trim()
            };
        }
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
