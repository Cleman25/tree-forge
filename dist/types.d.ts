export type TreeStyle = {
    indent: string;
    vertical: string;
    horizontal: string;
    corner: string;
    branch: string;
};
export type CustomInitializer = {
    id: string;
    name: string;
    description: string;
    command: string;
    args?: string[];
    matchDirs?: string[];
    matchFiles?: string[];
    env?: Record<string, string>;
    workingDir?: "root" | "target";
};
export type InitTarget = {
    initId: string;
    targetDirs: string[];
};
export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug' | 'verbose';
export type LogEntry = {
    timestamp: string;
    level: LogLevel;
    action: string;
    target?: string;
    command?: string;
    args?: string[];
    result?: string;
    error?: string;
    duration?: number;
    metadata?: {
        config?: ForgeConfig;
        [key: string]: unknown;
    };
};
export declare const DEFAULT_LOG_CONFIG: LogConfig;
export declare const STATS_LOG_CONFIG: LogConfig;
export type LogConfig = {
    enabled: boolean;
    level: LogLevel;
    file?: string;
    console?: boolean;
    format?: 'text' | 'json';
    includeTimestamps?: boolean;
    includeDuration?: boolean;
    includeMetadata?: boolean;
};
export type PathValidationRules = {
    maxDepth?: number;
    maxPathLength?: number;
    maxNameLength?: number;
    allowedChars?: string;
    disallowedNames?: string[];
    enforceCase?: "lower" | "upper" | "any";
    allowDots?: boolean;
    allowSpaces?: boolean;
    requireExtensions?: boolean;
    allowedExtensions?: string[];
    uniqueNames?: boolean;
    uniquePaths?: boolean;
    normalizeSlashes?: boolean;
    trimWhitespace?: boolean;
    resolveRelative?: boolean;
};
export type ConflictResolutionFn = (path: string, conflict: {
    type: 'duplicate' | 'invalid' | 'long';
    existing?: string;
    details?: Record<string, unknown>;
}) => string;
export type PathConflictStrategy = {
    onDuplicatePath?: "error" | "warn" | "rename" | "merge" | "skip" | "numbered" | "timestamp" | ConflictResolutionFn;
    onDuplicateName?: "error" | "warn" | "rename" | "skip" | "numbered" | "timestamp" | ConflictResolutionFn;
    onInvalidChars?: "error" | "warn" | "replace" | "strip" | "encode" | "transliterate" | ConflictResolutionFn;
    onLongPath?: "error" | "warn" | "truncate" | "hash" | "shorten" | ConflictResolutionFn;
    renamePattern?: string;
    replacementChar?: string;
    mergeStrategy?: {
        files?: "keep-both" | "keep-newer" | "keep-larger" | "concatenate" | ConflictResolutionFn;
        directories?: "merge-recursive" | "keep-both" | "keep-newer" | ConflictResolutionFn;
    };
    hashAlgorithm?: "md5" | "sha1" | "sha256";
    transliterationMap?: Record<string, string>;
    preserveExtension?: boolean;
    maxAttempts?: number;
    counterStart?: number;
    counterPadding?: number;
};
export type BrowserPreference = "chrome" | "firefox" | "edge" | "safari" | "opera" | "brave" | "default" | string;
export type ViewerConfig = {
    browser?: BrowserPreference;
    browserArgs?: string[] | string;
    waitForBrowser?: boolean;
    newWindow?: boolean;
    incognito?: boolean;
    autoOpenOutputs?: boolean;
    cacheLimit?: number;
    cachePath?: string;
    logData?: string;
    statsData?: string;
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
    quiet: boolean;
    allowNestedInit?: boolean;
    customInitializers?: CustomInitializer[];
    initTargets?: InitTarget[];
    logging?: LogConfig;
    enabled?: boolean;
    level?: LogLevel;
    format?: 'text' | 'json';
    file?: string;
    console?: boolean;
    includeTimestamps?: boolean;
    includeDuration?: boolean;
    includeMetadata?: boolean;
    showTree?: boolean;
    showResult?: boolean;
    git?: boolean;
    github?: boolean | string;
    private?: boolean;
    noPush?: boolean;
    branch?: string;
    treeStyle?: TreeStyle;
    overwriteMode?: "ask" | "skip" | "force";
    skipExisting?: boolean;
    preserveGitIgnore?: boolean;
    preservePackageJson?: boolean;
    preserveConfig?: boolean;
    logLevel?: "silent" | "error" | "warn" | "info" | "debug";
    templateDir?: string;
    variables?: Record<string, string>;
    pathValidation?: PathValidationRules;
    pathConflict?: PathConflictStrategy;
    pathNormalization?: {
        style?: "unix" | "windows" | "mixed";
        base?: "root" | "relative" | "absolute";
        case?: "preserve" | "lower" | "upper";
    };
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
export type DetectorHooks = {
    preDetect?: () => Promise<void>;
    postDetect?: () => Promise<void>;
    preValidate?: () => Promise<void>;
    postValidate?: () => Promise<void>;
    prePrompt?: () => Promise<void>;
    postPrompt?: () => Promise<void>;
    preGenerate?: () => Promise<void>;
    postGenerate?: () => Promise<void>;
    preProcess?: () => Promise<void>;
    postProcess?: () => Promise<void>;
    onError?: (error: Error) => Promise<void>;
    onComplete?: () => Promise<void>;
};
export type DetectorEvents = {
    'init:start': {
        detectorId: string;
        node: TreeNode;
    };
    'init:validate': {
        detectorId: string;
        node: TreeNode;
        isValid: boolean;
    };
    'init:prompt': {
        detectorId: string;
        node: TreeNode;
        confirmed: boolean;
    };
    'init:generate': {
        detectorId: string;
        node: TreeNode;
        actions: PlanAction[];
    };
    'init:complete': {
        detectorId: string;
        node: TreeNode;
        success: boolean;
    };
    'init:error': {
        detectorId: string;
        node: TreeNode;
        error: Error;
    };
};
export type DetectorEventHandler<T extends keyof DetectorEvents> = (data: DetectorEvents[T]) => void | Promise<void>;
export type Detector = {
    id: string;
    match: (node: TreeNode, cfg: ForgeConfig) => boolean;
    validate?: (node: TreeNode, cfg: ForgeConfig) => Promise<boolean>;
    prompt: (node: TreeNode) => Promise<boolean>;
    generate: (node: TreeNode, cfg: ForgeConfig) => Promise<GeneratorResult>;
    postProcess?: (node: TreeNode, cfg: ForgeConfig) => Promise<void>;
    hooks?: DetectorHooks;
};
