export const DEFAULT_LOG_CONFIG = {
    enabled: true,
    level: 'info',
    file: 'forge-tree.log',
    console: true,
    format: 'text',
    includeTimestamps: true,
    includeDuration: true,
    includeMetadata: true
};
export const STATS_LOG_CONFIG = {
    enabled: true,
    level: 'info',
    file: 'forge-tree.stats.json',
    console: false,
    format: 'json',
    includeTimestamps: true,
    includeDuration: true,
    includeMetadata: true
};
