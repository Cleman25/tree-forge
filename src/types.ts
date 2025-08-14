export type TreeStyle = {
    indent: string;        // The indentation string (e.g., "  ", "    ")
    vertical: string;      // Vertical line (e.g., "│", "|")
    horizontal: string;    // Horizontal line (e.g., "─", "-")
    corner: string;        // Corner piece (e.g., "└", "L")
    branch: string;        // Branch piece (e.g., "├", "+")
  };

  export type CustomInitializer = {
    id: string;
    name: string;
    description: string;
    command: string;
    args?: string[];
    matchDirs?: string[];  // Directory patterns to match (glob)
    matchFiles?: string[]; // Files to check for existence
    env?: Record<string, string>;
    workingDir?: "root" | "target"; // Where to run the command
};

export type InitTarget = {
    initId: string;        // ID of the initializer to run
    targetDirs: string[];  // Directory patterns to target
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

export const DEFAULT_LOG_CONFIG: LogConfig = {
    enabled: true,
    level: 'info',
    file: 'forge-tree.log',
    console: true,
    format: 'text',
    includeTimestamps: true,
    includeDuration: true,
    includeMetadata: true
};

export const STATS_LOG_CONFIG: LogConfig = {
    enabled: true,
    level: 'info',
    file: 'forge-tree.stats.json',
    console: false,
    format: 'json',
    includeTimestamps: true,
    includeDuration: true,
    includeMetadata: true
};

export type LogConfig = {
    enabled: boolean;
    level: LogLevel;
    file?: string;          // Log file path (relative to targetDir)
    console?: boolean;      // Whether to also log to console
    format?: 'text' | 'json'; // Log format
    includeTimestamps?: boolean;
    includeDuration?: boolean;
    includeMetadata?: boolean;
};

export type PathValidationRules = {
  maxDepth?: number;              // Maximum directory depth
  maxPathLength?: number;         // Maximum path length
  maxNameLength?: number;         // Maximum file/directory name length
  allowedChars?: string;         // Regex of allowed characters
  disallowedNames?: string[];    // Names that are not allowed (e.g., reserved)
  enforceCase?: "lower" | "upper" | "any";  // Case requirements
  allowDots?: boolean;           // Allow dots in directory names
  allowSpaces?: boolean;         // Allow spaces in paths
  requireExtensions?: boolean;   // Require file extensions
  allowedExtensions?: string[];  // List of allowed extensions
  uniqueNames?: boolean;         // Require unique names within directories
  uniquePaths?: boolean;         // Require globally unique paths
  normalizeSlashes?: boolean;    // Normalize path separators
  trimWhitespace?: boolean;      // Trim whitespace from names
  resolveRelative?: boolean;     // Resolve relative paths (../foo)
};

export type ConflictResolutionFn = (
  path: string,
  conflict: {
    type: 'duplicate' | 'invalid' | 'long';
    existing?: string;
    details?: Record<string, unknown>;
  }
) => string;

export type PathConflictStrategy = {
  onDuplicatePath?: "error" | "warn" | "rename" | "merge" | "skip" | "numbered" | "timestamp" | ConflictResolutionFn;
  onDuplicateName?: "error" | "warn" | "rename" | "skip" | "numbered" | "timestamp" | ConflictResolutionFn;
  onInvalidChars?: "error" | "warn" | "replace" | "strip" | "encode" | "transliterate" | ConflictResolutionFn;
  onLongPath?: "error" | "warn" | "truncate" | "hash" | "shorten" | ConflictResolutionFn;
  renamePattern?: string;        // Pattern for auto-renaming (e.g., "{name}-{n}")
  replacementChar?: string;      // Character to replace invalid chars with
  mergeStrategy?: {             // How to merge duplicate paths
    files?: "keep-both" | "keep-newer" | "keep-larger" | "concatenate" | ConflictResolutionFn;
    directories?: "merge-recursive" | "keep-both" | "keep-newer" | ConflictResolutionFn;
  };
  hashAlgorithm?: "md5" | "sha1" | "sha256";  // For hash-based shortening
  transliterationMap?: Record<string, string>; // Custom character transliteration
  preserveExtension?: boolean;   // Keep extension when renaming/truncating
  maxAttempts?: number;         // Max attempts for auto-renaming
  counterStart?: number;        // Starting number for numbered duplicates
  counterPadding?: number;      // Padding for numbered duplicates (e.g., 001)
};

export type BrowserPreference = 
  | "chrome" 
  | "firefox" 
  | "edge" 
  | "safari" 
  | "opera" 
  | "brave" 
  | "default" 
  | string;

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
  // Core settings
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

  // Logging settings
  logging?: LogConfig;
  enabled?: boolean;
  level?: LogLevel;
  format?: 'text' | 'json';
  file?: string;
  console?: boolean;
  includeTimestamps?: boolean;
  includeDuration?: boolean;
  includeMetadata?: boolean;

  // Feature flags
  showTree?: boolean;
  showResult?: boolean;

  // Git settings
  git?: boolean;
  github?: boolean | string;
  private?: boolean;
  noPush?: boolean;
  branch?: string;

  // Style settings
  treeStyle?: TreeStyle;
  overwriteMode?: "ask" | "skip" | "force";
  skipExisting?: boolean;

  // File handling
  preserveGitIgnore?: boolean;
  preservePackageJson?: boolean;
  preserveConfig?: boolean;
  logLevel?: "silent" | "error" | "warn" | "info" | "debug";
  templateDir?: string;  // Custom template directory
  variables?: Record<string, string>;  // Template variables

  // Path validation options
  pathValidation?: PathValidationRules;
  pathConflict?: PathConflictStrategy;
  pathNormalization?: {
    style?: "unix" | "windows" | "mixed";  // Path separator style
    base?: "root" | "relative" | "absolute";  // Path base style
    case?: "preserve" | "lower" | "upper";  // Case normalization
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
  
  export type PlanAction =
    | { type: "mkdir"; path: string }
    | { type: "write"; path: string; content: string }
    | { type: "ensurePkg"; path: string; name?: string }
    | { type: "exec"; cwd: string; cmd: string; args: string[]; env?: Record<string, string> };
  
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
  'init:start': { detectorId: string; node: TreeNode };
  'init:validate': { detectorId: string; node: TreeNode; isValid: boolean };
  'init:prompt': { detectorId: string; node: TreeNode; confirmed: boolean };
  'init:generate': { detectorId: string; node: TreeNode; actions: PlanAction[] };
  'init:complete': { detectorId: string; node: TreeNode; success: boolean };
  'init:error': { detectorId: string; node: TreeNode; error: Error };
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
  