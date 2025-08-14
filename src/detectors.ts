import type { Detector, ForgeConfig, GeneratorResult, TreeNode } from "./types.js";
import path from "path";
import { pmArgs } from "./utils.js";
import { askPerNode } from "./prompts.js";

const byName = (n: TreeNode, m: RegExp) => m.test(n.name) || m.test(path.basename(n.path));

export const NextAppDetector: Detector = {
  id: "create-next-app",
  match: (n) => n.kind === "dir" && /web|next/i.test(n.name),
  prompt: async (n) => askPerNode(n, "create-next-app"),
  generate: async (n, cfg) => {
    const pm = pmArgs(cfg.packageManager || "npm");
    const actions: GeneratorResult["actions"] = [];
    
    // Check for existing Next.js files
    const nextFiles = ['next.config.js', 'next.config.mjs', 'package.json'];
    const existingFiles = n.children
      .filter(child => nextFiles.includes(child.name))
      .map(child => child.name);

    if (existingFiles.length > 0 && cfg.skipExisting) {
      console.warn(`\n⚠️  Skipping Next.js setup in "${n.path}" - found existing files: ${existingFiles.join(', ')}`);
      return { actions: [], description: "Skipped Next.js setup (existing files found)" };
    }

    if (existingFiles.length > 0 && !cfg.overwriteMode) {
      throw new Error(
        `Cannot create Next.js app in "${n.path}" - directory contains existing files:\n` +
        existingFiles.map(f => `  - ${f}`).join('\n') + '\n\n' +
        'Options:\n' +
        '1. Remove existing files\n' +
        '2. Use --overwriteMode=force to overwrite\n' +
        '3. Use --skipExisting to skip directories with existing files'
      );
    }

    actions.push({
      type: "exec",
      cwd: path.dirname(n.path),
      cmd: "npx",
      args: [
        "create-next-app@latest",
        path.basename(n.path),
        "--ts",
        "--eslint",
        "--tailwind",
        "--app",
        cfg.packageManager === "pnpm" ? "--use-pnpm" : cfg.packageManager === "yarn" ? "--use-yarn" : "--use-npm"
      ],
      env: {
        ...process.env,
        FORCE_COLOR: "1", // Enable colored output
        CI: cfg.yes ? "true" : "false" // Handle non-interactive mode
      }
    });

    return { 
      actions,
      description: `Scaffold Next.js app in "${n.path}"${existingFiles.length ? ' (overwriting existing files)' : ''}`
    };
  }
};

// replace FirebaseDetector with this implementation
export const FirebaseDetector: Detector = {
  id: "firebase-init",
  match: (n) =>
    n.kind === "dir" &&
    (/^(web|firebase|dataconnect)$/i.test(n.name)),
  prompt: async (n) => askPerNode(n, "firebase-init"),
  generate: async (n, cfg) => {
    const actions: GeneratorResult["actions"] = [];
    
    // Check for existing Firebase files
    const firebaseFiles = ['firebase.json', '.firebaserc'];
    const existingFiles = n.children
      .filter(child => firebaseFiles.includes(child.name))
      .map(child => child.name);

    if (existingFiles.length > 0 && cfg.skipExisting) {
      console.warn(`\n⚠️  Skipping Firebase setup in "${n.path}" - found existing files: ${existingFiles.join(', ')}`);
      return { actions: [], description: "Skipped Firebase setup (existing files found)" };
    }

    if (existingFiles.length > 0 && !cfg.overwriteMode) {
      throw new Error(
        `Cannot initialize Firebase in "${n.path}" - directory contains existing files:\n` +
        existingFiles.map(f => `  - ${f}`).join('\n') + '\n\n' +
        'Options:\n' +
        '1. Remove existing files\n' +
        '2. Use --overwriteMode=force to overwrite\n' +
        '3. Use --skipExisting to skip directories with existing files'
      );
    }

    // Check if firebase-tools is installed
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
    } catch (e) {
      throw new Error(
        'Firebase CLI tools not found. Please install first:\n' +
        'npm install -g firebase-tools\n' +
        'Then login:\n' +
        'firebase login'
      );
    }

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

    return { 
      actions, 
      description: `Initialize Firebase in "${n.path}"${existingFiles.length ? ' (overwriting existing files)' : ''}`
    };
  }
};


export const PkgDetector: Detector = {
  id: "npm-init",
  match: (n) => n.kind === "dir" && /package\.json$/i.test(n.children.map((c) => c.name).join(",")) === false,
  prompt: async (n) => askPerNode(n, "npm-init"),
  generate: async (n, cfg) => {
    const pm = pmArgs(cfg.packageManager || "npm");
    const actions: GeneratorResult["actions"] = [];

    // Check for existing package.json
    const existingFiles = n.children
      .filter(child => child.name === 'package.json')
      .map(child => child.name);

    if (existingFiles.length > 0 && cfg.skipExisting) {
      console.warn(`\n⚠️  Skipping package.json initialization in "${n.path}" - file already exists`);
      return { actions: [], description: "Skipped package.json init (file exists)" };
    }

    if (existingFiles.length > 0 && !cfg.overwriteMode) {
      throw new Error(
        `Cannot initialize package.json in "${n.path}" - file already exists\n\n` +
        'Options:\n' +
        '1. Remove existing package.json\n' +
        '2. Use --overwriteMode=force to overwrite\n' +
        '3. Use --skipExisting to skip directories with existing package.json'
      );
    }

    // Check if package manager is installed
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
    } catch (e) {
      throw new Error(
        `Package manager "${pm.init[0]}" not found. Please install it first.`
      );
    }

    actions.push({ 
      type: "exec", 
      cwd: n.path, 
      cmd: pm.init[0], 
      args: [
        ...pm.init[1],
        // Add -y flag for non-interactive mode if yes is true
        ...(cfg.yes ? ["-y"] : [])
      ],
      env: {
        ...process.env,
        FORCE_COLOR: "1",
        CI: cfg.yes ? "true" : "false"
      }
    });

    return {
      actions,
      description: `Initialize package.json in "${n.path}"${existingFiles.length ? ' (overwriting existing file)' : ''}`
    };
  }
};

export const detectors: Detector[] = [NextAppDetector, FirebaseDetector, PkgDetector];
