// src/prompts.ts
import prompts from "prompts";
import type { Detector, ForgeConfig, TreeNode } from "./types.js";

const AUTO =
  process.env.FORGE_TREE_NO_PROMPT === "1" ||
  process.env.CI === "true" ||
  !process.stdout.isTTY;

export async function askGlobalOptions(defaults: Partial<ForgeConfig>) {
  if (AUTO) {
    return {
      // disable external generators in non-interactive environments
      runDetectors: false,
      generateDotfiles: defaults.generateDotfiles ?? true
    } as Pick<ForgeConfig, "runDetectors" | "generateDotfiles">;
  }

  const res = await prompts([
    {
      type: "toggle",
      name: "runDetectors",
      message: "Enable smart detectors (Next.js/Firebase/etc.)?",
      initial: defaults.runDetectors ?? true,
      active: "yes",
      inactive: "no"
    },
    {
      type: "toggle",
      name: "generateDotfiles",
      message: "Generate .gitignore/.editorconfig/.prettierrc?",
      initial: defaults.generateDotfiles ?? true,
      active: "yes",
      inactive: "no"
    }
  ]);
  return res as Pick<ForgeConfig, "runDetectors" | "generateDotfiles">;
}

export async function chooseDetectors(applicable: Detector[]) {
  if (AUTO) return []; // no external tools in headless
  if (applicable.length === 0) return [];
  const res = await prompts({
    type: "multiselect",
    name: "picked",
    message: "Select generators to run",
    choices: applicable.map((d) => ({ title: d.id, value: d.id, selected: true }))
  });
  return (res.picked as string[]) || [];
}

export async function confirmPlan(steps: number, yes: boolean) {
  if (yes || AUTO) return true;
  const res = await prompts({
    type: "confirm",
    name: "ok",
    message: `Execute ${steps} actions?`,
    initial: true
  });
  return !!res.ok;
}

export async function askPerNode(_node: TreeNode, _id: string) {
  if (AUTO) return false; // headless: never run per-node external steps
  
  // For npm-init, only run at root level
  if (_id === "npm-init" && _node.path !== _node.name) {
    return false;
  }

  // Check if directory already has relevant files
  const hasExistingFiles = _node.children.some(child => {
    switch (_id) {
      case 'create-next-app':
        return ['next.config.js', 'next.config.mjs', 'package.json'].includes(child.name);
      case 'firebase-init':
        return ['firebase.json', '.firebaserc'].includes(child.name);
      case 'npm-init':
        return child.name === 'package.json';
      default:
        return false;
    }
  });

  // Show warning if files exist
  if (hasExistingFiles) {
    console.warn(`\n⚠️  Warning: Directory "${_node.path}" already contains ${_id} related files.`);
    console.warn('Running this generator may overwrite existing files.\n');
  }

  const res = await prompts({
    type: 'toggle',
    name: 'go',
    message: `Run ${_id} for "${_node.path}"?${hasExistingFiles ? ' (files may be overwritten)' : ''}`,
    initial: !hasExistingFiles, // Default to no if files exist
    active: 'yes',
    inactive: 'no'
  });

  return !!res.go;
}
