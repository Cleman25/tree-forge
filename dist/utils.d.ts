import type { ForgeConfig, PlanAction } from "./types.js";
export declare function ensureDir(p: string): Promise<void>;
export declare function writeFileSafe(p: string, content: string): Promise<void>;
export declare function which(bin: string): boolean;
export declare function detectPM(preferred?: ForgeConfig["packageManager"]): NonNullable<ForgeConfig["packageManager"]>;
export declare function pmArgs(pm: NonNullable<ForgeConfig["packageManager"]>): {
    init: readonly ["pnpm", readonly ["init", "-y"]];
    add: (pkgs: string[], flags?: string[]) => readonly ["pnpm", readonly ["add", ...string[]]];
    addD: (pkgs: string[], flags?: string[]) => readonly ["pnpm", readonly ["add", "-D", ...string[]]];
    install: readonly ["pnpm", readonly ["install"]];
} | {
    init: readonly ["yarn", readonly ["init", "-y"]];
    add: (pkgs: string[], flags?: string[]) => readonly ["yarn", readonly ["add", ...string[]]];
    addD: (pkgs: string[], flags?: string[]) => readonly ["yarn", readonly ["add", "-D", ...string[]]];
    install: readonly ["yarn", readonly []];
} | {
    init: readonly ["npm", readonly ["init", "-y"]];
    add: (pkgs: string[], flags?: string[]) => readonly ["npm", readonly ["install", ...string[]]];
    addD: (pkgs: string[], flags?: string[]) => readonly ["npm", readonly ["install", "-D", ...string[]]];
    install: readonly ["npm", readonly ["install"]];
};
export declare function run(action: PlanAction, logger?: any): Promise<void>;
export declare function applyPlan(plan: PlanAction[], dryRun: boolean, logger?: any): Promise<void>;
