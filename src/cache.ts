import fs from "fs/promises";
import path from "path";
import os from "os";

interface CacheData {
  lastLogFile?: string;
  lastStatsFile?: string;
  recentLogs: string[];
  recentStats: string[];
  lastDirectory?: string;
}

const DEFAULT_CACHE_LIMIT = 10;
const CACHE_FILE = ".forge-tree-cache.json";

export interface CacheOptions {
  limit?: number;
  path?: string;
}

export class Cache {
  private cachePath: string;
  private data: CacheData;

  private limit: number;

  constructor(options: CacheOptions = {}) {
    this.limit = options.limit || DEFAULT_CACHE_LIMIT;
    this.cachePath = options.path || path.join(os.homedir(), ".forge-tree", CACHE_FILE);
    this.data = {
      recentLogs: [],
      recentStats: []
    };
  }

  async load(): Promise<void> {
    try {
      // Ensure cache directory exists
      const cacheDir = path.dirname(this.cachePath);
      await fs.mkdir(cacheDir, { recursive: true });

      // Try to read existing cache
      try {
        const content = await fs.readFile(this.cachePath, "utf-8");
        this.data = JSON.parse(content);
      } catch (error) {
        // Cache doesn't exist yet, use default empty data
        await this.save();
      }
    } catch (error) {
      console.warn("Failed to load cache:", error);
    }
  }

  async save(): Promise<void> {
    try {
      await fs.writeFile(this.cachePath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.warn("Failed to save cache:", error);
    }
  }

  getLastLogFile(): string | undefined {
    return this.data.lastLogFile;
  }

  getLastStatsFile(): string | undefined {
    return this.data.lastStatsFile;
  }

  getLastDirectory(): string | undefined {
    return this.data.lastDirectory;
  }

  getRecentLogs(): string[] {
    return this.data.recentLogs;
  }

  getRecentStats(): string[] {
    return this.data.recentStats;
  }

  async updateLogFile(filePath: string): Promise<void> {
    // Convert to relative path if it's under current directory
    const cwd = process.cwd();
    if (filePath.startsWith(cwd)) {
      filePath = path.relative(cwd, filePath);
    }

    this.data.lastLogFile = filePath;
    this.data.recentLogs = [filePath, ...this.data.recentLogs
      .filter(f => f !== filePath)]
      .slice(0, this.limit);
    await this.save();
  }

  async updateStatsFile(filePath: string): Promise<void> {
    // Convert to relative path if it's under current directory
    const cwd = process.cwd();
    if (filePath.startsWith(cwd)) {
      filePath = path.relative(cwd, filePath);
    }

    this.data.lastStatsFile = filePath;
    this.data.recentStats = [filePath, ...this.data.recentStats
      .filter(f => f !== filePath)]
      .slice(0, this.limit);
    await this.save();
  }

  async updateDirectory(dir: string): Promise<void> {
    this.data.lastDirectory = dir;
    await this.save();
  }

  async cleanup(): Promise<void> {
    // Remove non-existent files from cache
    const checkFile = async (file: string) => {
      try {
        if (path.isAbsolute(file)) {
          await fs.access(file);
          return true;
        }
        // For relative paths, try both current and last directory
        if (this.data.lastDirectory) {
          try {
            await fs.access(path.join(this.data.lastDirectory, file));
            return true;
          } catch {
            // Try current directory
          }
        }
        await fs.access(path.join(process.cwd(), file));
        return true;
      } catch {
        return false;
      }
    };

    this.data.recentLogs = (await Promise.all(
      this.data.recentLogs.map(async file => ({
        file,
        exists: await checkFile(file)
      }))
    )).filter(result => result.exists).map(result => result.file);

    this.data.recentStats = (await Promise.all(
      this.data.recentStats.map(async file => ({
        file,
        exists: await checkFile(file)
      }))
    )).filter(result => result.exists).map(result => result.file);

    await this.save();
  }

  async clear(): Promise<void> {
    this.data = {
      recentLogs: [],
      recentStats: []
    };
    await this.save();
  }

  async export(outputPath: string): Promise<void> {
    await fs.writeFile(outputPath, JSON.stringify(this.data, null, 2));
  }

  async import(inputPath: string): Promise<void> {
    try {
      const content = await fs.readFile(inputPath, "utf-8");
      const imported = JSON.parse(content);
      // Validate imported data
      if (typeof imported === "object" && imported !== null) {
        if (Array.isArray(imported.recentLogs)) {
          this.data.recentLogs = imported.recentLogs;
        }
        if (Array.isArray(imported.recentStats)) {
          this.data.recentStats = imported.recentStats;
        }
        if (typeof imported.lastDirectory === "string") {
          this.data.lastDirectory = imported.lastDirectory;
        }
      }
      await this.save();
    } catch (error) {
      throw new Error(`Failed to import cache: ${error instanceof Error ? error.message : error}`);
    }
  }

  setLimit(limit: number): void {
    this.limit = limit;
    // Trim lists if they exceed the new limit
    if (this.data.recentLogs.length > limit) {
      this.data.recentLogs = this.data.recentLogs.slice(0, limit);
    }
    if (this.data.recentStats.length > limit) {
      this.data.recentStats = this.data.recentStats.slice(0, limit);
    }
  }

  async resolveLogFile(filePath?: string): Promise<string> {
    if (filePath) {
      // If absolute path, use it directly
      if (path.isAbsolute(filePath)) {
        return filePath;
      }
      // If relative path, resolve from current directory
      return path.resolve(process.cwd(), filePath);
    }

    // Try to use last log file
    if (this.data.lastLogFile) {
      // If last file was absolute, use it
      if (path.isAbsolute(this.data.lastLogFile)) {
        return this.data.lastLogFile;
      }
      // If last file was relative, try from last directory first
      if (this.data.lastDirectory) {
        const lastDirPath = path.join(this.data.lastDirectory, this.data.lastLogFile);
        try {
          await fs.access(lastDirPath);
          return lastDirPath;
        } catch {
          // File doesn't exist in last directory
        }
      }
      // Try from current directory
      return path.resolve(process.cwd(), this.data.lastLogFile);
    }

    // Default to forge-tree.log in current directory
    return path.resolve(process.cwd(), "forge-tree.log");
  }

  async resolveStatsFile(filePath?: string): Promise<string> {
    if (filePath) {
      // If absolute path, use it directly
      if (path.isAbsolute(filePath)) {
        return filePath;
      }
      // If relative path, resolve from current directory
      return path.resolve(process.cwd(), filePath);
    }

    // Try to use last stats file
    if (this.data.lastStatsFile) {
      // If last file was absolute, use it
      if (path.isAbsolute(this.data.lastStatsFile)) {
        return this.data.lastStatsFile;
      }
      // If last file was relative, try from last directory first
      if (this.data.lastDirectory) {
        const lastDirPath = path.join(this.data.lastDirectory, this.data.lastStatsFile);
        try {
          await fs.access(lastDirPath);
          return lastDirPath;
        } catch {
          // File doesn't exist in last directory
        }
      }
      // Try from current directory
      return path.resolve(process.cwd(), this.data.lastStatsFile);
    }

    // Default to forge-tree.stats.json in current directory
    return path.resolve(process.cwd(), "forge-tree.stats.json");
  }
}
