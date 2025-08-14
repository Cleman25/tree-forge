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

    // Handle existing files with user confirmation or config
    if (existingFiles.length > 0 && !cfg.yes) {
      const userConfirmed = await askPerNode(n, "create-next-app");
      if (!userConfirmed) {
        console.log(`\nSkipping Next.js setup in "${n.path}"\n`);
        return { actions: [], description: "User skipped Next.js setup" };
      }
    }
    
    // If we get here, either user confirmed or --yes was set
    if (existingFiles.length > 0) {
      console.log(`\n⚠️  Proceeding to overwrite files in "${n.path}"\n`);
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

    // Handle existing files with user confirmation or config
    if (existingFiles.length > 0 && !cfg.yes) {
      const userConfirmed = await askPerNode(n, "firebase-init");
      if (!userConfirmed) {
        console.log(`\nSkipping Firebase setup in "${n.path}"\n`);
        return { actions: [], description: "User skipped Firebase setup" };
      }
    }
    
    // If we get here, either user confirmed or --yes was set
    if (existingFiles.length > 0) {
      console.log(`\n⚠️  Proceeding to overwrite files in "${n.path}"\n`);
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

    // Handle existing files with user confirmation or config
    if (existingFiles.length > 0 && !cfg.yes) {
      const userConfirmed = await askPerNode(n, "npm-init");
      if (!userConfirmed) {
        console.log(`\nSkipping package.json initialization in "${n.path}"\n`);
        return { actions: [], description: "User skipped package.json init" };
      }
    }
    
    // If we get here, either user confirmed or --yes was set
    if (existingFiles.length > 0) {
      console.log(`\n⚠️  Proceeding to overwrite files in "${n.path}"\n`);
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
