import type { ForgeConfig, PlanAction, TreeNode } from "./types.js";
export declare function planFromTree(nodes: TreeNode[], cfg: ForgeConfig): PlanAction[];
export declare function loadTreeSource(cfg: ForgeConfig): Promise<string>;
