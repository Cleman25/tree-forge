import { existsSync } from "fs";
import { promises as fs } from "fs";
import path from "path";
import { execa } from "execa";
import chalk from "chalk";
export async function ensureDir(p) {
    await fs.mkdir(p, { recursive: true });
}
export async function writeFileSafe(p, content) {
    await ensureDir(path.dirname(p));
    await fs.writeFile(p, content, "utf8");
}
export function which(bin) {
    const exts = process.platform === "win32" ? [".cmd", ".exe", ""] : [""];
    for (const ext of exts) {
        try {
            // eslint-disable-next-line no-new
            new URL("file://" + process.execPath);
        }
        catch { }
    }
    const PATH = process.env.PATH || "";
    for (const dir of PATH.split(path.delimiter)) {
        const full = path.join(dir, bin);
        if (existsSync(full))
            return true;
        if (existsSync(full + ".cmd"))
            return true;
        if (existsSync(full + ".exe"))
            return true;
    }
    return false;
}
export function detectPM(preferred) {
    if (preferred)
        return preferred;
    if (which("pnpm"))
        return "pnpm";
    if (which("yarn"))
        return "yarn";
    return "npm";
}
export function pmArgs(pm) {
    if (pm === "pnpm") {
        return {
            init: ["pnpm", ["init", "-y"]],
            add: (pkgs, flags = []) => ["pnpm", ["add", ...pkgs, ...flags]],
            addD: (pkgs, flags = []) => ["pnpm", ["add", "-D", ...pkgs, ...flags]],
            install: ["pnpm", ["install"]]
        };
    }
    if (pm === "yarn") {
        return {
            init: ["yarn", ["init", "-y"]],
            add: (pkgs, flags = []) => ["yarn", ["add", ...pkgs, ...flags]],
            addD: (pkgs, flags = []) => ["yarn", ["add", "-D", ...pkgs, ...flags]],
            install: ["yarn", []]
        };
    }
    return {
        init: ["npm", ["init", "-y"]],
        add: (pkgs, flags = []) => ["npm", ["install", ...pkgs, ...flags]],
        addD: (pkgs, flags = []) => ["npm", ["install", "-D", ...pkgs, ...flags]],
        install: ["npm", ["install"]]
    };
}
export async function run(action) {
    if (action.type === "mkdir") {
        await ensureDir(action.path);
        return;
    }
    if (action.type === "write") {
        await writeFileSafe(action.path, action.content);
        return;
    }
    if (action.type === "ensurePkg") {
        if (!existsSync(action.path)) {
            await ensureDir(path.dirname(action.path));
            await writeFileSafe(action.path, JSON.stringify({
                name: action.name || path.basename(path.dirname(action.path)),
                version: "0.0.0",
                private: true
            }, null, 2) + "\n");
        }
        return;
    }
    if (action.type === "exec") {
        await execa(action.cmd, action.args, { cwd: action.cwd, stdio: "inherit", env: action.env });
    }
}
export async function applyPlan(plan, dryRun) {
    for (const step of plan) {
        if (dryRun) {
            const desc = step.type === "mkdir"
                ? `mkdir ${step.path}`
                : step.type === "write"
                    ? `write ${step.path} (${step.content.length} bytes)`
                    : step.type === "ensurePkg"
                        ? `ensure package.json at ${step.path}`
                        : `exec ${step.cmd} ${step.args.join(" ")} (cwd=${step.cwd})`;
            // eslint-disable-next-line no-console
            console.log(chalk.gray("•"), desc);
        }
        else {
            await run(step);
        }
    }
}
