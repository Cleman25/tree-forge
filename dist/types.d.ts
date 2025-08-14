export type TreeStyle = {
    indent: string;
    vertical: string;
    horizontal: string;
    corner: string;
    branch: string;
};
export type ForgeConfig = {
    targetDir: string;
    treeText?: string;
    treeFile?: string;
    dryRun: boolean;
    yes: boolean;
    packageManager?: "pnpm" | "yarn" | "npm";
    tabIndentationSize: number;
    detectAsciiGuides: boolean;
    runDetectors: boolean;
    generateDotfiles: boolean;
    cwd: string;
    treeStyle?: TreeStyle;
    overwriteMode?: "ask" | "skip" | "force";
    skipExisting?: boolean;
    preserveGitIgnore?: boolean;
    preservePackageJson?: boolean;
    preserveConfig?: boolean;
    logLevel?: "silent" | "error" | "warn" | "info" | "debug";
    templateDir?: string;
    variables?: Record<string, string>;
};
export type NodeKind = "dir" | "file";
export type TreeNode = {
    name: string;
    path: string;
    kind: NodeKind;
    children: TreeNode[];
    hint?: string;
};
export type PlanAction = {
    type: "mkdir";
    path: string;
} | {
    type: "write";
    path: string;
    content: string;
} | {
    type: "ensurePkg";
    path: string;
    name?: string;
} | {
    type: "exec";
    cwd: string;
    cmd: string;
    args: string[];
    env?: Record<string, string>;
};
export type GeneratorResult = {
    actions: PlanAction[];
    description: string;
};
export type Detector = {
    id: string;
    match: (node: TreeNode) => boolean;
    prompt: (node: TreeNode) => Promise<boolean>;
    generate: (node: TreeNode, cfg: ForgeConfig) => Promise<GeneratorResult>;
};
