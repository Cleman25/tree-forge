import path from "path";
import fs from "fs/promises";
import { pmArgs } from "./utils.js";
import { askPerNode } from "./prompts.js";
import { Logger } from "./logger.js";
const byName = (n, m) => m.test(n.name) || m.test(path.basename(n.path));
export const NextAppDetector = {
    id: "create-next-app",
    match: (n, cfg) => {
        // Only match directories with web/next in name
        if (!(n.kind === "dir" && /web|next/i.test(n.name)))
            return false;
        // Only match at root unless nested init is allowed
        return cfg.allowNestedInit || n.path === n.name;
    },
    prompt: async (n) => askPerNode(n, "create-next-app"),
    generate: async (n, cfg) => {
        const logger = new Logger(cfg.logging, cfg.targetDir);
        const startTime = Date.now();
        logger.verbose('Starting Next.js app generation', {
            target: n.path,
            metadata: { config: cfg }
        });
        const pm = pmArgs(cfg.packageManager || "npm");
        const actions = [];
        // Check for existing Next.js files
        const nextFiles = ['next.config.js', 'next.config.mjs', 'package.json'];
        const existingFiles = n.children
            .filter(child => nextFiles.includes(child.name))
            .map(child => child.name);
        if (existingFiles.length > 0) {
            logger.debug('Found existing Next.js files', {
                target: n.path,
                metadata: { files: existingFiles }
            });
        }
        if (existingFiles.length > 0 && cfg.skipExisting) {
            logger.info('Skipping Next.js setup - existing files found', {
                target: n.path,
                metadata: { files: existingFiles }
            });
            return { actions: [], description: "Skipped Next.js setup (existing files found)" };
        }
        // Handle existing files with user confirmation or config
        if (existingFiles.length > 0 && !cfg.yes) {
            const userConfirmed = await askPerNode(n, "create-next-app");
            if (!userConfirmed) {
                logger.info('User skipped Next.js setup', { target: n.path });
                return { actions: [], description: "User skipped Next.js setup" };
            }
        }
        // If we get here, either user confirmed or --yes was set
        if (existingFiles.length > 0) {
            logger.warn('Proceeding to overwrite existing files', {
                target: n.path,
                metadata: { files: existingFiles }
            });
        }
        const args = [
            "create-next-app@latest",
            path.basename(n.path),
            "--ts",
            "--eslint",
            "--tailwind",
            "--app",
            cfg.packageManager === "pnpm" ? "--use-pnpm" : cfg.packageManager === "yarn" ? "--use-yarn" : "--use-npm"
        ];
        logger.debug('Preparing Next.js command', {
            target: n.path,
            command: "npx",
            args,
            metadata: { cwd: path.dirname(n.path) }
        });
        actions.push({
            type: "exec",
            cwd: path.dirname(n.path),
            cmd: "npx",
            args,
            env: {
                ...process.env,
                FORCE_COLOR: "1",
                CI: cfg.yes ? "true" : "false"
            }
        });
        logger.info('Next.js scaffold action created', {
            target: n.path,
            duration: Date.now() - startTime,
            metadata: { actionCount: actions.length }
        });
        return {
            actions,
            description: `Scaffold Next.js app in "${n.path}"${existingFiles.length ? ' (overwriting existing files)' : ''}`
        };
    }
};
// replace FirebaseDetector with this implementation
export const FirebaseDetector = {
    id: "firebase-init",
    match: (n, cfg) => {
        // Only match web/firebase/dataconnect directories
        if (!(n.kind === "dir" && /^(web|firebase|dataconnect)$/i.test(n.name)))
            return false;
        // Only match at root unless nested init is allowed
        return cfg.allowNestedInit || n.path === n.name;
    },
    prompt: async (n) => askPerNode(n, "firebase-init"),
    generate: async (n, cfg) => {
        const logger = new Logger(cfg.logging, cfg.targetDir);
        logger.startTimer('firebase-init');
        logger.verbose('Starting Firebase initialization', {
            target: n.path,
            metadata: { config: cfg }
        });
        const actions = [];
        // Check for existing Firebase files
        logger.startTimer('firebase-check-files');
        const firebaseFiles = ['firebase.json', '.firebaserc'];
        const existingFiles = n.children
            .filter(child => firebaseFiles.includes(child.name))
            .map(child => child.name);
        if (existingFiles.length > 0) {
            logger.debug('Found existing Firebase files', {
                target: n.path,
                metadata: { files: existingFiles }
            });
        }
        logger.endTimer('firebase-check-files');
        if (existingFiles.length > 0 && cfg.skipExisting) {
            logger.info('Skipping Firebase setup - existing files found', {
                target: n.path,
                metadata: { files: existingFiles }
            });
            logger.endTimer('firebase-init');
            return { actions: [], description: "Skipped Firebase setup (existing files found)" };
        }
        // Handle existing files with user confirmation or config
        if (existingFiles.length > 0 && !cfg.yes) {
            logger.startTimer('firebase-user-confirmation');
            const userConfirmed = await askPerNode(n, "firebase-init");
            logger.endTimer('firebase-user-confirmation');
            if (!userConfirmed) {
                logger.info('User skipped Firebase setup', { target: n.path });
                logger.endTimer('firebase-init');
                return { actions: [], description: "User skipped Firebase setup" };
            }
        }
        // If we get here, either user confirmed or --yes was set
        if (existingFiles.length > 0) {
            logger.warn('Proceeding to overwrite existing files', {
                target: n.path,
                metadata: { files: existingFiles }
            });
        }
        // Check if firebase-tools is installed
        logger.startTimer('firebase-check-tools');
        try {
            actions.push({
                type: "exec",
                cwd: n.path,
                cmd: "firebase",
                args: ["--version"],
                env: {
                    ...process.env,
                    FORCE_COLOR: "1"
                }
            });
            logger.debug('Firebase CLI tools check passed');
        }
        catch (e) {
            const error = 'Firebase CLI tools not found. Please install first:\n' +
                'npm install -g firebase-tools\n' +
                'Then login:\n' +
                'firebase login';
            logger.error('Firebase CLI tools check failed', { error });
            logger.endTimer('firebase-check-tools');
            logger.endTimer('firebase-init');
            throw new Error(error);
        }
        logger.endTimer('firebase-check-tools');
        logger.debug('Preparing Firebase init command', {
            target: n.path,
            command: "firebase",
            args: ["init"],
            metadata: { cwd: n.path }
        });
        actions.push({
            type: "exec",
            cwd: n.path,
            cmd: "firebase",
            args: ["init"],
            env: {
                ...process.env,
                FORCE_COLOR: "1",
                CI: cfg.yes ? "true" : "false"
            }
        });
        const duration = logger.endTimer('firebase-init');
        logger.info('Firebase initialization action created', {
            target: n.path,
            duration,
            metadata: { actionCount: actions.length }
        });
        return {
            actions,
            description: `Initialize Firebase in "${n.path}"${existingFiles.length ? ' (overwriting existing files)' : ''}`
        };
    }
};
export const PkgDetector = {
    id: "npm-init",
    match: (n, cfg) => {
        // Only match directories without package.json
        if (!(n.kind === "dir" && /package\.json$/i.test(n.children.map((c) => c.name).join(",")) === false))
            return false;
        // Only match at root unless nested init is allowed
        return cfg.allowNestedInit || n.path === n.name;
    },
    prompt: async (n) => askPerNode(n, "npm-init"),
    generate: async (n, cfg) => {
        const logger = new Logger(cfg.logging, cfg.targetDir);
        logger.startTimer('npm-init');
        logger.verbose('Starting package.json initialization', {
            target: n.path,
            metadata: { config: cfg }
        });
        const pm = pmArgs(cfg.packageManager || "npm");
        logger.debug('Package manager configuration', {
            metadata: { packageManager: pm }
        });
        const actions = [];
        // Check for existing package.json
        logger.startTimer('npm-check-files');
        const existingFiles = n.children
            .filter(child => child.name === 'package.json')
            .map(child => child.name);
        if (existingFiles.length > 0) {
            logger.debug('Found existing package.json', {
                target: n.path,
                metadata: { files: existingFiles }
            });
        }
        logger.endTimer('npm-check-files');
        if (existingFiles.length > 0 && cfg.skipExisting) {
            logger.info('Skipping package.json initialization - file exists', {
                target: n.path
            });
            logger.endTimer('npm-init');
            return { actions: [], description: "Skipped package.json init (file exists)" };
        }
        // Handle existing files with user confirmation or config
        if (existingFiles.length > 0 && !cfg.yes) {
            logger.startTimer('npm-user-confirmation');
            const userConfirmed = await askPerNode(n, "npm-init");
            logger.endTimer('npm-user-confirmation');
            if (!userConfirmed) {
                logger.info('User skipped package.json initialization', { target: n.path });
                logger.endTimer('npm-init');
                return { actions: [], description: "User skipped package.json init" };
            }
        }
        // If we get here, either user confirmed or --yes was set
        if (existingFiles.length > 0) {
            logger.warn('Proceeding to overwrite package.json', {
                target: n.path
            });
        }
        // Check if package manager is installed
        logger.startTimer('npm-check-pm');
        try {
            actions.push({
                type: "exec",
                cwd: n.path,
                cmd: pm.init[0],
                args: ["--version"],
                env: {
                    ...process.env,
                    FORCE_COLOR: "1"
                }
            });
            logger.debug('Package manager check passed', {
                metadata: { command: pm.init[0] }
            });
        }
        catch (e) {
            const error = `Package manager "${pm.init[0]}" not found. Please install it first.`;
            logger.error('Package manager check failed', { error });
            logger.endTimer('npm-check-pm');
            logger.endTimer('npm-init');
            throw new Error(error);
        }
        logger.endTimer('npm-check-pm');
        const initArgs = [
            ...pm.init[1],
            ...(cfg.yes ? ["-y"] : [])
        ];
        logger.debug('Preparing npm init command', {
            target: n.path,
            command: pm.init[0],
            args: initArgs,
            metadata: { cwd: n.path }
        });
        actions.push({
            type: "exec",
            cwd: n.path,
            cmd: pm.init[0],
            args: initArgs,
            env: {
                ...process.env,
                FORCE_COLOR: "1",
                CI: cfg.yes ? "true" : "false"
            }
        });
        const duration = logger.endTimer('npm-init');
        logger.info('Package.json initialization action created', {
            target: n.path,
            duration,
            metadata: {
                actionCount: actions.length,
                packageManager: pm.init[0],
                nonInteractive: cfg.yes
            }
        });
        return {
            actions,
            description: `Initialize package.json in "${n.path}"${existingFiles.length ? ' (overwriting existing file)' : ''}`
        };
    }
};
export const CustomDetector = (init) => ({
    id: init.id,
    match: (n, cfg) => {
        // Check if this initializer is targeted for this directory
        const target = cfg.initTargets?.find(t => t.initId === init.id);
        if (target) {
            // If specifically targeted, only match those directories
            return target.targetDirs.some(pattern => new RegExp(pattern.replace('*', '.*')).test(n.path));
        }
        // Otherwise, check directory and file patterns
        if (init.matchDirs && !init.matchDirs.some((pattern) => new RegExp(pattern.replace('*', '.*')).test(n.name))) {
            return false;
        }
        if (init.matchFiles) {
            const hasMatchingFiles = n.children.some(child => init.matchFiles.includes(child.name));
            // If matching files exist, only match if we're allowed to overwrite
            if (hasMatchingFiles && !cfg.overwriteMode)
                return false;
        }
        // Default to root-only unless allowNestedInit
        return cfg.allowNestedInit || n.path === n.name;
    },
    prompt: async (n) => askPerNode(n, init.id),
    generate: async (n, cfg) => {
        const actions = [];
        actions.push({
            type: "exec",
            cwd: init.workingDir === "target" ? n.path : cfg.targetDir,
            cmd: init.command,
            args: init.args || [],
            env: {
                ...process.env,
                ...init.env,
                FORCE_COLOR: "1",
                CI: cfg.yes ? "true" : "false"
            }
        });
        return {
            actions,
            description: `Run ${init.name} in "${n.path}"`
        };
    }
});
// Combine built-in and custom detectors
// Generic detector factory for any directory type
const createGenericDetector = (id, patterns, structure) => ({
    id,
    match: (n, cfg) => {
        // Match if directory name matches any pattern
        if (!(n.kind === "dir" && patterns.some(p => new RegExp(p, "i").test(n.name)))) {
            return false;
        }
        return cfg.allowNestedInit || n.path === n.name;
    },
    prompt: async (n) => askPerNode(n, id),
    generate: async (n, cfg) => {
        const logger = new Logger(cfg.logging, cfg.targetDir);
        logger.startTimer(id);
        const actions = [];
        // Create directory structure
        if (structure.dirs) {
            structure.dirs.forEach(dir => {
                actions.push({
                    type: "mkdir",
                    path: path.join(n.path, dir)
                });
            });
        }
        // Create package.json if specified
        if (structure.packageJson) {
            const pkgName = structure.packageJson.namePrefix
                ? `${structure.packageJson.namePrefix}${path.basename(n.path)}`
                : path.basename(n.path);
            const pkgJson = {
                name: pkgName,
                version: "0.1.0",
                private: true,
                main: "dist/index.js",
                types: "dist/index.d.ts",
                scripts: {
                    "build": "tsc",
                    "dev": "tsc -w",
                    ...structure.packageJson.scripts
                },
                dependencies: structure.packageJson.dependencies || {},
                devDependencies: structure.packageJson.devDependencies || {},
                ...structure.packageJson.additionalFields
            };
            actions.push({
                type: "write",
                path: path.join(n.path, "package.json"),
                content: JSON.stringify(pkgJson, null, 2)
            });
            // Add tsconfig.json by default for TypeScript projects
            if (pkgJson.devDependencies?.typescript || pkgJson.dependencies?.typescript) {
                actions.push({
                    type: "write",
                    path: path.join(n.path, "tsconfig.json"),
                    content: JSON.stringify({
                        extends: cfg.templateDir ? `${cfg.templateDir}/tsconfig.base.json` : undefined,
                        compilerOptions: {
                            outDir: "dist",
                            rootDir: "src"
                        },
                        include: ["src"]
                    }, null, 2)
                });
            }
        }
        // Create files with content
        if (structure.files) {
            structure.files.forEach(file => {
                const filePath = path.join(n.path, file.path);
                const dir = path.dirname(filePath);
                // Ensure directory exists
                if (dir !== n.path) {
                    actions.push({ type: "mkdir", path: dir });
                }
                // Write file with content
                actions.push({
                    type: "write",
                    path: filePath,
                    content: file.content
                });
            });
        }
        // Check for custom templates
        if (cfg.templateDir) {
            const templatePath = path.join(cfg.templateDir, id);
            try {
                const templateFiles = await fs.readdir(templatePath);
                for (const file of templateFiles) {
                    const content = await fs.readFile(path.join(templatePath, file), 'utf8');
                    // Replace variables if any
                    let processedContent = content;
                    if (cfg.variables) {
                        Object.entries(cfg.variables).forEach(([key, value]) => {
                            processedContent = processedContent.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
                        });
                    }
                    actions.push({
                        type: "write",
                        path: path.join(n.path, file),
                        content: processedContent
                    });
                }
            }
            catch (e) {
                logger.debug(`No custom templates found for ${id}`, {
                    error: e instanceof Error ? e.message : String(e)
                });
            }
        }
        logger.endTimer(id);
        return {
            actions,
            description: `Initialize ${id} in "${n.path}"`
        };
    }
});
// Common built-in detectors using the generic factory
const ServiceDetector = createGenericDetector("service-init", ["service", "api", "server", "backend"], {
    dirs: ["src", "test", "config"],
    packageJson: {
        scripts: {
            "dev": "tsx watch src/index.ts",
            "build": "tsc",
            "start": "node dist/index.js",
            "test": "vitest"
        },
        devDependencies: {
            "typescript": "^5.0.0",
            "tsx": "^4.0.0",
            "vitest": "^1.0.0",
            "@types/node": "^20.0.0"
        }
    },
    files: [
        { path: "src/index.ts", content: "export * from './server';" },
        { path: "src/server.ts", content: "// Server implementation" },
        { path: "src/env.ts", content: "// Environment configuration" },
        { path: "test/server.test.ts", content: "import { describe, it, expect } from 'vitest';\n\ndescribe('server', () => {\n  it('works', () => {\n    expect(true).toBe(true);\n  });\n});" }
    ]
});
const LibraryDetector = createGenericDetector("library-init", ["lib", "package", "sdk", "utils", "core", "shared", "common"], {
    dirs: ["src", "test", "docs"],
    packageJson: {
        scripts: {
            "build": "tsc",
            "dev": "tsc -w",
            "test": "vitest",
            "docs": "typedoc"
        },
        devDependencies: {
            "typescript": "^5.0.0",
            "vitest": "^1.0.0",
            "typedoc": "^0.25.0"
        }
    },
    files: [
        { path: "src/index.ts", content: "// Library exports" },
        { path: "test/index.test.ts", content: "import { describe, it, expect } from 'vitest';\n\ndescribe('library', () => {\n  it('works', () => {\n    expect(true).toBe(true);\n  });\n});" },
        { path: "docs/README.md", content: "# API Documentation\n\nThis directory contains the API documentation." }
    ]
});
const ConfigDetector = createGenericDetector("config-init", ["config", "settings"], {
    dirs: ["typescript", "eslint", "prettier"],
    files: [
        { path: "typescript/base.json", content: JSON.stringify({
                compilerOptions: {
                    strict: true,
                    target: "ES2022",
                    module: "ESNext",
                    moduleResolution: "Bundler",
                    skipLibCheck: true
                }
            }, null, 2) },
        { path: "eslint/index.js", content: "module.exports = {\n  extends: ['eslint:recommended']\n};" },
        { path: "prettier/index.js", content: "module.exports = {\n  semi: true,\n  singleQuote: true\n};" }
    ]
});
const InfraDetector = createGenericDetector("infra-init", ["infra", "deploy", "ops"], {
    dirs: ["docker", "k8s", "terraform", "scripts"],
    files: [
        { path: "docker/Dockerfile", content: "FROM node:20-alpine\nWORKDIR /app\nCOPY . .\nRUN npm ci\nCMD [\"npm\", \"start\"]" },
        { path: "docker/docker-compose.yml", content: "version: '3'\nservices:\n  app:\n    build: .\n    ports:\n      - '3000:3000'" },
        { path: "k8s/deployment.yml", content: "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: app" },
        { path: "terraform/main.tf", content: "# Terraform configuration" },
        { path: "scripts/deploy.sh", content: "#!/bin/bash\n# Deployment script" }
    ]
});
const DatabaseDetector = createGenericDetector("db-init", ["db", "database", "sql", "mongo"], {
    dirs: ["migrations", "seeds", "models"],
    packageJson: {
        scripts: {
            "migrate": "prisma migrate deploy",
            "generate": "prisma generate",
            "seed": "tsx scripts/seed.ts"
        },
        devDependencies: {
            "prisma": "^5.0.0",
            "@prisma/client": "^5.0.0",
            "tsx": "^4.0.0"
        }
    },
    files: [
        { path: "prisma/schema.prisma", content: "// Prisma schema\n\ndatasource db {\n  provider = \"postgresql\"\n  url      = env(\"DATABASE_URL\")\n}\n\ngenerator client {\n  provider = \"prisma-client-js\"\n}" },
        { path: "migrations/README.md", content: "# Database Migrations" },
        { path: "seeds/README.md", content: "# Seed Data" },
        { path: "models/index.ts", content: "export * from '@prisma/client';" }
    ]
});
const UIDetector = createGenericDetector("ui-init", ["ui", "components", "design-system"], {
    dirs: ["src", "stories", "test"],
    packageJson: {
        scripts: {
            "build": "tsup",
            "dev": "tsup --watch",
            "storybook": "storybook dev",
            "test": "vitest"
        },
        devDependencies: {
            "typescript": "^5.0.0",
            "tsup": "^8.0.0",
            "@storybook/react": "^7.0.0",
            "vitest": "^1.0.0"
        },
        additionalFields: {
            peerDependencies: {
                "react": "^18.0.0",
                "react-dom": "^18.0.0"
            }
        }
    },
    files: [
        { path: "src/index.ts", content: "export * from './components';" },
        { path: "src/components/index.ts", content: "// Component exports" },
        { path: "stories/Introduction.stories.mdx", content: "# Component Library" },
        { path: "test/setup.ts", content: "// Test setup" }
    ]
});
const DocsDetector = createGenericDetector("docs-init", ["docs", "documentation", "wiki"], {
    dirs: ["guides", "api", "examples"],
    packageJson: {
        scripts: {
            "dev": "next dev",
            "build": "next build",
            "start": "next start"
        },
        dependencies: {
            "next": "^14.0.0",
            "nextra": "^2.0.0",
            "nextra-theme-docs": "^2.0.0"
        }
    },
    files: [
        { path: "pages/index.mdx", content: "# Documentation\n\nWelcome to the documentation." },
        { path: "guides/getting-started.mdx", content: "# Getting Started\n\nThis guide will help you get started." },
        { path: "api/README.md", content: "# API Reference" },
        { path: "examples/README.md", content: "# Code Examples" }
    ]
});
export const getDetectors = (cfg) => {
    const builtIn = [
        NextAppDetector,
        FirebaseDetector,
        PkgDetector,
        ServiceDetector,
        LibraryDetector,
        ConfigDetector,
        InfraDetector,
        DatabaseDetector,
        UIDetector,
        DocsDetector
    ];
    const custom = cfg.customInitializers?.map(CustomDetector) || [];
    return [...builtIn, ...custom];
};
