import { existsSync } from "fs";
import { promises as fs } from "fs";
import path from "path";
import { execa } from "execa";
import chalk from "chalk";
import type { ForgeConfig, PlanAction } from "./types.js";

export async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

export async function writeFileSafe(p: string, content: string) {
  await ensureDir(path.dirname(p));
  await fs.writeFile(p, content, "utf8");
}

export function which(bin: string) {
  const exts = process.platform === "win32" ? [".cmd", ".exe", ""] : [""];
  for (const ext of exts) {
    try {
      // eslint-disable-next-line no-new
      new URL("file://" + process.execPath);
    } catch {}
  }
  const PATH = process.env.PATH || "";
  for (const dir of PATH.split(path.delimiter)) {
    const full = path.join(dir, bin);
    if (existsSync(full)) return true;
    if (existsSync(full + ".cmd")) return true;
    if (existsSync(full + ".exe")) return true;
  }
  return false;
}

export function detectPM(preferred?: ForgeConfig["packageManager"]): NonNullable<ForgeConfig["packageManager"]> {
  if (preferred) return preferred;
  if (which("pnpm")) return "pnpm";
  if (which("yarn")) return "yarn";
  return "npm";
}

export function pmArgs(pm: NonNullable<ForgeConfig["packageManager"]>) {
  if (pm === "pnpm") {
    return {
      init: ["pnpm", ["init", "-y"]] as const,
      add: (pkgs: string[], flags: string[] = []) => ["pnpm", ["add", ...pkgs, ...flags]] as const,
      addD: (pkgs: string[], flags: string[] = []) => ["pnpm", ["add", "-D", ...pkgs, ...flags]] as const,
      install: ["pnpm", ["install"]] as const
    };
  }
  if (pm === "yarn") {
    return {
      init: ["yarn", ["init", "-y"]] as const,
      add: (pkgs: string[], flags: string[] = []) => ["yarn", ["add", ...pkgs, ...flags]] as const,
      addD: (pkgs: string[], flags: string[] = []) => ["yarn", ["add", "-D", ...pkgs, ...flags]] as const,
      install: ["yarn", []] as const
    };
  }
  return {
    init: ["npm", ["init", "-y"]] as const,
    add: (pkgs: string[], flags: string[] = []) => ["npm", ["install", ...pkgs, ...flags]] as const,
    addD: (pkgs: string[], flags: string[] = []) => ["npm", ["install", "-D", ...pkgs, ...flags]] as const,
    install: ["npm", ["install"]] as const
  };
}

export async function run(action: PlanAction) {
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
      await writeFileSafe(
        action.path,
        JSON.stringify(
          {
            name: action.name || path.basename(path.dirname(action.path)),
            version: "0.0.0",
            private: true
          },
          null,
          2
        ) + "\n"
      );
    }
    return;
  }
  if (action.type === "exec") {
    await execa(action.cmd, action.args, { cwd: action.cwd, stdio: "inherit", env: action.env });
  }
}

export async function applyPlan(plan: PlanAction[], dryRun: boolean) {
  for (const step of plan) {
    if (dryRun) {
      const desc =
        step.type === "mkdir"
          ? `mkdir ${step.path}`
          : step.type === "write"
          ? `write ${step.path} (${step.content.length} bytes)`
          : step.type === "ensurePkg"
          ? `ensure package.json at ${step.path}`
          : `exec ${step.cmd} ${step.args.join(" ")} (cwd=${step.cwd})`;
      // eslint-disable-next-line no-console
      console.log(chalk.gray("•"), desc);
    } else {
      await run(step);
    }
  }
}
