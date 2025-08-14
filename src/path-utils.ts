import type { PathValidationRules, PathConflictStrategy, ForgeConfig } from "./types.js";
import path from "path";

export interface PathValidationError {
  type: 'error' | 'warning';
  code: string;
  message: string;
  path: string;
  details?: Record<string, unknown>;
}

export class PathValidator {
  private rules: Required<PathValidationRules>;
  private strategy: Required<PathConflictStrategy>;
  private seenPaths = new Set<string>();
  private seenNames = new Map<string, Set<string>>();

  constructor(
    rules: PathValidationRules = {},
    strategy: PathConflictStrategy = {}
  ) {
    this.rules = {
      maxDepth: rules.maxDepth ?? 32,
      maxPathLength: rules.maxPathLength ?? 260,
      maxNameLength: rules.maxNameLength ?? 255,
      allowedChars: rules.allowedChars ?? "^[a-zA-Z0-9-_.]+$",
      disallowedNames: rules.disallowedNames ?? [
        "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4",
        "COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2", "LPT3",
        "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"
      ],
      enforceCase: rules.enforceCase ?? "any",
      allowDots: rules.allowDots ?? false,
      allowSpaces: rules.allowSpaces ?? false,
      requireExtensions: rules.requireExtensions ?? false,
      allowedExtensions: rules.allowedExtensions ?? [],
      uniqueNames: rules.uniqueNames ?? true,
      uniquePaths: rules.uniquePaths ?? true,
      normalizeSlashes: rules.normalizeSlashes ?? true,
      trimWhitespace: rules.trimWhitespace ?? true,
      resolveRelative: rules.resolveRelative ?? false
    };

    this.strategy = {
      onDuplicatePath: strategy.onDuplicatePath ?? "error",
      onDuplicateName: strategy.onDuplicateName ?? "error",
      onInvalidChars: strategy.onInvalidChars ?? "error",
      onLongPath: strategy.onLongPath ?? "error",
      renamePattern: strategy.renamePattern ?? "{name}-{n}",
      replacementChar: strategy.replacementChar ?? "_",
      mergeStrategy: strategy.mergeStrategy ?? {
        files: "keep-newer",
        directories: "merge-recursive"
      },
      hashAlgorithm: strategy.hashAlgorithm ?? "sha256",
      transliterationMap: strategy.transliterationMap ?? {},
      preserveExtension: strategy.preserveExtension ?? true,
      maxAttempts: strategy.maxAttempts ?? 100,
      counterStart: strategy.counterStart ?? 1,
      counterPadding: strategy.counterPadding ?? 3
    };
  }

  validatePath(filePath: string): PathValidationError[] {
    const errors: PathValidationError[] = [];
    const normalizedPath = this.normalizePath(filePath);
    const parts = normalizedPath.split("/");
    const name = parts[parts.length - 1];
    const parentDir = parts.slice(0, -1).join("/");

    // Check path length
    if (normalizedPath.length > this.rules.maxPathLength) {
      errors.push(this.handleViolation("longPath", {
        path: normalizedPath,
        length: normalizedPath.length,
        maxLength: this.rules.maxPathLength
      }));
    }

    // Check depth
    if (parts.length > this.rules.maxDepth) {
      errors.push(this.handleViolation("maxDepth", {
        path: normalizedPath,
        depth: parts.length,
        maxDepth: this.rules.maxDepth
      }));
    }

    // Check name length
    if (name.length > this.rules.maxNameLength) {
      errors.push(this.handleViolation("longName", {
        path: normalizedPath,
        name,
        length: name.length,
        maxLength: this.rules.maxNameLength
      }));
    }

    // Check allowed characters
    const charRegex = new RegExp(this.rules.allowedChars);
    if (!charRegex.test(name)) {
      errors.push(this.handleViolation("invalidChars", {
        path: normalizedPath,
        name,
        pattern: this.rules.allowedChars
      }));
    }

    // Check disallowed names
    if (this.rules.disallowedNames.includes(name.toUpperCase())) {
      errors.push(this.handleViolation("reservedName", {
        path: normalizedPath,
        name
      }));
    }

    // Check case requirements
    if (this.rules.enforceCase !== "any") {
      const isCorrectCase = this.rules.enforceCase === "lower" 
        ? name === name.toLowerCase()
        : name === name.toUpperCase();
      
      if (!isCorrectCase) {
        errors.push(this.handleViolation("wrongCase", {
          path: normalizedPath,
          name,
          requiredCase: this.rules.enforceCase
        }));
      }
    }

    // Check dots in directory names
    if (!this.rules.allowDots && name.includes(".") && !parts[parts.length - 1].includes(".")) {
      errors.push(this.handleViolation("dotsInDir", {
        path: normalizedPath,
        name
      }));
    }

    // Check spaces
    if (!this.rules.allowSpaces && /\s/.test(normalizedPath)) {
      errors.push(this.handleViolation("spacesInPath", {
        path: normalizedPath
      }));
    }

    // Check file extensions
    if (this.rules.requireExtensions && !name.includes(".") && parts[parts.length - 1].includes(".")) {
      errors.push(this.handleViolation("missingExtension", {
        path: normalizedPath,
        name
      }));
    }

    if (this.rules.allowedExtensions.length > 0) {
      const ext = path.extname(name).toLowerCase();
      if (ext && !this.rules.allowedExtensions.includes(ext)) {
        errors.push(this.handleViolation("invalidExtension", {
          path: normalizedPath,
          extension: ext,
          allowedExtensions: this.rules.allowedExtensions
        }));
      }
    }

    // Check unique paths
    if (this.rules.uniquePaths && this.seenPaths.has(normalizedPath)) {
      errors.push(this.handleViolation("duplicatePath", {
        path: normalizedPath
      }));
    }
    this.seenPaths.add(normalizedPath);

    // Check unique names within directories
    if (this.rules.uniqueNames) {
      const dirNames = this.seenNames.get(parentDir) || new Set();
      if (dirNames.has(name)) {
        errors.push(this.handleViolation("duplicateName", {
          path: normalizedPath,
          name,
          directory: parentDir
        }));
      }
      dirNames.add(name);
      this.seenNames.set(parentDir, dirNames);
    }

    return errors;
  }

  private resolveConflict(
    path: string,
    code: string,
    details: Record<string, unknown>
  ): string {
    const name = details.name as string || path.split("/").pop() || "";
    const ext = this.strategy.preserveExtension ? path.match(/\.[^.]+$/)?.[0] || "" : "";
    const baseNameWithoutExt = name.replace(/\.[^.]+$/, "");

    switch (code) {
      case 'duplicatePath': {
        const strategy = typeof this.strategy.onDuplicatePath === 'function'
          ? this.strategy.onDuplicatePath
          : this.strategy.onDuplicatePath;

        switch (strategy) {
          case 'numbered':
            return this.renameNumbered(path, ext);
          case 'timestamp':
            return this.renameTimestamp(path, ext);
          case 'merge':
            // Let the mergeStrategy handle it
            return path;
          case 'skip':
            return '';
          default:
            return path;
        }
      }

      case 'duplicateName': {
        const strategy = typeof this.strategy.onDuplicateName === 'function'
          ? this.strategy.onDuplicateName
          : this.strategy.onDuplicateName;

        switch (strategy) {
          case 'numbered':
            return this.renameNumbered(path, ext);
          case 'timestamp':
            return this.renameTimestamp(path, ext);
          case 'skip':
            return '';
          default:
            return path;
        }
      }

      case 'invalidChars': {
        const strategy = typeof this.strategy.onInvalidChars === 'function'
          ? this.strategy.onInvalidChars
          : this.strategy.onInvalidChars;

        switch (strategy) {
          case 'replace':
            return this.replaceInvalidChars(path, this.strategy.replacementChar);
          case 'strip':
            return this.stripInvalidChars(path);
          case 'encode':
            return this.encodePath(path);
          case 'transliterate':
            return this.transliteratePath(path);
          default:
            return path;
        }
      }

      case 'longPath': {
        const strategy = typeof this.strategy.onLongPath === 'function'
          ? this.strategy.onLongPath
          : this.strategy.onLongPath;

        switch (strategy) {
          case 'truncate':
            return this.truncatePath(path, details.maxLength as number, ext);
          case 'hash':
            return this.hashPath(path, this.strategy.hashAlgorithm, ext);
          case 'shorten':
            return this.shortenPath(path, details.maxLength as number, ext);
          default:
            return path;
        }
      }

      default:
        return path;
    }
  }

  private renameNumbered(path: string, ext: string): string {
    const dir = path.substring(0, path.lastIndexOf("/") + 1);
    const baseName = path.substring(dir.length).replace(/\.[^.]+$/, "");
    const pattern = this.strategy.renamePattern.replace("{name}", baseName);
    
    for (let i = this.strategy.counterStart; i < this.strategy.counterStart + this.strategy.maxAttempts; i++) {
      const num = String(i).padStart(this.strategy.counterPadding, "0");
      const newName = pattern.replace("{n}", num) + ext;
      const newPath = dir + newName;
      if (!this.seenPaths.has(newPath)) {
        return newPath;
      }
    }
    return path;
  }

  private renameTimestamp(path: string, ext: string): string {
    const dir = path.substring(0, path.lastIndexOf("/") + 1);
    const baseName = path.substring(dir.length).replace(/\.[^.]+$/, "");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    return dir + baseName + "-" + timestamp + ext;
  }

  private replaceInvalidChars(path: string, replacement: string): string {
    const regex = new RegExp(this.rules.allowedChars);
    return path.split("").map(c => regex.test(c) ? c : replacement).join("");
  }

  private stripInvalidChars(path: string): string {
    const regex = new RegExp(this.rules.allowedChars);
    return path.split("").filter(c => regex.test(c)).join("");
  }

  private encodePath(path: string): string {
    return encodeURIComponent(path).replace(/%2F/g, "/");
  }

  private transliteratePath(path: string): string {
    return path.split("").map(c => this.strategy.transliterationMap[c] || c).join("");
  }

  private truncatePath(path: string, maxLength: number, ext: string): string {
    if (path.length <= maxLength) return path;
    const dir = path.substring(0, path.lastIndexOf("/") + 1);
    const baseName = path.substring(dir.length).replace(/\.[^.]+$/, "");
    const available = maxLength - dir.length - ext.length;
    if (available < 1) return path;
    return dir + baseName.substring(0, available) + ext;
  }

  private hashPath(path: string, algorithm: string, ext: string): string {
    const crypto = require("crypto");
    const dir = path.substring(0, path.lastIndexOf("/") + 1);
    const baseName = path.substring(dir.length).replace(/\.[^.]+$/, "");
    const hash = crypto.createHash(algorithm).update(baseName).digest("hex").substring(0, 8);
    return dir + hash + ext;
  }

  private shortenPath(path: string, maxLength: number, ext: string): string {
    if (path.length <= maxLength) return path;
    const parts = path.split("/");
    const fileName = parts.pop() || "";
    
    // First try to shorten directory names
    for (let i = 1; i < parts.length && path.length > maxLength; i++) {
      if (parts[i].length > 3) {
        parts[i] = parts[i].substring(0, 3);
      }
    }
    
    // If still too long, truncate the filename
    const newPath = [...parts, fileName].join("/");
    if (newPath.length > maxLength) {
      return this.truncatePath(newPath, maxLength, ext);
    }
    
    return newPath;
  }

  private handleViolation(
    code: string,
    details: Record<string, unknown>
  ): PathValidationError {
    const path = details.path as string;
    let type: 'error' | 'warning' = 'error';
    let message = '';
    let resolvedPath = '';

    switch (code) {
      case 'longPath':
        type = this.strategy.onLongPath === 'warn' ? 'warning' : 'error';
        message = `Path exceeds maximum length of ${details.maxLength} characters`;
        resolvedPath = this.resolveConflict(path, code, details);
        break;
      case 'maxDepth':
        message = `Path exceeds maximum depth of ${details.maxDepth} levels`;
        break;
      case 'longName':
        message = `Name exceeds maximum length of ${details.maxLength} characters`;
        break;
      case 'invalidChars':
        type = this.strategy.onInvalidChars === 'warn' ? 'warning' : 'error';
        message = `Name contains invalid characters (must match ${details.pattern})`;
        resolvedPath = this.resolveConflict(path, code, details);
        break;
      case 'reservedName':
        message = `"${details.name}" is a reserved name`;
        break;
      case 'wrongCase':
        message = `Name must be ${details.requiredCase}case`;
        break;
      case 'dotsInDir':
        message = `Directory names cannot contain dots`;
        break;
      case 'spacesInPath':
        message = `Path cannot contain spaces`;
        break;
      case 'missingExtension':
        message = `Files must have extensions`;
        break;
      case 'invalidExtension':
        message = `Invalid file extension (allowed: ${(details.allowedExtensions as string[]).join(", ")})`;
        break;
      case 'duplicatePath':
        type = this.strategy.onDuplicatePath === 'warn' ? 'warning' : 'error';
        message = `Duplicate path`;
        resolvedPath = this.resolveConflict(path, code, details);
        break;
      case 'duplicateName':
        type = this.strategy.onDuplicateName === 'warn' ? 'warning' : 'error';
        message = `Duplicate name "${details.name}" in directory`;
        resolvedPath = this.resolveConflict(path, code, details);
        break;
    }

    return { 
      type, 
      code, 
      message, 
      path, 
      details: { 
        ...details, 
        resolvedPath: resolvedPath || path 
      } 
    };
  }

  normalizePath(filePath: string): string {
    let normalized = filePath;

    // Normalize slashes
    if (this.rules.normalizeSlashes) {
      normalized = normalized.replace(/[\\/]+/g, "/");
    }

    // Trim whitespace
    if (this.rules.trimWhitespace) {
      normalized = normalized.split("/")
        .map(part => part.trim())
        .join("/");
    }

    // Resolve relative paths
    if (this.rules.resolveRelative) {
      normalized = path.normalize(normalized).replace(/[\\/]+/g, "/");
    }

    return normalized;
  }

  reset() {
    this.seenPaths.clear();
    this.seenNames.clear();
  }
}

export class PathNormalizer {
  constructor(private config: ForgeConfig) {}

  normalize(filePath: string): string {
    const style = this.config.pathNormalization?.style ?? "unix";
    const base = this.config.pathNormalization?.base ?? "root";
    const casing = this.config.pathNormalization?.case ?? "preserve";

    let normalized = filePath;

    // Handle path separators
    switch (style) {
      case "unix":
        normalized = normalized.replace(/[\\/]+/g, "/");
        break;
      case "windows":
        normalized = normalized.replace(/[\\/]+/g, "\\");
        break;
      case "mixed":
        // Keep as-is
        break;
    }

    // Handle base path
    switch (base) {
      case "root":
        normalized = path.join(this.config.targetDir, normalized);
        break;
      case "relative":
        if (path.isAbsolute(normalized)) {
          normalized = path.relative(this.config.targetDir, normalized);
        }
        break;
      case "absolute":
        if (!path.isAbsolute(normalized)) {
          normalized = path.resolve(this.config.targetDir, normalized);
        }
        break;
    }

    // Handle casing
    switch (casing) {
      case "lower":
        normalized = normalized.toLowerCase();
        break;
      case "upper":
        normalized = normalized.toUpperCase();
        break;
      case "preserve":
        // Keep as-is
        break;
    }

    return normalized;
  }
}
