import fs from "fs/promises";
import path from "path";
import type { LogEntry, LogConfig, ViewerConfig } from "./types.js";
import open from "open";
import { Cache } from "./cache.js";


export async function createLogViewer(
  logContent: string,
  statsContent?: string,
  viewerConfig?: ViewerConfig
): Promise<void> {
  // Read the template
  // Get the directory path in ESM
  // In production, templates are in dist/templates
  // In development, they're in src/templates
  // Get the directory path in ESM
  const currentDir = path.dirname(new URL(import.meta.url).pathname);
  // Handle Windows paths
  const normalizedDir = process.platform === 'win32' 
    ? currentDir.slice(1) // Remove leading slash from Windows paths
    : currentDir;

  const templatePaths = [
    // Production (after npm install)
    path.join(normalizedDir, "..", "templates", "log-viewer.html"),
    // Development
    path.join(normalizedDir, "..", "src", "templates", "log-viewer.html"),
    // Local development
    path.join(process.cwd(), "src", "templates", "log-viewer.html")
  ];

  let template: string | undefined;
  for (const templatePath of templatePaths) {
    try {
      template = await fs.readFile(templatePath, "utf-8");
      break;
    } catch (error) {
      // Try next path
    }
  }

  if (!template) {
    throw new Error("Could not find log viewer template. Make sure the package is installed correctly.");
  }


  // Create a temporary directory for the viewer
  const tempDir = path.join(process.cwd(), ".forge-tree-viewer");
  await fs.mkdir(tempDir, { recursive: true });

  // Create the viewer HTML
  const viewerPath = path.join(tempDir, "viewer.html");
  
  // Update template with file data
  template = template.replace(
    'let logData = null;',
    `let logData = ${JSON.stringify(logContent)};`
  );

  if (statsContent) {
    template = template.replace(
      'let statsData = null;',
      `let statsData = ${JSON.stringify(statsContent)};`
    );
  }

  await fs.writeFile(viewerPath, template);

  // Add cleanup
  process.on('SIGINT', () => {
    process.exit();
  });

  // Open in browser
  const openOptions = {
    wait: viewerConfig?.waitForBrowser ?? false,
    newWindow: viewerConfig?.newWindow ?? true
  };

  // Prepare browser arguments
  const browserArgs = [];
  if (viewerConfig?.incognito) {
    browserArgs.push(
      viewerConfig.browser === 'firefox' ? '-private' :
      viewerConfig.browser === 'edge' ? '-inprivate' :
      '--incognito'
    );
  }
  if (viewerConfig?.newWindow) {
    browserArgs.push('--new-window');
  }
  if (viewerConfig?.browserArgs) {
    browserArgs.push(...(typeof viewerConfig.browserArgs === 'string' ? viewerConfig.browserArgs.split(',') : viewerConfig.browserArgs));
  }

  // Map browser names to executables
  const browserMap: Record<string, string> = {
    chrome: process.platform === 'win32' ? 'chrome' : 'google-chrome',
    firefox: 'firefox',
    edge: process.platform === 'win32' ? 'msedge' : 'microsoft-edge',
    safari: 'safari',
    opera: 'opera',
    brave: process.platform === 'win32' ? 'brave' : 'brave-browser'
  };

  try {
    // Try preferred browser first
    if (viewerConfig?.browser && viewerConfig.browser !== 'default') {
      const browserName = browserMap[viewerConfig.browser] || viewerConfig.browser;
      await open(viewerPath, {
        ...openOptions,
        app: {
          name: browserName,
          arguments: browserArgs as string[]
        }
      });
      return;
    }
  } catch {
    // Fall back to default browser
    console.warn(`Failed to open in ${viewerConfig?.browser}, falling back to default browser`);
  }

  // Use default browser
  await open(viewerPath, {
    ...openOptions,
    app: {
      name: process.platform === 'win32' ? 'explorer' : 'xdg-open',
                arguments: browserArgs as string[]
    }
  });
}

export async function transformLogs(logPath: string): Promise<LogEntry[]> {
  const content = await fs.readFile(logPath, "utf-8");
  const lines = content.split(/\r?\n/);
  const entries: LogEntry[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      // Handle both JSON and text formats
      if (line.startsWith("{")) {
        const entry = JSON.parse(line);
        entries.push(entry);
      } else {
        // Parse text format: [TIMESTAMP] LEVEL: MESSAGE
        const match = line.match(/\[(.*?)\]\s+(\w+):\s+(.*)/);
        if (match) {
          entries.push({
            timestamp: match[1],
            level: match[2] as LogEntry["level"],
            action: "log",
            result: match[3]
          });
        }
      }
    } catch (error) {
      console.warn("Failed to parse log line:", line);
    }
  }

  return entries;
}

export function calculateStats(entries: LogEntry[]) {
  const stats = {
    totalOperations: entries.length,
    successCount: 0,
    errorCount: 0,
    totalDuration: 0,
    operationsWithDuration: 0,
    timeline: [] as Array<{
      timestamp: string;
      level: string;
      duration?: number;
    }>
  };

  for (const entry of entries) {
    // Track success/error counts
    if (entry.level === "error") {
      stats.errorCount++;
    } else if (entry.level !== "warn") {
      stats.successCount++;
    }

    // Track durations
    if (entry.duration) {
      stats.totalDuration += entry.duration;
      stats.operationsWithDuration++;
    }

    // Build timeline
    stats.timeline.push({
      timestamp: entry.timestamp,
      level: entry.level,
      duration: entry.duration
    });
  }

  return {
    totalOperations: stats.totalOperations,
    successRate: Math.round((stats.successCount / stats.totalOperations) * 100),
    errorRate: Math.round((stats.errorCount / stats.totalOperations) * 100),
    averageDuration: stats.operationsWithDuration
      ? Math.round(stats.totalDuration / stats.operationsWithDuration)
      : 0,
    timeline: stats.timeline
  };
}

export async function openLogViewer(options: {
  logFile?: string;
  statsFile?: string;
  withLog?: boolean;
  withStats?: boolean;
  openInChrome?: boolean;
  autoOpenOutputs?: boolean;
  waitForBrowser?: boolean;
  browser?: string;
  browserArgs?: string;
  newWindow?: boolean;
  incognito?: boolean;
}): Promise<void> {
  const {
    logFile,
    statsFile,
    withLog = true,
    withStats = false
  } = options;

  try {
    // Initialize cache
    const cache = new Cache();
    await cache.load();

    // Update current directory
    await cache.updateDirectory(process.cwd());

    // Resolve file paths
    console.log("Resolving paths:", { logFile, statsFile, cwd: process.cwd() });
    const resolvedLogPath = withLog ? await cache.resolveLogFile(logFile) : undefined;
    const resolvedStatsPath = withStats ? await cache.resolveStatsFile(statsFile) : undefined;
    console.log("Resolved paths:", { resolvedLogPath, resolvedStatsPath });

    // Validate files exist
    if (resolvedLogPath) {
      await fs.access(resolvedLogPath);
      await cache.updateLogFile(resolvedLogPath);
    }
    if (resolvedStatsPath) {
      await fs.access(resolvedStatsPath);
      await cache.updateStatsFile(resolvedStatsPath);
    }

    // Create viewer
    if (!resolvedLogPath) {
      throw new Error("No log file found. Please specify a valid log file path.");
    }

    // Read file contents
    const logContent = await fs.readFile(resolvedLogPath, 'utf-8');
    let statsContent: string | undefined;
    if (resolvedStatsPath) {
      statsContent = await fs.readFile(resolvedStatsPath, 'utf-8');
    }

    // Create viewer
    await createLogViewer(
      logContent,
      statsContent,
      {
        waitForBrowser: options.waitForBrowser ?? false,
        browser: options.browser,
        browserArgs: options.browserArgs,
        newWindow: options.newWindow,
        incognito: options.incognito
      }
    );
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to open log viewer: ${error.message}`);
    }
    throw error;
  }
}
