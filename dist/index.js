#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import path from "path";
import { parseTree } from "./parser.js";
import { applyPlan, detectPM } from "./utils.js";
import { planFromTree } from "./generators.js";
import { getDetectors } from "./detectors.js";
import { askGlobalOptions, chooseDetectors, confirmPlan } from "./prompts.js";
import { DEFAULT_LOG_CONFIG, STATS_LOG_CONFIG } from "./types.js";
import { Logger } from "./logger.js";
import { DetectorManager } from "./detector-manager.js";
import { displayGeneratedStructure, scanDirectory } from "./scan.js";
import { loadTreeSource } from "./generators.js";
import chalk from "chalk";
import { setupGit } from "./git.js";
import { Cache } from "./cache.js";
import { openLogViewer } from "./log-viewer.js";
const argv = await yargs(hideBin(process.argv))
    .scriptName("forge-tree")
    .usage("$0 [targetDir] [options]")
    .positional("targetDir", { type: "string", describe: "Where to scaffold", default: "." })
    .option("tree-file", { type: "string", describe: "Path to ASCII tree file" })
    .option("tree", { type: "string", describe: "ASCII tree string (quoted)" })
    .option("tabIndentationSize", { type: "number", default: 2, describe: "Spaces per depth level" })
    .option("detectAsciiGuides", { type: "boolean", default: true, describe: "Skip │ ├ └ guides" })
    .option("dry-run", { type: "boolean", default: false, describe: "Print actions only" })
    .option("yes", { type: "boolean", default: false, alias: "y", describe: "Assume yes for prompts" })
    .option("pm", {
    type: "string",
    choices: ["pnpm", "yarn", "npm"],
    describe: "Preferred package manager"
})
    .option("detectors", { type: "boolean", default: true, describe: "Enable smart detectors" })
    .option("dotfiles", { type: "boolean", default: true, describe: "Generate ignores/formatters" })
    .option("git", { type: "boolean", default: false, describe: "Initialize a git repo and make an initial commit" })
    .option("github", { type: "string", describe: "Create a GitHub repo with this name (uses gh if available). If empty flag is passed, defaults to folder name", coerce: (v) => v === "" ? true : v })
    .option("private", { type: "boolean", default: false, describe: "Create the GitHub repo as private (with --github)" })
    .option("no-push", { type: "boolean", default: false, describe: "Do not push after creating/adding remote" })
    .option("branch", { type: "string", default: "main", describe: "Initial branch name" })
    .option("log", { type: "boolean", default: true, describe: "Enable logging" })
    .option("log-file", { type: "string", describe: "Log file path (relative to target dir)" })
    .option("log-level", {
    type: "string",
    choices: ["silent", "error", "warn", "info", "debug", "verbose"],
    default: "info",
    describe: "Log level"
})
    .option("log-format", {
    type: "string",
    choices: ["text", "json"],
    default: "text",
    describe: "Log output format"
})
    .option("quiet", {
    type: "boolean",
    default: false,
    describe: "Suppress console output (except errors)"
})
    .option("show-tree", {
    type: "boolean",
    default: true,
    describe: "Show the tree structure before processing"
})
    .option("show-result", {
    type: "boolean",
    default: true,
    describe: "Show the generated directory structure after completion"
})
    .option("auto-open", {
    type: "boolean",
    default: true,
    describe: "Automatically open logs/stats in browser after generation",
    alias: "ao"
})
    .option("browser", {
    type: "string",
    default: "chrome",
    describe: "Preferred browser (chrome, firefox, edge, safari, opera, brave, default)",
    alias: "b"
})
    .option("browser-args", {
    type: "string",
    describe: "Additional browser arguments (comma-separated)",
    alias: "ba"
})
    .option("wait-for-browser", {
    type: "boolean",
    default: false,
    describe: "Wait for browser to close before continuing",
    alias: "wb"
})
    .option("new-window", {
    type: "boolean",
    default: true,
    describe: "Open in new window",
    alias: "nw"
})
    .option("incognito", {
    type: "boolean",
    default: false,
    describe: "Open in incognito/private mode",
    alias: "i"
})
    .option("no-viewer", {
    type: "boolean",
    default: false,
    describe: "Disable automatic log viewer",
    alias: "nv"
})
    .command("view", "View logs and statistics", (yargs) => {
    return yargs
        .option("log", {
        type: "string",
        describe: "View log file (defaults to forge-tree.log)",
        default: "forge-tree.log",
        alias: "l"
    })
        .option("stats", {
        type: "string",
        describe: "View stats file (defaults to forge-tree.stats.json)",
        default: "forge-tree.stats.json",
        alias: "s"
    })
        .option("with-log", {
        type: "boolean",
        default: false,
        describe: "Include log file when viewing stats",
        alias: "wl"
    })
        .option("with-stats", {
        type: "boolean",
        default: false,
        describe: "Include stats file when viewing logs",
        alias: "ws"
    })
        .option("list", {
        type: "boolean",
        describe: "List recent log and stats files",
        alias: "ls"
    })
        .option("cleanup", {
        type: "boolean",
        describe: "Remove non-existent files from cache",
        alias: "c"
    })
        .option("clear", {
        type: "boolean",
        describe: "Clear all cache entries"
    })
        .option("export-cache", {
        type: "string",
        describe: "Export cache to file"
    })
        .option("import-cache", {
        type: "string",
        describe: "Import cache from file"
    })
        .option("cache-limit", {
        type: "number",
        describe: "Set maximum number of recent files to track"
    })
        .option("open-in-chrome", {
        type: "boolean",
        describe: "Always try to open in Chrome first",
        default: true
    })
        .option("auto-open", {
        type: "boolean",
        describe: "Automatically open logs/stats after generation",
        default: false
    })
        .example("$0 view --log", "View default log file")
        .example("$0 view -l custom.log", "View specific log file")
        .example("$0 view --stats", "View default stats file")
        .example("$0 view --log --with-stats", "View logs with stats")
        .example("$0 view -l -ws", "Same as above, using short aliases")
        .example("$0 view --list", "List recent log and stats files")
        .example("$0 view --cleanup", "Remove non-existent files from cache")
        .example("$0 view --clear", "Clear all cache entries")
        .example("$0 view --export-cache backup.json", "Export cache")
        .example("$0 view --import-cache backup.json", "Import cache")
        .example("$0 view --cache-limit 20", "Set cache limit to 20 files");
})
    .help().argv;
// Handle log viewer commands first
if (argv._.includes("view")) {
    try {
        // Initialize cache
        const cache = new Cache({
            limit: argv["cache-limit"]
        });
        await cache.load();
        // Handle cache management commands
        if (argv.cleanup) {
            await cache.cleanup();
            console.log(chalk.green("Cache cleaned up successfully."));
            process.exit(0);
        }
        if (argv.clear) {
            await cache.clear();
            console.log(chalk.green("Cache cleared successfully."));
            process.exit(0);
        }
        if (argv["export-cache"]) {
            await cache.export(argv["export-cache"]);
            console.log(chalk.green(`Cache exported to ${argv["export-cache"]}`));
            process.exit(0);
        }
        if (argv["import-cache"]) {
            await cache.import(argv["import-cache"]);
            console.log(chalk.green(`Cache imported from ${argv["import-cache"]}`));
            process.exit(0);
        }
        if (argv["cache-limit"]) {
            cache.setLimit(argv["cache-limit"]);
            console.log(chalk.green(`Cache limit set to ${argv["cache-limit"]} files.`));
            await cache.save();
        }
        if (argv.list) {
            // Get recent files
            const recentLogs = cache.getRecentLogs();
            const recentStats = cache.getRecentStats();
            if (recentLogs.length > 0) {
                console.log(chalk.blue("\nRecent log files:"));
                recentLogs.forEach((file, i) => {
                    console.log(chalk.dim(`  ${i + 1}. ${file}`));
                });
            }
            if (recentStats.length > 0) {
                console.log(chalk.blue("\nRecent stats files:"));
                recentStats.forEach((file, i) => {
                    console.log(chalk.dim(`  ${i + 1}. ${file}`));
                });
            }
            if (!recentLogs.length && !recentStats.length) {
                console.log(chalk.yellow("\nNo recent files found."));
            }
            process.exit(0);
        }
        await openLogViewer({
            logFile: typeof argv.log === 'string' ? argv.log : undefined,
            statsFile: typeof argv.stats === 'string' ? argv.stats : undefined,
            withLog: true,
            withStats: !!argv["with-stats"],
            openInChrome: argv["open-in-chrome"],
            autoOpenOutputs: argv["auto-open"]
        });
        process.exit(0);
    }
    catch (error) {
        console.error(chalk.red("Error opening log viewer:"), error instanceof Error ? error.message : error);
        process.exit(1);
    }
}
const cfg = {
    cwd: process.cwd(),
    targetDir: path.resolve(String(argv._[0] || argv.targetDir)),
    treeText: argv.tree,
    treeFile: argv["tree-file"],
    dryRun: !!argv["dry-run"],
    yes: !!argv.yes,
    packageManager: argv.pm || undefined,
    tabIndentationSize: Number(argv.tabIndentationSize),
    detectAsciiGuides: !!argv.detectAsciiGuides,
    runDetectors: !!argv.detectors,
    generateDotfiles: !!argv.dotfiles,
    quiet: !!argv.quiet,
    logging: {
        ...DEFAULT_LOG_CONFIG,
        enabled: argv.log,
        level: argv["log-level"],
        format: argv["log-format"],
        console: !argv.quiet,
        ...(argv["log-file"] ? { file: argv["log-file"] } : {})
    }
};
// Show log file location if logging is enabled
if (cfg.logging?.enabled) {
    const logPath = path.join(cfg.targetDir, cfg.logging.file || 'forge-tree.log');
    console.log(chalk.blue(`📝 Logging to: ${logPath}`));
}
const pm = detectPM(cfg.packageManager);
cfg.packageManager = pm;
const mergedInteractive = await askGlobalOptions({
    runDetectors: cfg.runDetectors,
    generateDotfiles: cfg.generateDotfiles
});
cfg.runDetectors = mergedInteractive.runDetectors;
cfg.generateDotfiles = mergedInteractive.generateDotfiles;
if (!cfg.quiet) {
    console.log(chalk.blue('\n🔍 Loading tree source...'));
    if (cfg.treeFile) {
        console.log(chalk.dim(`  📄 Reading from file: ${cfg.treeFile}`));
    }
    else {
        console.log(chalk.dim('  📝 Using provided tree string'));
    }
}
const treeSource = await loadTreeSource(cfg);
if (!treeSource) {
    // eslint-disable-next-line no-console
    console.error(chalk.red("No ASCII tree provided. Use --tree '<ascii>' or --tree-file path/to/tree.txt (lines like 'apps/\\n  web/\\n    package.json')."));
    process.exit(1);
}
// Show tree structure if enabled
if (!cfg.quiet && argv["show-tree"]) {
    console.log(chalk.blue('\n📝 Tree Structure:'));
    console.log(chalk.dim('─'.repeat(40)));
    console.log(treeSource.split('\n').map(line => '  ' + line).join('\n'));
    console.log(chalk.dim('─'.repeat(40)));
    // Parse tree early to show statistics
    const previewRoots = parseTree(treeSource, cfg);
    const stats = analyzeTreeStructure(previewRoots);
    // Always log stats to JSON file
    const statsLogger = new Logger(STATS_LOG_CONFIG, cfg.targetDir);
    statsLogger.info('Project Statistics', {
        metadata: {
            timestamp: new Date().toISOString(),
            targetDir: cfg.targetDir,
            treeFile: cfg.treeFile,
            stats: {
                structure: {
                    totalDirs: stats.totalDirs,
                    totalFiles: stats.totalFiles,
                    maxDepth: stats.stats.maxDepth,
                    emptyDirs: stats.stats.emptyDirs,
                    avgFilesPerDir: stats.stats.avgFilesPerDir,
                    largestDir: stats.stats.largestDir
                },
                rootLevel: {
                    directories: stats.rootDirs.map(d => ({ name: d.name, path: d.path })),
                    files: stats.rootFiles.map(f => ({ name: f.name, path: f.path }))
                },
                languages: stats.stats.byLanguage,
                fileTypes: stats.stats.commonPatterns,
                extensions: stats.stats.byExtension
            }
        }
    });
    console.log(chalk.dim('\n📊 Tree Statistics:'));
    console.log(chalk.dim(`  📝 Detailed stats saved to: ${path.join(cfg.targetDir, STATS_LOG_CONFIG.file || 'forge-tree.stats.json')}`));
    // Basic counts
    console.log(chalk.blue('\n  📁 Structure:'));
    console.log(chalk.dim(`    • Total Directories: ${stats.totalDirs}`));
    console.log(chalk.dim(`    • Total Files: ${stats.totalFiles}`));
    console.log(chalk.dim(`    • Maximum Depth: ${stats.stats.maxDepth} levels`));
    console.log(chalk.dim(`    • Empty Directories: ${stats.stats.emptyDirs}`));
    console.log(chalk.dim(`    • Average Files per Directory: ${stats.stats.avgFilesPerDir.toFixed(1)}`));
    console.log(chalk.dim(`    • Largest Directory: ${stats.stats.largestDir.path} (${stats.stats.largestDir.fileCount} files)`));
    // Root level structure
    console.log(chalk.blue('\n  📂 Root Level:'));
    if (stats.rootDirs.length > 0) {
        console.log(chalk.dim(`    • Directories (${stats.rootDirs.length}): ${stats.rootDirs.map(d => d.name).join(', ')}`));
    }
    if (stats.rootFiles.length > 0) {
        console.log(chalk.dim(`    • Files (${stats.rootFiles.length}): ${stats.rootFiles.map(f => f.name).join(', ')}`));
    }
    // Languages
    const languages = Object.entries(stats.stats.byLanguage)
        .sort(([, a], [, b]) => b.files - a.files);
    if (languages.length > 0) {
        console.log(chalk.blue('\n  👩‍💻 Languages:'));
        const maxBarWidth = 30;
        languages.forEach(([, lang]) => {
            const barWidth = Math.round((lang.percentage / 100) * maxBarWidth);
            const bar = '█'.repeat(barWidth) + '░'.repeat(maxBarWidth - barWidth);
            console.log(chalk.dim(`    • ${lang.name.padEnd(12)} ${bar} ${lang.files} files (${lang.percentage.toFixed(1)}%)`));
        });
    }
    // File categories
    console.log(chalk.blue('\n  📄 File Categories:'));
    const categories = [
        { name: 'Source', count: stats.stats.sourceFiles },
        { name: 'Config', count: stats.stats.configFiles },
        { name: 'Test', count: stats.stats.testFiles },
        { name: 'Documentation', count: stats.stats.documentationFiles },
        { name: 'Style', count: stats.stats.styleFiles },
        { name: 'Asset', count: stats.stats.assetFiles },
        { name: 'Package', count: stats.stats.packageFiles },
        { name: 'Lock', count: stats.stats.lockFiles },
        { name: 'CI', count: stats.stats.ciFiles },
        { name: 'Dot', count: stats.stats.dotFiles }
    ].filter(c => c.count > 0);
    const maxBarWidth = 30;
    categories.forEach(cat => {
        const percentage = (cat.count / stats.totalFiles) * 100;
        const barWidth = Math.round((percentage / 100) * maxBarWidth);
        const bar = '█'.repeat(barWidth) + '░'.repeat(maxBarWidth - barWidth);
        console.log(chalk.dim(`    • ${cat.name.padEnd(12)} ${bar} ${cat.count} files (${percentage.toFixed(1)}%)`));
    });
    ;
    // Extensions
    const sortedExts = Object.entries(stats.stats.byExtension)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);
    if (sortedExts.length > 0) {
        console.log(chalk.blue('\n  📊 Top Extensions:'));
        sortedExts.forEach(([ext, count]) => {
            const percentage = ((count / stats.totalFiles) * 100).toFixed(1);
            console.log(chalk.dim(`    • ${ext}: ${count} files (${percentage}%)`));
        });
    }
    console.log();
}
if (!cfg.quiet) {
    console.log(chalk.blue('\n🌳 Parsing tree structure...'));
    console.log(chalk.dim(`  📁 Target directory: ${cfg.targetDir}`));
    if (cfg.detectAsciiGuides) {
        console.log(chalk.dim('  🎨 Using ASCII guide detection'));
    }
}
const roots = parseTree(treeSource, cfg);
if (!cfg.quiet) {
    const totalNodes = countNodes(roots);
    console.log(chalk.dim(`  📊 Found ${totalNodes} nodes in tree`));
    console.log(chalk.blue('\n📋 Creating base file plan...'));
}
const plan = planFromTree(roots, cfg);
if (!cfg.quiet) {
    const { dirs, files } = countPlanItems(plan);
    console.log(chalk.dim(`  📊 Plan contains ${dirs} directories and ${files} files to create`));
}
if (cfg.runDetectors) {
    if (!cfg.quiet) {
        console.log(chalk.blue('\n🔎 Running smart detectors...'));
    }
    const matches = [];
    const detectorList = getDetectors(cfg);
    if (!cfg.quiet) {
        console.log(chalk.dim(`  🔍 Found ${detectorList.length} available detectors`));
    }
    const applicable = detectorList.filter((d) => roots.some((r) => walkMatch(r, d.match, cfg)));
    if (!cfg.quiet && applicable.length > 0) {
        console.log(chalk.dim(`  ✨ ${applicable.length} detectors match your project structure`));
    }
    const chosenIds = await chooseDetectors(applicable);
    if (!cfg.quiet && chosenIds.length > 0) {
        console.log(chalk.dim(`  👉 Running ${chosenIds.length} selected detectors`));
    }
    const detectorManager = new DetectorManager(cfg);
    // Set up event handlers
    if (!cfg.quiet) {
        detectorManager.on('init:start', ({ detectorId, node }) => {
            console.log(chalk.blue(`\n  ⚡ Running ${detectorId} detector...`));
            console.log(chalk.dim(`    🔍 Scanning ${node.path}...`));
        });
        detectorManager.on('init:validate', ({ detectorId, node, isValid }) => {
            if (!isValid) {
                console.log(chalk.yellow(`    ⚠ Validation failed for ${node.path}`));
            }
        });
        detectorManager.on('init:prompt', ({ detectorId, node, confirmed }) => {
            if (!confirmed) {
                console.log(chalk.yellow(`    ↪ Skipped by user choice`));
            }
        });
        detectorManager.on('init:generate', ({ detectorId, node, actions }) => {
            console.log(chalk.green(`    ✓ Generated ${actions.length} actions`));
        });
        detectorManager.on('init:complete', ({ detectorId, node, success }) => {
            if (success) {
                console.log(chalk.green(`    ✨ Successfully initialized ${node.path}`));
            }
        });
        detectorManager.on('init:error', ({ detectorId, node, error }) => {
            console.error(chalk.red(`    ❌ Error in ${detectorId} for ${node.path}:`));
            console.error(chalk.red(`       ${error.message}`));
        });
    }
    for (const d of detectorList) {
        if (!chosenIds.includes(d.id))
            continue;
        for (const r of roots)
            collectMatches(r, d, matches, cfg);
    }
    let generatedActions = 0;
    for (const m of matches) {
        const detector = detectorList.find((d) => d.id === m.detectorId);
        const success = await detectorManager.runDetector(detector, m.node);
        if (success) {
            const gen = await detector.generate(m.node, cfg);
            generatedActions += gen.actions.length;
            plan.push(...gen.actions);
        }
    }
    // Clean up event handlers
    detectorManager.clearEventHandlers();
    if (!cfg.quiet && generatedActions > 0) {
        console.log(chalk.dim(`\n  📊 Total actions generated by detectors: ${generatedActions}`));
    }
}
if (!cfg.quiet)
    console.log(chalk.blue(`📦 Ready to execute ${plan.length} actions...`));
const ok = await confirmPlan(plan.length, cfg.yes);
if (!ok) {
    if (!cfg.quiet)
        console.log(chalk.yellow('⏹ Operation cancelled by user'));
    process.exit(0);
}
if (!cfg.quiet)
    console.log(chalk.blue('🚀 Executing actions...'));
const logger = new Logger(cfg.logging, cfg.targetDir);
await applyPlan(plan, cfg.dryRun, logger);
if (!cfg.quiet)
    console.log(chalk.green('✨ All actions completed successfully'));
// compute repoRoot the same way generators do
const repoRoot = roots.length === 1 && roots[0].kind === "dir" ? roots[0].path : cfg.targetDir;
// only act if not dry-run
if (!cfg.dryRun) {
    await setupGit({
        repoPath: repoRoot,
        branch: argv.branch,
        git: argv.git,
        github: argv.github,
        private: argv.private,
        push: !argv["no-push"],
        logger: logger
    });
    // Show the generated structure
    if (!cfg.quiet && argv["show-result"]) {
        displayGeneratedStructure(repoRoot, treeSource);
        // Log the final structure to stats file
        const statsLogger = new Logger(STATS_LOG_CONFIG, cfg.targetDir);
        statsLogger.info('Generated Structure', {
            metadata: {
                timestamp: new Date().toISOString(),
                targetDir: repoRoot,
                structure: scanDirectory(repoRoot)
            }
        });
        // Auto-open logs and stats if enabled
        if (argv["auto-open"] && !argv["no-viewer"]) {
            try {
                const logFile = path.join(cfg.targetDir, cfg.logging?.file || 'forge-tree.log');
                const statsFile = path.join(cfg.targetDir, STATS_LOG_CONFIG.file || 'forge-tree.stats.json');
                // Initialize cache
                const cache = new Cache();
                await cache.load();
                // Update cache with new files
                await cache.updateLogFile(logFile);
                await cache.updateStatsFile(statsFile);
                // Open viewer
                await openLogViewer({
                    logFile,
                    statsFile,
                    withLog: true,
                    withStats: true,
                    openInChrome: argv["open-in-chrome"],
                    autoOpenOutputs: true,
                    waitForBrowser: argv["wait-for-browser"],
                    browser: argv.browser,
                    browserArgs: argv["browser-args"],
                    newWindow: argv["new-window"],
                    incognito: argv.incognito
                });
                if (!cfg.quiet) {
                    console.log(chalk.blue('\n📊 Opening log viewer...'));
                }
            }
            catch (error) {
                // Don't fail the main operation if viewer fails
                console.warn(chalk.yellow('\n⚠ Failed to open log viewer:'), error instanceof Error ? error.message : error);
            }
        }
        else if (!cfg.quiet) {
            // Show paths to the files
            console.log(chalk.blue('\n📊 Output files:'));
            console.log(chalk.dim(`  📝 Log file: ${path.join(cfg.targetDir, cfg.logging?.file || 'forge-tree.log')}`));
            console.log(chalk.dim(`  📊 Stats file: ${path.join(cfg.targetDir, STATS_LOG_CONFIG.file || 'forge-tree.stats.json')}`));
            console.log(chalk.dim('\nTip: Use `forge-tree view --log --with-stats` to view these files in the browser.'));
        }
    }
}
// Handle log viewer commands
if (argv["read-log"] || argv["read-stats"]) {
    try {
        await openLogViewer({
            logFile: argv["read-log"] || (argv["with-log"] ? "forge-tree.log" : undefined),
            statsFile: argv["read-stats"] || (argv["with-stats"] ? "forge-tree.stats.json" : undefined),
            withLog: argv["with-log"],
            withStats: argv["with-stats"]
        });
        process.exit(0);
    }
    catch (error) {
        console.error(chalk.red("Error opening log viewer:"), error instanceof Error ? error.message : error);
        process.exit(1);
    }
}
function walkMatch(n, match, cfg) {
    if (match(n, cfg))
        return true;
    return n.children.some((c) => walkMatch(c, match, cfg));
}
function collectMatches(n, d, out, cfg) {
    if (d.match(n, cfg))
        out.push({ detectorId: d.id, node: n });
    for (const c of n.children)
        collectMatches(c, d, out, cfg);
}
function countNodes(nodes) {
    let count = nodes.length;
    for (const node of nodes) {
        count += countNodes(node.children);
    }
    return count;
}
function countPlanItems(plan) {
    const result = { dirs: 0, files: 0 };
    for (const action of plan) {
        if (action.type === 'mkdir')
            result.dirs++;
        if (action.type === 'write')
            result.files++;
    }
    return result;
}
function analyzeTreeStructure(nodes) {
    let totalDirs = 0;
    let totalFiles = 0;
    const rootDirs = [];
    const rootFiles = [];
    let maxDepth = 0;
    let emptyDirs = 0;
    let largestDir = { path: '', fileCount: 0 };
    const extensions = {};
    const dirFileCounts = {};
    // Language detection patterns
    const languages = {
        typescript: {
            name: 'TypeScript',
            pattern: /\.(ts|tsx)$/i,
            color: '#3178C6'
        },
        javascript: {
            name: 'JavaScript',
            pattern: /\.(js|jsx|mjs|cjs)$/i,
            color: '#F7DF1E'
        },
        python: {
            name: 'Python',
            pattern: /\.(py|pyi)$/i,
            color: '#3776AB'
        },
        rust: {
            name: 'Rust',
            pattern: /\.(rs|rlib)$/i,
            color: '#DEA584'
        },
        go: {
            name: 'Go',
            pattern: /\.go$/i,
            color: '#00ADD8'
        },
        html: {
            name: 'HTML',
            pattern: /\.(html|htm)$/i,
            color: '#E34F26'
        },
        css: {
            name: 'CSS',
            pattern: /\.(css|scss|sass|less)$/i,
            color: '#1572B6'
        },
        markdown: {
            name: 'Markdown',
            pattern: /\.(md|mdx)$/i,
            color: '#000000'
        }
    };
    // Common file patterns
    const patterns = {
        config: /\.(json|ya?ml|toml|ini|env.*|config\.[jt]s)$/i,
        source: /\.(js|jsx|ts|tsx|mjs|cjs|py|rs|go|java|cpp|c|h|hpp)$/i,
        test: /\.(test|spec)\.[jt]sx?$/i,
        dot: /^\./,
        documentation: /\.(md|mdx|txt|rst|adoc)$/i,
        style: /\.(css|scss|sass|less|styl)$/i,
        asset: /\.(svg|png|jpe?g|gif|ico|woff2?|ttf|eot)$/i,
        package: /^package\.json$/,
        lockfile: /^(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/,
        ci: /^\.github\/workflows\/.*\.(ya?ml|json)$/i
    };
    const stats = {
        configFiles: 0,
        sourceFiles: 0,
        testFiles: 0,
        dotFiles: 0,
        documentationFiles: 0,
        styleFiles: 0,
        assetFiles: 0,
        packageFiles: 0,
        lockFiles: 0,
        ciFiles: 0
    };
    const languageStats = {};
    function getExtension(name) {
        const ext = name.split('.').slice(1).join('.');
        return ext ? `.${ext}` : '(no extension)';
    }
    function traverse(node, depth = 0) {
        maxDepth = Math.max(maxDepth, depth);
        if (node.kind === 'dir') {
            totalDirs++;
            let dirFileCount = 0;
            // Count files in this directory (not nested)
            node.children.forEach(child => {
                if (child.kind === 'file')
                    dirFileCount++;
            });
            if (dirFileCount === 0)
                emptyDirs++;
            if (dirFileCount > largestDir.fileCount) {
                largestDir = { path: node.path, fileCount: dirFileCount };
            }
            dirFileCounts[node.path] = dirFileCount;
        }
        else {
            totalFiles++;
            const ext = getExtension(node.name);
            extensions[ext] = (extensions[ext] || 0) + 1;
            // Check patterns
            if (patterns.config.test(node.name))
                stats.configFiles++;
            if (patterns.source.test(node.name))
                stats.sourceFiles++;
            if (patterns.test.test(node.name))
                stats.testFiles++;
            if (patterns.dot.test(node.name))
                stats.dotFiles++;
            if (patterns.documentation.test(node.name))
                stats.documentationFiles++;
            if (patterns.style.test(node.name))
                stats.styleFiles++;
            if (patterns.asset.test(node.name))
                stats.assetFiles++;
            if (patterns.package.test(node.name))
                stats.packageFiles++;
            if (patterns.lockfile.test(node.name))
                stats.lockFiles++;
            if (patterns.ci.test(node.name))
                stats.ciFiles++;
            // Detect language
            for (const [lang, info] of Object.entries(languages)) {
                if (info.pattern.test(node.name)) {
                    languageStats[lang] = (languageStats[lang] || 0) + 1;
                    break; // Stop after first match
                }
            }
        }
        for (const child of node.children) {
            traverse(child, depth + 1);
        }
    }
    for (const node of nodes) {
        traverse(node);
        if (node.kind === 'dir') {
            rootDirs.push(node);
        }
        else {
            rootFiles.push(node);
        }
    }
    // Calculate language percentages
    const byLanguage = {};
    for (const [lang, count] of Object.entries(languageStats)) {
        const info = languages[lang];
        byLanguage[lang] = {
            name: info.name,
            files: count,
            percentage: (count / totalFiles) * 100,
            color: info.color
        };
    }
    const fileStats = {
        byExtension: extensions,
        byLanguage,
        commonPatterns: {
            configFiles: stats.configFiles,
            sourceFiles: stats.sourceFiles,
            testFiles: stats.testFiles,
            dotFiles: stats.dotFiles,
            documentationFiles: stats.documentationFiles,
            styleFiles: stats.styleFiles,
            assetFiles: stats.assetFiles,
            packageFiles: stats.packageFiles,
            lockFiles: stats.lockFiles,
            ciFiles: stats.ciFiles
        },
        maxDepth,
        avgFilesPerDir: totalDirs ? totalFiles / totalDirs : 0,
        emptyDirs,
        largestDir,
        configFiles: stats.configFiles,
        sourceFiles: stats.sourceFiles,
        testFiles: stats.testFiles,
        dotFiles: stats.dotFiles,
        documentationFiles: stats.documentationFiles,
        styleFiles: stats.styleFiles,
        assetFiles: stats.assetFiles,
        packageFiles: stats.packageFiles,
        lockFiles: stats.lockFiles,
        ciFiles: stats.ciFiles
    };
    return { totalDirs, totalFiles, rootDirs, rootFiles, stats: fileStats };
}
