import type { Detector, ForgeConfig, TreeNode } from "./types.js";
export declare function askGlobalOptions(defaults: Partial<ForgeConfig>): Promise<Pick<ForgeConfig, "runDetectors" | "generateDotfiles">>;
export declare function chooseDetectors(applicable: Detector[]): Promise<string[]>;
export declare function confirmPlan(steps: number, yes: boolean): Promise<boolean>;
export declare function askPerNode(_node: TreeNode, _id: string): Promise<any>;
