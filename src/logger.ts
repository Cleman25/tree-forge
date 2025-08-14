import fs from 'fs';
import path from 'path';
import type { LogConfig, LogEntry, LogLevel, ForgeConfig } from './types.js';
import { DEFAULT_LOG_CONFIG } from './types.js';

export class Logger {
    private config: LogConfig;
    private logFile: string;
    private startTime: number;
    private entries: LogEntry[] = [];
    private timers: Map<string, number> = new Map();
    private metrics: {
        totalDuration: number;
        operationCounts: Record<string, number>;
        averageResponseTimes: Record<string, number>;
        maxResponseTimes: Record<string, number>;
        minResponseTimes: Record<string, number>;
        fsOperations: {
            directories: {
                created: number;
                skipped: number;
                failed: number;
            };
            files: {
                created: number;
                modified: number;
                skipped: number;
                failed: number;
            };
            initializers: {
                total: number;
                successful: number;
                failed: number;
                skipped: number;
            };
        };
    } = {
        totalDuration: 0,
        operationCounts: {},
        averageResponseTimes: {},
        maxResponseTimes: {},
        minResponseTimes: {},
        fsOperations: {
            directories: {
                created: 0,
                skipped: 0,
                failed: 0
            },
            files: {
                created: 0,
                modified: 0,
                skipped: 0,
                failed: 0
            },
            initializers: {
                total: 0,
                successful: 0,
                failed: 0,
                skipped: 0
            }
        }
    };

    constructor(config: Partial<LogConfig> | undefined, targetDir: string) {
        this.config = {
            ...DEFAULT_LOG_CONFIG,
            ...config
        };
        
        this.logFile = this.config.file 
            ? path.join(targetDir, this.config.file)
            : path.join(targetDir, 'forge-tree.log');
        
        this.startTime = Date.now();
        
        // Create log directory if it doesn't exist
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        // Initialize log file with header
        if (this.config.enabled && this.config.file) {
            const header = this.formatEntry({
                timestamp: new Date().toISOString(),
                level: 'info',
                action: 'Session Started',
                metadata: {
                    config: this.config as unknown as ForgeConfig,
                    targetDir
                }
            });
            fs.writeFileSync(this.logFile, header + '\n');
        }
    }

    private shouldLog(level: LogLevel): boolean {
        if (!this.config.enabled) return false;
        const levels: LogLevel[] = ['silent', 'error', 'warn', 'info', 'debug', 'verbose'];
        return levels.indexOf(level) <= levels.indexOf(this.config.level);
    }

    private formatEntry(entry: LogEntry): string {
        if (this.config.format === 'json') {
            // For JSON format, ensure metadata is properly structured
            const jsonEntry = { ...entry };
            if (jsonEntry.metadata) {
                if (jsonEntry.metadata.config) {
                    // Format config for better readability
                    const config = jsonEntry.metadata.config as ForgeConfig;
                    jsonEntry.metadata.config = {
                        targetDir: config.targetDir || '.',
                        tabIndentationSize: config.tabIndentationSize || 2,
                        detectAsciiGuides: config.detectAsciiGuides ?? true,
                        packageManager: config.packageManager || 'npm',
                        treeStyle: config.treeStyle || { indent: '  ', vertical: '│', horizontal: '─', corner: '└', branch: '├' },
                        enabled: config.enabled ?? true,
                        level: config.level || 'info',
                        format: config.format || 'text',
                        file: config.file || 'forge-tree.log',
                        console: config.console ?? true,
                        includeTimestamps: config.includeTimestamps ?? true,
                        includeDuration: config.includeDuration ?? true,
                        includeMetadata: config.includeMetadata ?? true,
                        runDetectors: config.runDetectors ?? true,
                        generateDotfiles: config.generateDotfiles ?? true,
                        dryRun: config.dryRun ?? false,
                        quiet: config.quiet ?? false,
                        showTree: config.showTree ?? true,
                        showResult: config.showResult ?? true,
                        allowNestedInit: config.allowNestedInit ?? false,
                        git: config.git ?? false,
                        github: config.github || false,
                        private: config.private ?? false,
                        noPush: config.noPush ?? false,
                        branch: config.branch || 'main',
                        yes: config.yes ?? false,
                        cwd: config.cwd || process.cwd()
                    };
                }
            }
            return JSON.stringify(jsonEntry).replace(/\n/g, ' ');
        }

        const parts: string[] = [];

        if (this.config.includeTimestamps) {
            parts.push(`[${entry.timestamp}]`);
        }

        parts.push(`[${entry.level.toUpperCase()}]`);
        parts.push(entry.action);

        if (entry.target) {
            parts.push(`(${entry.target})`);
        }

        if (entry.command) {
            parts.push(`$ ${entry.command}${entry.args ? ' ' + entry.args.join(' ') : ''}`);
        }

        if (entry.result) {
            parts.push(`→ ${entry.result}`);
        }

        if (entry.error) {
            parts.push(`ERROR: ${entry.error}`);
        }

        if (this.config.includeDuration && entry.duration) {
            parts.push(`(${entry.duration}ms)`);
        }

        if (this.config.includeMetadata && entry.metadata) {
            // Format metadata for better readability
            if (entry.metadata.config) {
                const config = entry.metadata.config as ForgeConfig;
                parts.push('Configuration:');
                parts.push('Core Settings:');
                parts.push(`Target Directory: ${config.targetDir || '.'}`);
                parts.push(`Tab Size: ${config.tabIndentationSize || 2}`);
                parts.push(`ASCII Guides: ${config.detectAsciiGuides ?? true}`);
                parts.push(`Package Manager: ${config.packageManager || 'npm'}`);
                parts.push(`Tree Style: ${config.treeStyle || 'default'}`);
                parts.push('Logging Settings:');
                parts.push(`Enabled: ${config.enabled ?? true}`);
                parts.push(`Level: ${config.level || 'info'}`);
                parts.push(`Format: ${config.format || 'text'}`);
                parts.push(`File: ${config.file || 'forge-tree.log'}`);
                parts.push(`Console: ${config.console ?? true}`);
                parts.push(`Include Timestamps: ${config.includeTimestamps ?? true}`);
                parts.push(`Include Duration: ${config.includeDuration ?? true}`);
                parts.push(`Include Metadata: ${config.includeMetadata ?? true}`);
                parts.push('Feature Settings:');
                parts.push(`Detectors: ${config.runDetectors ?? true}`);
                parts.push(`Dotfiles: ${config.generateDotfiles ?? true}`);
                parts.push(`Dry Run: ${config.dryRun ?? false}`);
                parts.push(`Quiet: ${config.quiet ?? false}`);
                parts.push(`Show Tree: ${config.showTree ?? true}`);
                parts.push(`Show Result: ${config.showResult ?? true}`);
                parts.push(`Nested Init: ${config.allowNestedInit ?? false}`);
                parts.push('Git Settings:');
                parts.push(`Git Init: ${config.git ?? false}`);
                parts.push(`GitHub: ${config.github || false}`);
                parts.push(`Private: ${config.private ?? false}`);
                parts.push(`No Push: ${config.noPush ?? false}`);
                parts.push(`Branch: ${config.branch || 'main'}`);
            } else {
                parts.push(JSON.stringify(entry.metadata));
            }
        }

        return parts.join(' ');
    }

    private writeEntry(entry: LogEntry) {
        // Add duration if not provided
        if (!entry.duration && this.config.includeDuration) {
            entry.duration = Date.now() - this.startTime;
        }

        // Add metadata if not provided
        if (!entry.metadata) {
            entry.metadata = {};
        }

        // Add operation stats if it's a file system operation
        if (entry.metadata.operation === 'mkdir' || entry.metadata.operation === 'write' || entry.metadata.operation === 'modify') {
            entry.metadata.stats = {
                directories: this.metrics.fsOperations.directories,
                files: this.metrics.fsOperations.files,
                initializers: this.metrics.fsOperations.initializers
            };
        }

        const formatted = this.formatEntry(entry);
        
        // Store in memory
        this.entries.push(entry);

        // Write to console if enabled
        if (this.config.console) {
            const consoleMethod = entry.level === 'error' ? 'error' 
                : entry.level === 'warn' ? 'warn' 
                : 'log';
            console[consoleMethod](formatted);
        }

        // Write to file if enabled
        if (this.config.enabled && this.config.file) {
            fs.appendFileSync(this.logFile, formatted + '\n');
        }
    }

    log(level: LogLevel, action: string, options: Partial<LogEntry> = {}) {
        if (!this.shouldLog(level)) return;

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            action,
            ...options
        };

        if (this.config.includeDuration) {
            entry.duration = Date.now() - this.startTime;
        }

        this.writeEntry(entry);
    }

    // Convenience methods
    error(action: string, options: Partial<LogEntry> = {}) {
        this.log('error', action, options);
    }

    warn(action: string, options: Partial<LogEntry> = {}) {
        this.log('warn', action, options);
    }

    info(action: string, options: Partial<LogEntry> = {}) {
        this.log('info', action, options);
    }

    debug(action: string, options: Partial<LogEntry> = {}) {
        this.log('debug', action, options);
    }

    verbose(action: string, options: Partial<LogEntry> = {}) {
        this.log('verbose', action, options);
    }

    // File system operation logging
    logDirectoryCreated(path: string, duration?: number) {
        this.metrics.fsOperations.directories.created++;
        this.info('Directory Created', {
            target: path,
            duration,
            metadata: {
                operation: 'mkdir',
                stats: {
                    directories: this.metrics.fsOperations.directories
                }
            }
        });
    }

    logDirectorySkipped(path: string, reason: string) {
        this.metrics.fsOperations.directories.skipped++;
        this.debug('Directory Skipped', {
            target: path,
            metadata: {
                reason,
                stats: {
                    directories: this.metrics.fsOperations.directories
                }
            }
        });
    }

    logDirectoryFailed(path: string, error: Error) {
        this.metrics.fsOperations.directories.failed++;
        this.error('Directory Creation Failed', {
            target: path,
            error: error.message,
            metadata: {
                stack: error.stack,
                stats: {
                    directories: this.metrics.fsOperations.directories
                }
            }
        });
    }

    logFileCreated(path: string, duration?: number) {
        this.metrics.fsOperations.files.created++;
        this.info('File Generated', {
            target: path,
            duration,
            metadata: {
                operation: 'write',
                stats: {
                    files: this.metrics.fsOperations.files
                }
            }
        });
    }

    logFileModified(path: string, duration?: number) {
        this.metrics.fsOperations.files.modified++;
        this.info('File Modified', {
            target: path,
            duration,
            metadata: {
                operation: 'modify',
                stats: {
                    files: this.metrics.fsOperations.files
                }
            }
        });
    }

    logFileSkipped(path: string, reason: string) {
        this.metrics.fsOperations.files.skipped++;
        this.debug('File Skipped', {
            target: path,
            metadata: {
                reason,
                stats: {
                    files: this.metrics.fsOperations.files
                }
            }
        });
    }

    logFileFailed(path: string, error: Error) {
        this.metrics.fsOperations.files.failed++;
        this.error('File Operation Failed', {
            target: path,
            error: error.message,
            metadata: {
                stack: error.stack,
                stats: {
                    files: this.metrics.fsOperations.files
                }
            }
        });
    }

    // Initializer logging
    logInitializerStarted(id: string, path: string) {
        this.metrics.fsOperations.initializers.total++;
        this.info('Initializer Started', {
            target: path,
            metadata: {
                initializerId: id,
                stats: {
                    initializers: this.metrics.fsOperations.initializers
                }
            }
        });
    }

    logInitializerCompleted(id: string, path: string, duration: number) {
        this.metrics.fsOperations.initializers.successful++;
        this.info('Initialized Successfully', {
            target: path,
            duration,
            metadata: {
                initializerId: id,
                stats: {
                    initializers: this.metrics.fsOperations.initializers
                }
            }
        });
    }

    logInitializerSkipped(id: string, path: string, reason: string) {
        this.metrics.fsOperations.initializers.skipped++;
        this.debug('Initializer Skipped', {
            target: path,
            metadata: {
                initializerId: id,
                reason,
                stats: {
                    initializers: this.metrics.fsOperations.initializers
                }
            }
        });
    }

    logInitializerFailed(id: string, path: string, error: Error) {
        this.metrics.fsOperations.initializers.failed++;
        this.error('Initialization Failed', {
            target: path,
            error: error.message,
            metadata: {
                initializerId: id,
                stack: error.stack,
                stats: {
                    initializers: this.metrics.fsOperations.initializers
                }
            }
        });
    }

    startTimer(operationId: string) {
        this.timers.set(operationId, Date.now());
        this.verbose(`Starting operation: ${operationId}`);
    }

    endTimer(operationId: string, metadata?: Record<string, unknown>) {
        const startTime = this.timers.get(operationId);
        if (!startTime) {
            this.warn(`No timer found for operation: ${operationId}`);
            return;
        }

        const duration = Date.now() - startTime;
        this.timers.delete(operationId);

        // Update metrics
        if (!this.metrics.operationCounts[operationId]) {
            this.metrics.operationCounts[operationId] = 0;
            this.metrics.averageResponseTimes[operationId] = 0;
            this.metrics.maxResponseTimes[operationId] = 0;
            this.metrics.minResponseTimes[operationId] = duration;
        }

        this.metrics.operationCounts[operationId]++;
        const count = this.metrics.operationCounts[operationId];
        this.metrics.averageResponseTimes[operationId] = 
            (this.metrics.averageResponseTimes[operationId] * (count - 1) + duration) / count;
        this.metrics.maxResponseTimes[operationId] = 
            Math.max(this.metrics.maxResponseTimes[operationId], duration);
        this.metrics.minResponseTimes[operationId] = 
            Math.min(this.metrics.minResponseTimes[operationId], duration);

        this.debug(`Operation completed: ${operationId}`, {
            duration,
            metadata: {
                ...metadata,
                averageTime: this.metrics.averageResponseTimes[operationId],
                maxTime: this.metrics.maxResponseTimes[operationId],
                minTime: this.metrics.minResponseTimes[operationId],
                count: this.metrics.operationCounts[operationId]
            }
        });

        return duration;
    }

    // Get all log entries (for testing or analysis)
    getEntries(): LogEntry[] {
        return [...this.entries];
    }

    // Get performance metrics
    getMetrics() {
        return {
            ...this.metrics,
            totalDuration: Date.now() - this.startTime,
            activeTimers: Array.from(this.timers.keys()),
            entriesCount: this.entries.length
        };
    }

    // Write a summary at the end
    writeSummary() {
        if (!this.config.enabled) return;

        const summary: Record<string, number> = {
            total: this.entries.length,
            error: 0,
            warn: 0,
            info: 0,
            debug: 0,
            verbose: 0
        };

        // Collect configuration changes
        const configChanges: Array<{
            timestamp: string;
            changes: Record<keyof ForgeConfig, { old: unknown; new: unknown }>;
        }> = [];

        this.entries.forEach(entry => {
            summary[entry.level]++;

            // Track configuration changes
            if (entry.metadata?.config) {
                const lastConfig = configChanges.length > 0 
                    ? configChanges[configChanges.length - 1].changes
                    : {} as Partial<ForgeConfig>;
                const newConfig = entry.metadata.config as ForgeConfig;

                const changes: Record<keyof ForgeConfig, { old: unknown; new: unknown }> = {} as Record<keyof ForgeConfig, { old: unknown; new: unknown }>;
                (Object.entries(newConfig) as [keyof ForgeConfig, unknown][]).forEach(([key, value]) => {
                    if (JSON.stringify(lastConfig[key]) !== JSON.stringify(value)) {
                        changes[key] = {
                            old: lastConfig[key],
                            new: value
                        };
                    }
                });

                if (Object.keys(changes).length > 0) {
                    configChanges.push({
                        timestamp: entry.timestamp,
                        changes
                    });
                }
            }
        });

        const duration = Date.now() - this.startTime;
        const metrics = this.getMetrics();

        // Calculate performance statistics
        const performanceStats = Object.entries(metrics.operationCounts).map(([op, count]) => ({
            operation: op,
            count,
            averageTime: Math.round(metrics.averageResponseTimes[op]),
            maxTime: metrics.maxResponseTimes[op],
            minTime: metrics.minResponseTimes[op]
        }));

        // Calculate file system operation statistics
        const fsStats = {
            directories: {
                ...metrics.fsOperations.directories,
                total: metrics.fsOperations.directories.created + 
                       metrics.fsOperations.directories.skipped + 
                       metrics.fsOperations.directories.failed,
                successRate: (metrics.fsOperations.directories.created / 
                    (metrics.fsOperations.directories.created + 
                     metrics.fsOperations.directories.failed) * 100).toFixed(2) + '%'
            },
            files: {
                ...metrics.fsOperations.files,
                total: metrics.fsOperations.files.created + 
                       metrics.fsOperations.files.modified + 
                       metrics.fsOperations.files.skipped + 
                       metrics.fsOperations.files.failed,
                successRate: ((metrics.fsOperations.files.created + metrics.fsOperations.files.modified) / 
                    (metrics.fsOperations.files.created + 
                     metrics.fsOperations.files.modified + 
                     metrics.fsOperations.files.failed) * 100).toFixed(2) + '%'
            },
            initializers: {
                ...metrics.fsOperations.initializers,
                successRate: (metrics.fsOperations.initializers.successful / 
                    metrics.fsOperations.initializers.total * 100).toFixed(2) + '%'
            }
        };

        // Write summary
        this.log('info', 'Session Summary', {
            metadata: {
                ...summary,
                duration: `${duration}ms`,
                averageEntryTime: `${Math.round(duration / this.entries.length)}ms`,
                performance: performanceStats,
                activeTimers: metrics.activeTimers,
                configHistory: configChanges,
                fileSystemOperations: fsStats
            }
        });

        // Write a more detailed performance report if in verbose mode
        if (this.config.level === 'verbose') {
            this.verbose('Detailed Performance Metrics', {
                metadata: {
                    metrics,
                    entriesByLevel: summary,
                    timeDistribution: performanceStats.reduce((acc, stat) => {
                        acc[stat.operation] = {
                            totalTime: stat.count * stat.averageTime,
                            percentage: ((stat.count * stat.averageTime) / duration * 100).toFixed(2) + '%'
                        };
                        return acc;
                    }, {} as Record<string, { totalTime: number; percentage: string }>)
                }
            });

            // Write configuration history
            if (configChanges.length > 0) {
                this.verbose('Configuration History', {
                    metadata: {
                        changes: configChanges.map(change => ({
                            timestamp: change.timestamp,
                            changes: Object.entries(change.changes).map(([key, { old, new: newValue }]) => ({
                                setting: key,
                                from: old,
                                to: newValue
                            }))
                        }))
                    }
                });
            }

            // Write detailed file system operations report
            this.verbose('File System Operations', {
                metadata: {
                    directories: {
                        ...fsStats.directories,
                        details: this.entries
                            .filter(e => e.metadata?.operation === 'mkdir')
                            .map(e => ({
                                path: e.target,
                                timestamp: e.timestamp,
                                duration: e.duration
                            }))
                    },
                    files: {
                        ...fsStats.files,
                        details: this.entries
                            .filter(e => e.metadata?.operation === 'write' || e.metadata?.operation === 'modify')
                            .map(e => ({
                                path: e.target,
                                operation: e.metadata?.operation,
                                timestamp: e.timestamp,
                                duration: e.duration
                            }))
                    },
                    initializers: {
                        ...fsStats.initializers,
                        details: this.entries
                            .filter(e => e.metadata?.initializerId)
                            .map(e => ({
                                id: e.metadata?.initializerId,
                                path: e.target,
                                status: e.error ? 'failed' : 'success',
                                timestamp: e.timestamp,
                                duration: e.duration,
                                error: e.error
                            }))
                    }
                }
            });
        }
    }
}
